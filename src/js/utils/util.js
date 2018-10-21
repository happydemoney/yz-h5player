/**
 * 自定义一些功能函数
 */
// 引入常量模块
import { 
    videoType
} from '../const/constant.js';
/**
 * getVideoType - 获取视频类型
 * @param {String} videoUrl
 */
export function getVideoType(videoUrl) {
    // 视频类型判定正则
    const regVideoType = {
        rtmp: /^rtmp:/gi,
        flv: /\.flv\?|\.flv$/gi,
        hls: /\.m3u8\?|\.m3u8$/gi,
        html5: /\.mp4|\.ogg |\.webm/gi
    };
    if (regVideoType['rtmp'].test(videoUrl)) {
        return videoType['rtmp'];
    } else if (regVideoType['flv'].test(videoUrl)) {
        return videoType['flv'];
    } else if (regVideoType['hls'].test(videoUrl)) {
        return videoType['hls'];
    } else if (regVideoType['html5'].test(videoUrl)) {
        return videoType['html5'];
    }
}
/**
 * 时间秒数格式化
 * @param s 时间戳（单位：秒）
 * @returns {*} 格式化后的时分秒
 */
export function secondToTime(s) {
    let t = '';
    if (s > -1) {
        let hour = Math.floor(s / 3600);
        let min = Math.floor(s / 60) % 60;
        let sec = s % 60;

        if (hour > 0 && hour < 10) {
            t = '0' + hour + ":";
        } else if (hour >= 10) {
            t = hour + ":";
        }

        if (min < 10) { t += "0"; }
        t += min + ":";
        if (sec < 10) { t += "0"; }
        t += sec.toFixed(0);
    }
    return t;
}
/**
 * Shows a message in the console of the given type.
 * @param {*} type error / warn
 * @param {*} text 
 */
export function showError(type, text) {
    console && console[type] && console[type]('videoPlayer: ' + text);
}
/**
 * 输出调试信息
 * @param {Boolean} debugFlag
 * @param {*} logMsg 
 */
export function showLog(debugFlag, logMsg) {
    if (!debugFlag) {
        return;
    }
    console && console.log && console.log(logMsg);
}

/**
 * Find the right method, call on correct element
 * @param {*} element 
 */
export function launchFullScreen(element) {
    if (element.requestFullScreen) {
        element.requestFullScreen();
    } else if (element.mozRequestFullScreen) {
        element.mozRequestFullScreen();
    } else if (element.webkitRequestFullScreen) {
        element.webkitRequestFullScreen();
    } else if (element.msRequestFullscreen) {
        element.msRequestFullscreen();
    }
}
/**
 * 退出全屏
 */
export function exitFullscreen() {
    if (document.exitFullscreen) {
        document.exitFullscreen();
    } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
    } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
    }
}
/**
 * 返回全屏的元素对象，注意：要在用户授权全屏后才能获取全屏的元素，否则 fullscreenEle为null
 */
export function fullscreenElement() {
    let fullscreenEle = document.fullscreenElement ||
        document.mozFullScreenElement ||
        document.webkitFullscreenElement ||
        document.msFullscreenElement;
    return fullscreenEle;
}
/**
 * 是否是全屏状态
 */
export function fullscreenEnable() {
    let isFullscreen = document.fullscreenEnabled ||
        window.fullScreen ||
        document.webkitIsFullScreen ||
        document.msFullscreenEnabled;
    //注意：要在用户授权全屏后才能准确获取当前的状态
    return Boolean(isFullscreen);
}
 /**
  * js和css按需加载
  * url为相对路径，需要转为绝对路径
  */
export function loadJsCss(url, callback ){// 非阻塞的加载 后面的js会先执行
    var isJs = /\/.+\.js($|\?)/i.test(url) ? true : false;
    function onloaded(script, callback){//绑定加载完的回调函数
        if(script.readyState){ //ie
            script.attachEvent('onreadystatechange', function(){
                if(script.readyState == 'loaded' || script.readyState == 'complete'){
                    script.className = 'loaded';
                    callback && callback.constructor === Function && callback();
                }
            });
        }else{
            script.addEventListener('load',function(){
                script.className = "loaded";
                callback && callback.constructor === Function && callback();
            }, false); 
        }
    }
    function getJsRelativePath(url){
        var targetJsName = 'videoPlayer.js';
        var jsNameReg = new RegExp(targetJsName);
        var absolutePath = url;
        var scripts = document.getElementsByTagName('script');

        for(var i = 0; i < scripts.length; i++){
            var src = scripts[i].src;
            if(jsNameReg.test(src)){
                absolutePath = src.replace(targetJsName,'') + url;
            }
        }
        return absolutePath;
    }
    if(!isJs){ //加载css
        var links = document.getElementsByTagName('link');
        for(var i = 0; i < links.length; i++){//是否已加载
            if(links[i].href.indexOf(url)>-1){ 
                return; 
            }
        }
        var link = document.createElement('link');
        link.type = "text/css";
        link.rel = "stylesheet";
        link.href = url;
        var head = document.getElementsByTagName('head')[0]; 
        head.insertBefore(link,head.getElementsByTagName('link')[0] || null );
    }else{ //加载js
        var scripts = document.getElementsByTagName('script');
        for(var i = 0; i < scripts.length; i++){
            //是否已加载
            if(scripts[i].src.indexOf(url)>-1 && callback && (callback.constructor === Function) ){ 
            //已创建script
                if(scripts[i].className === 'loaded'){//已加载
                    callback();
                }else{//加载中
                    onloaded(scripts[i], callback);
                }
                return; 
            }
        }
        var script = document.createElement('script');
        script.type = "text/javascript";
        script.src = getJsRelativePath(url); 
        document.body.appendChild(script);
        onloaded(script, callback); 
    }
}