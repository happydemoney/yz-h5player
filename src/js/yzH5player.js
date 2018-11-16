/**
 *  @version: yz-h5player 1.0.1;
 *  @link: https://github.com/happydemoney/yz-h5player
 *  @license MIT licensed;
 *  @author: happydemoney(674425534@qq.com);
 */
// three library
import $ from 'jquery';

// es6 module
import swfobject from './module/swfobject.js';
import Vr from './module/vr/vr.js';    // 全景模式相关
import AdPlayer from './module/ad/adPlayer.js'; // 广告相关

// scss
import '../css/videoPlayer.scss';

// 引入常量模块
import { 
    videoType
} from './const/constant.js';
import Config from './config.js';

// util function
import { 
    getVideoType,
    loadJsCss
} from './utils/util.js';

// core -- create dom structure,bind dom event
import initPlayerStructure from './core/playerStructure.js';
import { initHtml5CtrlEvents, playerPlay, playerMuted, playerPause } from './core/playerDomEvents.js';

// core player Class
import { FlvPlayer, HlsPlayer, NativePlayer } from './core/basePlayer.js';

'use strict';
// var $window = $(window);
// var $document = $(document);
var VERSION = '1.0.1';
var pluginName = 'videoPlayer';

// 是否是支持触摸的设备    
var isTouchDevice = navigator.userAgent.match(/(iPhone|iPod|iPad|Android|playbook|silk|BlackBerry|BB10|Windows Phone|Tizen|Bada|webOS|IEMobile|Opera Mini)/),
    // 是否支持触摸事件
    // isTouch = (('ontouchstart' in window) || (navigator.msMaxTouchPoints > 0) || (navigator.maxTouchPoints)),
    isIE11Browser = /rv/gi.test(navigator.userAgent) && /trident/gi.test(navigator.userAgent),
    isEdgeBrowser = /edge/gi.test(navigator.userAgent) && /trident/gi.test(navigator.userAgent);

