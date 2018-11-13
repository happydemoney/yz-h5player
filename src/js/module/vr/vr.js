/* 
 * Vr 视频全景模式交互相关
 * 依赖包: three.js
 **/
class Vr {
    constructor({ debug, container, vrMode, videoSource } = { debug: false, container: document.body, vrMode: 0, videoSource: '' }) {
        this.debug = debug;
        this.container = container;
        this.vrMode = vrMode; // vrMode(全景类型--0：全景,1：半景,2：小行星,3：鱼眼);
        this.videoSource = videoSource; // 源视频
    }

    log(logText) {
        if (!this.debug) {
            return;
        }
        if (console.log) {
            console.log(logText);
        } else {
            alert(logText + '<br/>');
        }
    }
    /**
     * 初始化
     * @param: stream_url(视频地址);
     * @param: vrMode(全景类型--0:普通, 1：全景,2：半景,3：小行星,4：鱼眼);
     */
    init() {
        let thisVr = this;
        
        if( thisVr.vrMode === 0 ){
            return;
        }

        if (thisVr.vrMode == 4) {
            thisVr.eventHandleVariable.viewpointLat = 0;
        }

        thisVr.initTimer = setInterval(function () {
            thisVr.main();
        }, 500);
    }

    /**
     * vr mode 切换
     * @param {*} mode 
     */
    vrSwitchMode( mode )  {
        let curMode = this.vrMode;

        // 由普通切换至全景
        if( curMode === 0 ){
            this.vrMode = mode;
            this.init();
        }else{
            this.vrMode = mode;
            this.main();
        }
    }

    /**
     * vr destroy
     */
    destroy(){
        console.log('destroy');
        console.log( window.cancelAnimationFrame );
        window.cancelAnimationFrame(this.animationFrame);

        this.container.find('.h5player-vrWrap').empty();
        this.container.find('video').show();
    }