var videoPlayer = function (options, oParent) {
    // common jQuery objects
    var VP = $.fn[pluginName];

    options = $.extend(true, Config.init(), options);

    options.playerContainer = oParent;
    options.playerCurrent = null; // 存放当前处理的player对象
    options.reload_currentTime = 0; // 加载清晰度的时间节点
    options.beginningAdLoaded = false; // 片头广告是否已加载 - 默认是false
    options.barrageIntervalId = 0; // 弹幕请求IntervalId

    // 直播时初始化 videoUrl
    if (options.isLive) { 
        loadJsCss( 'lib/flv.js' , () => {
            loadJsCss( 'lib/hls.js' , () => {
                initVideoUrl(); 
                // 初始化播放器
                initPlayer();

                //  初始化广告播放器
                if (options.adSetting.adActive) {
                    options.adPlayer = new AdPlayer({
                        playerCurrent: options.playerCurrent,
                        beginningAdLoaded: options.beginningAdLoaded,
                        playerContainer: options.playerContainer,
                        adSetting: options.adSetting
                    });
                    options.adPlayer.init();
                }
            } )   
        } );
    }else{

        // 初始化播放器
        initPlayer();

        //  初始化广告播放器
        if (options.adSetting.adActive) {
            options.adPlayer = new AdPlayer({
                playerCurrent: options.playerCurrent,
                beginningAdLoaded: options.beginningAdLoaded,
                playerContainer: options.playerContainer,
                adSetting: options.adSetting
            });
            options.adPlayer.init();
        }
    }

    //  * 直播播放时根据用户浏览器兼容情况选好直播流
    //  * 1. 优先选择 基于flv.js 的HTML5播放器播放,播 HTTP-FLV直播流
    //  * 2. 其次选择 基于hls.js 的HTML5播放器播放,播 HLS直播流
    //  * 3. 最后选择Flash播放器，播RTMP直播流(PC)
    function initVideoUrl() {
        // 默认 playerType === Html5, IE11 / Edge 暂不支持 flv.js直播播放，但支持flv.js点播播放
        if (flvjs.isSupported() && options.liveStreamUrl.HTTPFLV && !isIE11Browser && !isEdgeBrowser) {
            options.videoUrl = options.liveStreamUrl.HTTPFLV;
        } else if (Hls.isSupported() && options.liveStreamUrl.HLS) {
            options.videoUrl = options.liveStreamUrl.HLS;
        } else if (options.liveStreamUrl.RTMP && !isTouchDevice) {
            options.videoUrl = options.liveStreamUrl.RTMP;
        }
        // 指定 playerType === Flash
        if (options.playerType === 'Flash' && options.liveStreamUrl.RTMP) {
            options.videoUrl = options.liveStreamUrl.RTMP;
        }
    }

    // 根据播放器类型选择不同播放方式
    function initPlayer() {
        // options.videoUrl 为空
        if (!options.videoUrl) {

            if (options.definitionSetting.allRate.length > 0) {

                var definitionArr = options.definitionSetting;
                options.videoUrl = definitionArr.firstRate.url;
            } else {
                if (options.isLive) {
                    alert('直播流为空！');
                }
                else {
                    alert('视频地址未传入！');
                }
                return;
            }
        }
        // 根据播放器类型执行对应的播放方法
        switch (options.playerType) {
            case 'Html5':
                Html5Player();
                break;
            case 'Flash':
                FlashPlayer();
                break;
            default: break;
        }
    }

    // HTML5播放器    
    function Html5Player() {

        let { playerSrc } = initPlayerStructure(options),
            curVideoType = getVideoType(options.videoUrl);

        switch (curVideoType) {
            case videoType['flv']:
                
                options.playerCurrent = new FlvPlayer(playerSrc, options);
                options.playerCurrent.create();
                break;
            case videoType['hls']:

                options.playerCurrent = new HlsPlayer(playerSrc, options);
                options.playerCurrent.create();
                break;
            default:
                if (options.isLive) {
                    alert('请传入正确的直播流地址！');
                    return;
                } else {
                    options.playerCurrent = new NativePlayer(playerSrc, options);
                    options.playerCurrent.create();
                }
                break;
        }

        initHtml5CtrlEvents(options);
        VrInit();
    }

    function VrInit(){
        // 是否开启VR功能
        if (options.vrSetting.vrSwitch) {
            if( !window.THREE ){
                loadJsCss( 'lib/three.js' , () => {
                    vrLaunch();
                } );
            }else{
                vrLaunch(); // 启动vr
            }
        }
    }

    function vrLaunch() {
        options.vrSetting.vrClientObject = new Vr({
            debug: options.debug,
            container: options.playerContainer.find('.liveContent'),
            vrMode: options.vrSetting.vrMode,
            videoSource: options.playerCurrent.playerSrc
        });

        options.vrSetting.vrClientObject.init();
    }

    // Flash播放器    
    function FlashPlayer() {
        let { playerSrc } = initPlayerStructure(options),
            playerId = $(playerSrc).attr('id');

        var swfVersionStr = "10.0.0",
            xiSwfUrlStr = "swf/expressInstall.swf",
            playerSwfUrlStr = "swf/player.swf",
            soFlashVars = {
                src: options.videoUrl,
                streamType: options.isLive ? 'live' : 'recorded', // live - recorded - dvr 
                autoPlay: options.autoplay,
                muted: false,
                loop: !options.isLive,
                tintColor: '#000',   // #B91F1F
                controlBarAutoHide: "true"
            },
            params = {
                allowFullScreen: true,
                quality: 'high',
                allowscriptaccess: 'sameDomain',
            };

        swfobject.embedSWF(playerSwfUrlStr, playerId, "100%", "100%", swfVersionStr, xiSwfUrlStr, soFlashVars, params);
        options.playerCurrent = swfobject;
        // 自定义 destroy
        options.playerCurrent.destroy = function () {
            swfobject.removeSWF(playerId);
        };
    }

    /**
     * 返回接口类 - 供插件实例调用
     */
    class ReFunc {
        static play() {
            //options.playerCurrent.play();
            playerPlay(options);
        }
        static pause() {
            //options.playerCurrent.pause();
            playerPause(options);
        }
        static muted() {
            //options.playerCurrent.muted()
            playerMuted(options);
        }
        static seek(seekVal) {
            options.playerCurrent.seek(seekVal);
        }
        static seekForward(forwardVal) {
            options.playerCurrent.seekForward(forwardVal);
        }
        static seekBackward(backwardVal) {
            options.playerCurrent.seekBackward(backwardVal);
        }
        static playbackspeedChange(playbackspeed) {
            options.playerCurrent.playbackspeedChange(playbackspeed);;
        }
        static destroy() {
            options.playerCurrent.destroy();
            options.playerCurrent = null;

            // 广告播放器
            if (options.adPlayer) {
                options.adPlayer.destroy();
                options.adPlayer = null;
            }

            // 弹幕定时器
            if (options.barrageIntervalId) {
                clearInterval(options.barrageIntervalId);
            }

            // 事件销毁
            options.playerContainer.off('.vp_custom_event');
            options.playerContainer.find('.videoContainer').remove();
        }
    }

    ReFunc.prototype.version = VERSION;

    // 页面只引用一个播放器时的快速调用方法
    VP.version = VERSION; // 播放
    VP.play = ReFunc.play; // 播放
    VP.pause = ReFunc.pause; // 暂停
    VP.muted = ReFunc.muted; // 静音切换
    VP.seek = ReFunc.seek; // 视频寻址
    VP.seekForward = ReFunc.seekForward; // 前进
    VP.seekBackward = ReFunc.seekBackward; // 后退
    VP.playbackspeedChange = ReFunc.playbackspeedChange;
    VP.destroy = ReFunc.destroy;

    // 返回函数
    return ReFunc;
};// end of videoPlayer

$.fn[pluginName] = function (options) {
    return new videoPlayer(options, this);
};