    /**
     * 主函数
     */
    main() {
        var thisVr = this;
        thisVr.log('main function');

        if (thisVr.videoSource.readyState === thisVr.videoSource.HAVE_ENOUGH_DATA) {
            clearInterval(thisVr.initTimer);
            thisVr.log('源视频加载完成!');
        } else {
            return;
        }

        var videoWidth = thisVr.videoSource.videoWidth,
            videoHeight = thisVr.videoSource.videoHeight;

        thisVr.texture = new THREE.VideoTexture(thisVr.videoSource);
        thisVr.texture.minFilter = THREE.LinearFilter;
        thisVr.log("VR new VideoTexture");

        thisVr.camera = new THREE.PerspectiveCamera(thisVr.eventHandleVariable.fov, videoWidth / videoHeight, 1, 1000);
        thisVr.log("VR new _camera");

        // 各个vrMode处理
        switch (thisVr.vrMode) {
            case 1:
                thisVr.log("全景mode");
                thisVr.scene = new THREE.Scene();

                var _geometry = new THREE.SphereGeometry(20, 20, 20, Math.PI / 2); //radius, widthSegments, heightSegments, phiStart
                var _material = new THREE.MeshBasicMaterial({ map: thisVr.texture });
                _geometry.scale(-1, 1, 1);
                var _sphere = new THREE.Mesh(_geometry, _material);

                thisVr.scene.add(_sphere);
                break;
            case 2:
                // 180 degree half sphere
                thisVr.log("半景mode");
                thisVr.scene = new THREE.Scene();

                var _geometry = new THREE.SphereGeometry(20, 20, 20, Math.PI / 2); //radius, widthSegments, heightSegments, phiStart
                _geometry.scale(-1, 1, 1);

                thisVr.uniforms = {
                    videoTexture: { value: thisVr.texture },
                };
                var _material = new THREE.ShaderMaterial({
                    uniforms: thisVr.uniforms,
                    vertexShader: thisVr.VertexHalfSphere,
                    fragmentShader: thisVr.FragmentHalfSphere
                });

                var _sphere = new THREE.Mesh(
                    _geometry,
                    _material
                );

                thisVr.scene.add(_sphere);
                break;
            case 3:
                // Little planet mode
                thisVr.log("小行星mode");
                thisVr.scene = new THREE.Scene();

                var _geometry = new THREE.PlaneGeometry(videoWidth, videoHeight);

                thisVr.uniforms = {
                    videoTexture: { value: thisVr.texture },
                    scale: { value: 1.0 },
                    aspect: { value: videoWidth / videoHeight },
                    phi0: { value: 0.0 },
                    lambda0: { value: 0.0 },
                };

                var _material = new THREE.ShaderMaterial({
                    uniforms: thisVr.uniforms,
                    vertexShader: thisVr.VertexLittlePlanet,
                    fragmentShader: thisVr.FragmentLittlePlanet
                });

                var _sphere = new THREE.Mesh(
                    _geometry,
                    _material
                );
                thisVr.scene.add(_sphere);
                break;
            case 4:
                // Fisheye mode
                thisVr.log("鱼眼mode");
                thisVr.scene = new THREE.Scene();

                var _geometry = new THREE.PlaneGeometry(videoWidth, videoHeight);

                thisVr.uniforms = {
                    videoTexture: { value: thisVr.texture },
                    scale: { value: 1.2 },
                    aspect: { value: videoWidth / videoHeight },
                    phi0: { value: 0.0 },
                    lambda0: { value: 0.0 },
                };
                var _material = new THREE.ShaderMaterial({
                    uniforms: thisVr.uniforms,
                    vertexShader: thisVr.VertexLittlePlanet,
                    fragmentShader: thisVr.FragmentFisheye
                });

                var _sphere = new THREE.Mesh(
                    _geometry,
                    _material
                );

                thisVr.scene.add(_sphere);
                break;
            default:
                break;
        }

        // 渲染器是否执行过
        if (thisVr.renderFlag) {
            return;
        } else {
            thisVr.renderFlag = true;
        }

        thisVr.renderer = new THREE.WebGLRenderer();
        thisVr.renderer.setClearColor(0x101010);
        thisVr.renderer.setPixelRatio(window.devicePixelRatio);
        thisVr.renderer.setSize(videoWidth, videoHeight);

        // jq  - .append
        //console.log(thisVr.container);
        thisVr.container.find('video').hide();
        thisVr.container.find('.h5player-vrWrap').append(thisVr.renderer.domElement);

        thisVr.animate();

        // 先在chrome测试通过后，后期兼容别的浏览器事件
        thisVr.renderer.domElement.addEventListener('mousedown', _onDocumentMouseDown, false);
        thisVr.renderer.domElement.addEventListener('mousemove', _onDocumentMouseMove, false);
        thisVr.renderer.domElement.addEventListener('mouseup', _onDocumentMouseUp, false);
        thisVr.renderer.domElement.addEventListener('mousewheel', _onDocumentMouseWheel, false);
        thisVr.renderer.domElement.addEventListener('touchstart', _onDocumentTouchStart, false);
        thisVr.renderer.domElement.addEventListener('touchmove', _onDocumentTouchMove, false);

        //window.addEventListener('resize', onWindowResize, false);
        window.addEventListener('orientationchange', _onOrientationChange, false);

        thisVr.rotationQuat.deviceAlpha = null;
        thisVr.rotationQuat.deviceGamma = null;
        thisVr.rotationQuat.deviceBeta = null;

        function _onDocumentMouseDown(event) {
            event.preventDefault();
            thisVr.eventHandleVariable.isMouseDown = true;
            thisVr.eventHandleVariable.manualHRotateOnStart = thisVr.eventHandleVariable.manualHRotate;
            thisVr.eventHandleVariable.manualVRotateOnStart = thisVr.eventHandleVariable.manualVRotate;
            thisVr.eventHandleVariable.viewpointLonOnStart = thisVr.eventHandleVariable.viewpointLon;
            thisVr.eventHandleVariable.viewpointLatOnStart = thisVr.eventHandleVariable.viewpointLat;
            thisVr.eventHandleVariable.pointxOnStart = event.clientX;
            thisVr.eventHandleVariable.pointyOnStart = event.clientY;
        }

        function _onDocumentMouseMove(event) {
            //if (_ts == false) return;
            if (thisVr.eventHandleVariable.isMouseDown) {
                thisVr.eventHandleVariable.manualHRotate = (event.clientX - thisVr.eventHandleVariable.pointxOnStart) * 0.1 + thisVr.eventHandleVariable.manualHRotateOnStart;
                thisVr.eventHandleVariable.manualVRotate = (event.clientY - thisVr.eventHandleVariable.pointyOnStart) * 0.1 + thisVr.eventHandleVariable.manualVRotateOnStart;
                thisVr.eventHandleVariable.viewpointLon = (event.clientX - thisVr.eventHandleVariable.pointxOnStart) * 0.0025 + thisVr.eventHandleVariable.viewpointLonOnStart;
                thisVr.eventHandleVariable.viewpointLat = (event.clientY - thisVr.eventHandleVariable.pointyOnStart) * 0.0025 + thisVr.eventHandleVariable.viewpointLatOnStart;
            }
        }
        function _onDocumentMouseUp(event) {
            thisVr.eventHandleVariable.isMouseDown = false;
        }

        function _onDocumentTouchStart(event) {
            event.preventDefault();
            var touch = event.touches[0];
            thisVr.eventHandleVariable.touchXOnStart = touch.screenX;
            thisVr.eventHandleVariable.touchYOnStart = touch.screenY;
        }

        function _onDocumentTouchMove(event) {
            //if (_ts == false) return;
            event.preventDefault();
            var touch = event.touches[0];
            thisVr.eventHandleVariable.manualHRotate += (touch.screenX - thisVr.eventHandleVariable.touchXOnStart) * 0.2;
            thisVr.eventHandleVariable.manualVRotate += (touch.screenY - thisVr.eventHandleVariable.touchYOnStart) * 0.2;
            thisVr.eventHandleVariable.viewpointLon += (touch.screenX - thisVr.eventHandleVariable.touchXOnStart) * 0.005;
            thisVr.eventHandleVariable.viewpointLat += (touch.screenY - thisVr.eventHandleVariable.touchYOnStart) * 0.005;
            thisVr.eventHandleVariable.touchXOnStart = touch.screenX;
            thisVr.eventHandleVariable.touchYOnStart = touch.screenY;
        }

        function _onDocumentMouseWheel(e) {
            // cross-browser wheel delta
            var e = window.event || e;
            var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));
            //Math.max( sq.zoom, Math.min(sq.nw, sq.e.width + (sq.zoom * delta))) + "px"
            if (thisVr.vrMode <= 2 && thisVr.vrMode > 0) {
                thisVr.eventHandleVariable.fov = thisVr.eventHandleVariable.fov - (delta * 5);
                thisVr.eventHandleVariable.fov = Math.max(30, Math.min(120, thisVr.eventHandleVariable.fov));
                thisVr.camera.fov = thisVr.eventHandleVariable.fov;
                thisVr.camera.updateProjectionMatrix();
            } else {
                thisVr.uniforms.scale.value -= delta * 0.1;
            }
            return false;
        }

        function _onOrientationChange(event) {
            thisVr.rotationQuat.updateOrientation = true;
        }
    }
    /**
     * 周期渲染函数，该函数被用于逐帧计数器函数调用
     */
    animate() {
        console.log('animate');
        var thisVr = this;
        thisVr.animationFrame = window.requestAnimationFrame(thisVr.animate.bind(thisVr));
        thisVr.camera.lookAt(thisVr.scene.position);

        // 全景 or 半景
        if (thisVr.vrMode <= 2 && thisVr.vrMode > 0) {
            var quat = _getRotationQuat();
            thisVr.camera.setRotationFromQuaternion(quat);
            //  thisVr.texture.needsUpdate = true;
        } else {
            thisVr.uniforms.phi0.value = thisVr.eventHandleVariable.viewpointLat;
            thisVr.uniforms.lambda0.value = thisVr.eventHandleVariable.viewpointLon;
        }

        thisVr.renderer.render(thisVr.scene, thisVr.camera);

        function _getRotationQuat() {

            var degtorad = Math.PI / 180; // Degree-to-Radian conversion
            var y, x, z;
            if (thisVr.rotationQuat.deviceAlpha == null) {
                y = 0 * degtorad;
                x = 90 * degtorad;
                z = 0 * degtorad;
            } else if (thisVr.rotationQuat.updateOrientation) {

                y = thisVr.rotationQuat.deviceAlpha * degtorad;
                x = thisVr.rotationQuat.deviceBeta * degtorad;
                z = -thisVr.rotationQuat.deviceGamma * degtorad;

                thisVr.rotationQuat.lasty = y;
                thisVr.rotationQuat.lastx = x;
                thisVr.rotationQuat.lastz = z;
                thisVr.rotationQuat.updateOrientation = false;
            } else {
                y = thisVr.rotationQuat.lasty;
                x = thisVr.rotationQuat.lastx;
                z = thisVr.rotationQuat.lastz;
            }

            function _getScreenOrientation() {
                if (window.orientation !== undefined) {
                    return window.orientation;
                } else {
                    return 0;
                }
            }

            var screenOrientation = _getScreenOrientation() * degtorad;
            if (screenOrientation == 0) {
                y += thisVr.eventHandleVariable.manualHRotate * degtorad;
                x += thisVr.eventHandleVariable.manualVRotate * degtorad;
            }
            else if (screenOrientation > 0) {
                y += thisVr.eventHandleVariable.manualHRotate * degtorad;
                z += thisVr.eventHandleVariable.manualVRotate * degtorad;
            }
            else {
                y += thisVr.eventHandleVariable.manualHRotate * degtorad;
                z -= thisVr.eventHandleVariable.manualVRotate * degtorad;
            }

            var euler = new THREE.Euler(x, y, z, 'YXZ');
            var quat = new THREE.Quaternion();
            quat.setFromEuler(euler);

            var euler2 = new THREE.Euler(-Math.PI * 0.5, 0, 0);
            var quat2 = new THREE.Quaternion();
            quat2.setFromEuler(euler2);

            var euler3 = new THREE.Euler(0, 0, -screenOrientation);
            var quat3 = new THREE.Quaternion();
            quat3.setFromEuler(euler3);

            quat2.multiplyQuaternions(quat2, quat3);
            quat.multiplyQuaternions(quat, quat2);

            return quat;
        }
    }
}
// 定点半球
Vr.prototype.VertexHalfSphere =
    "varying vec3 vPos;" +
    "void main()" +
    "{" +
    "	vPos = position;" +
    " gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );" +
    "}";
// 半景模式
Vr.prototype.FragmentHalfSphere =
    "varying vec3 vPos;" +
    "uniform sampler2D videoTexture;" +
    "const float PI = 3.1415926535897932384626433832795;" +
    "void main(void) {" +
    "	vec3 normalizedPos = normalize(vPos);" +
    "	float phi = atan(length(normalizedPos.xy) / -normalizedPos.z);" +
    "	if (phi < 0.0)" +
    "		phi += PI;" +
    "	float theta = atan(normalizedPos.y, normalizedPos.x);" +
    "	float r = phi / (0.5*PI);" +
    "	if (r <= 1.0) {" +
    "		vec2 planeCoords;" +
    "		planeCoords.x = r * cos(theta);" +
    "		planeCoords.y = r * sin(theta);" +
    "		planeCoords.x = planeCoords.x * 0.5 + 0.5;" +
    "		planeCoords.y = planeCoords.y * 0.5 + 0.5;" +
    "		gl_FragColor = texture2D(videoTexture, planeCoords);" +
    "	} else {" +
    "		gl_FragColor = vec4(vec3(0.0), 1.0);" +
    "	}" +
    "}"
    ;
// 定点设置小行星模式
Vr.prototype.VertexLittlePlanet =
    "varying vec2 vUv;" +
    "void main()" +
    "{" +
    "	vUv = uv;" +
    "	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );" +
    "}"
    ;
// 小行星模式
Vr.prototype.FragmentLittlePlanet =
    "varying vec2 vUv;" +
    "uniform sampler2D videoTexture;" +
    "uniform float scale, aspect;" +
    "uniform float phi0, lambda0;" +
    "" +
    "const float PI = 3.1415926535897932384626433832795;" +
    "" +
    "vec2 directionToTexturePos(vec2 coords) {" +
    "	float p = length(coords);" +
    "	float c = 2.0 * atan( p );" +
    "" +
    "	float lat = asin(cos(c) * sin(phi0) + coords.y * sin(c) * cos(phi0) / p);" +
    "	float lon = lambda0 + atan( (coords.x * sin(c)), (p * cos(phi0) * cos(c) - coords.y * sin(phi0) * sin(c)) );" +
    "" +
    "	return vec2( mod(lon/(2.0*PI), 1.0), 0.5+lat/PI ); " +
    "}" +
    "" +
    "void main(void) {" +
    "	vec2 vertexCoords;" +
    "	vec2 scaledCoords;" +
    "	vec2 texCoords;" +
    "" +
    "	vertexCoords = vUv * 2.0 - 1.0;" +
    "	scaledCoords = vertexCoords * vec2(scale * aspect, -scale);" +
    "	texCoords = directionToTexturePos(scaledCoords);" +
    "" +
    "	gl_FragColor = texture2D(videoTexture, texCoords);" +
    "}"
    ;
// 鱼眼模式
Vr.prototype.FragmentFisheye =
    "varying vec2 vUv;" +
    "uniform sampler2D videoTexture;" +
    "uniform float scale, aspect;" +
    "uniform float phi0, lambda0;" +
    "" +
    "varying vec2 vertexCoords;" +
    "" +
    "const float PI = 3.1415926535897932384626433832795;" +
    "" +
    "vec2 directionToTexturePos(vec2 coords) {" +
    "    float r = length(coords);" +
    "    float theta = atan(coords.y, coords.x);" +
    "    float phi = r * scale * PI * 0.5;" +
    "    " +
    "    vec3 point;" +
    "    point.x = sin(phi) * cos(theta);" +
    "    point.y = sin(phi) * sin(theta);" +
    "    point.z = -cos(phi);" +
    "    " +
    "    mat3 rotate;" +
    "    float cosl = cos(lambda0);" +
    "    float sinl = sin(lambda0);" +
    "    float cosp = cos(phi0);" +
    "    float sinp = sin(phi0);" +
    "    rotate[0] = vec3(cosl, 0.0, -sinl);" +
    "    rotate[1] = vec3(sinl * sinp, cosp, cosl * sinp);" +
    "    rotate[2] = vec3(sinl * cosp, -sinp, cosl * cosp);" +
    "    " +
    "    vec3 point2 = rotate * point;" +
    "    " +
    "    vec2 longitudeLatitude = vec2( (atan(point2.x, -point2.z) / PI + 1.0) * 0.5," +
    "                              0.5 + asin(point2.y) / PI );" +
    "    return longitudeLatitude; " +
    "}" +
    "void main(void) {" +
    "    vec2 scaledCoords;" +
    "    vec2 texCoords;" +
    "    " +
    "    scaledCoords = vUv * 2.0 - 1.0;" +
    "    scaledCoords = scaledCoords * vec2(aspect, 1.0);" +
    "    if (length(scaledCoords) <= 1.0) {" +
    "        texCoords = directionToTexturePos(scaledCoords);" +
    "        gl_FragColor = texture2D(videoTexture, texCoords);" +
    "    } else {" +
    "        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);" +
    "    }" +
    "}";
// init 内定时器id
Vr.prototype.initTimer = undefined;
// THREE纹理
Vr.prototype.texture = null;
// THREE镜头
Vr.prototype.camera = null;
// THREE场景
Vr.prototype.scene = null;
// THREE - uniforms ~ 2：小行星,3：鱼眼 动画时需要引用
Vr.prototype.uniforms = null;
// THREE 渲染器标记 只渲染一次
Vr.prototype.renderFlag = false;
// THREE 渲染器
Vr.prototype.renderer = null;
// 事件处理相关变量
Vr.prototype.eventHandleVariable = {
    isMouseDown: false,
    manualHRotateOnStart: undefined,
    manualVRotateOnStart: undefined,
    manualHRotate: 0,
    manualVRotate: 0,
    viewpointLonOnStart: undefined,
    viewpointLatOnStart: undefined,
    viewpointLon: 0,
    viewpointLat: -Math.PI / 2,
    pointxOnStart: undefined,
    pointyOnStart: undefined,
    touchXOnStart: undefined,
    touchYOnStart: undefined,
    fov: 65
};
Vr.prototype.rotationQuat = {
    deviceAlpha: null,
    deviceBeta: null,
    deviceGamma: null,
    lastx: undefined,
    lasty: undefined,
    lastz: undefined,
    updateOrientation: false
};

/**
 * bind 函数在 ECMA-262 第五版才被加入；它可能无法在所有浏览器上运行。你可以部份地在脚本开头加入以下代码，就能使它运作，让不支持的浏览器也能使用 bind() 功能。
 */
if (!Function.prototype.bind) {
    Function.prototype.bind = function (oThis) {
        if (typeof this !== 'function') {
            // closest thing possible to the ECMAScript 5
            // internal IsCallable function
            throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');
        }

        var aArgs = Array.prototype.slice.call(arguments, 1),
            fToBind = this,
            fNOP = function () { },
            fBound = function () {
                return fToBind.apply(this instanceof fNOP
                    ? this
                    : oThis,
                    // 获取调用时(fBound)的传参.bind 返回的函数入参往往是这么传递的
                    aArgs.concat(Array.prototype.slice.call(arguments)));
            };

        // 维护原型关系
        if (this.prototype) {
            // Function.prototype doesn't have a prototype property
            fNOP.prototype = this.prototype;
        }
        fBound.prototype = new fNOP();

        return fBound;
    };
}

export default Vr;