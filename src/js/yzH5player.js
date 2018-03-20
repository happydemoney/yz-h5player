/**
 *  @version: yz-h5player 1.0.1;
 *  @link: https://github.com/happydemoney/HTML5-VR-Player;
 *  @license MIT licensed;
 *  @author: happydemoney(674425534@qq.com);
 */
// three library
import $ from 'jquery';

// // es6 module
import swfobject from './module/swfobject.js';
import Vr from './module/vr/vr.js';    // 全景模式相关
import AdVideo from './module/ad/adVideo.js'; // 广告相关

// scss
import '../css/videoPlayer.scss';

// 引入常量模块
import { shareIcon, videoType, seekIncrement } from './const/constant.js';
import Config from './config.js';

// util function
import { secondToTime, launchFullScreen, exitFullscreen, getVideoType } from './utils/util.js';

// barrageClient
import { updateBarrageData } from './module/barrage/barrageClient.js';

// core -- create dom structure,bind dom event
import initPlayerStructure from './core/playerStructure.js';
import initHtml5CtrlEvents from './core/playerDomEvents.js';

// core player Class
import { FlvPlayer } from './core/flvPlayer.js';
import { HlsPlayer } from './core/hlsPlayer.js';
import { NativePlayer } from './core/nativePlayer.js';

'use strict';
var $window = $(window);
var $document = $(document);
var VERSION = '1.0.1';
var pluginName = 'videoPlayer';

// 是否是支持触摸的设备    
var isTouchDevice = navigator.userAgent.match(/(iPhone|iPod|iPad|Android|playbook|silk|BlackBerry|BB10|Windows Phone|Tizen|Bada|webOS|IEMobile|Opera Mini)/),
    // 是否支持触摸事件
    isTouch = (('ontouchstart' in window) || (navigator.msMaxTouchPoints > 0) || (navigator.maxTouchPoints)),
    isIE11Browser = /rv/gi.test(navigator.userAgent) && /trident/gi.test(navigator.userAgent),
    isEdgeBrowser = /edge/gi.test(navigator.userAgent) && /trident/gi.test(navigator.userAgent);

var videoPlayer = function (options, oParent) {
    // common jQuery objects
    var VP = $.fn[pluginName];

    options = $.extend(true, new Config().init(), options);

    options.playerContainer = oParent;
    options.oPlayer = {
        current: null,
        source: null,
        volume: null
    };// 存放原生player对象和当前处理的player对象以及音量控制对象
    options.reload_currentTime = 0; // 加载清晰度的时间节点
    options.beginningAdLoaded = false; // 片头广告是否已加载 - 默认是false

    // 自定义html5播放控制器相关 - 事件处理
    var h5player = {
        // 全屏状态
        fullscreenStatus: false,
        // h5player - volume - object
        playerVolumer: null,
        // 用户是否正在寻址，操作视频进度条
        seeking: false,
        // 播放器暂停 - 默认false
        paused: false,
        // 获取当前视频时长
        getDuration: function () {
            return options.oPlayer.source.duration;
        },
        // 获取当前视频时间
        getCurrenttime: function () {
            return options.oPlayer.source.currentTime;
        },
        // 播放器播放
        play: function () {
            var $videoParent = $(options.oPlayer.source).parent();
            if (options.oPlayer.source.paused) {
                options.oPlayer.source.play();
                h5player.paused = false;
                $videoParent.addClass('h5player-status-playing').removeClass('h5player-status-paused');

                updateBarrageData({ methodName: 'play', options, currentTime: h5player.getCurrenttime() });
                updatePauseAdStatus('play');
            }
        },
        // 播放器暂停
        pause: function () {
            var $videoParent = $(options.oPlayer.source).parent();
            if (!options.oPlayer.source.paused) {
                options.oPlayer.source.pause();
                h5player.paused = true;
                $videoParent.addClass('h5player-status-paused').removeClass('h5player-status-playing');

                updateBarrageData({ methodName: 'pause', options, currentTime: h5player.getCurrenttime() });
                updatePauseAdStatus('pause');
            }
        },
        // 播放器刷新
        refresh: function () {
            refreshPlayer();
        },
        // 播放器静音
        muted: function () {
            var $videoParent = $(options.oPlayer.source).parent();
            if (options.oPlayer.source.muted) {
                options.oPlayer.source.muted = false;
                $videoParent.removeClass('h5player-status-muted');
            } else {
                options.oPlayer.source.muted = true;
                $videoParent.addClass('h5player-status-muted');
            }
        },
        // 播放器 声音调节
        volumeChange: function (volumeValue) {
            options.oPlayer.source.volume = volumeValue;
            if (options.oPlayer.source.muted) {
                this.muted();
            }
        },
        // 视频寻址
        seek: function (seekVal) {
            options.oPlayer.source.currentTime = seekVal;
        },
        // 快进
        seekForward: function (forwardVal) {
            var seekVal = seekIncrement,
                curTime = options.oPlayer.source.currentTime;
            if (forwardVal) {
                seekVal = forwardVal;
            }
            options.oPlayer.source.currentTime = curTime + seekVal;
        },
        // 快退
        seekBackward: function (backwardVal) {
            var seekVal = seekIncrement,
                curTime = options.oPlayer.source.currentTime;
            if (backwardVal) {
                seekVal = backwardVal;
            }
            options.oPlayer.source.currentTime = curTime - seekVal;
        },
        playbackspeedChange: function (playbackspeed) {
            options.oPlayer.source.playbackRate = playbackspeed;
        },
        // 播放器全屏
        fullscreen: function () {
            var $videoParent = $(options.oPlayer.source).parents('.videoContainer');
            if (!$videoParent.hasClass('h5player-status-fullScreen')) {
                launchFullScreen($videoParent.get(0));
                $videoParent.addClass('h5player-status-fullScreen');
                this.fullscreenStatus = true;
            } else {
                exitFullscreen();
                $videoParent.removeClass('h5player-status-fullScreen');
                this.fullscreenStatus = false;
            }
        },
        // 当浏览器已加载音频/视频的元数据时
        onloadedmetadata: function () {
            if (options.reload_currentTime > 0) {
                options.oPlayer.source.currentTime = options.reload_currentTime;
                options.reload_currentTime = 0;
            }
        },
        // 当浏览器已加载音频/视频的当前帧时
        onloadeddata: function () {
            options.oPlayer.source.oncanplay = h5player.oncanplay;
            // 直播状态不进行之后事件绑定
            if (options.isLive) {
                return;
            }
            h5player.initTimeline();
            options.oPlayer.source.onprogress = h5player.onprogress;
            options.oPlayer.source.ontimeupdate = h5player.ontimeupdate;
            options.oPlayer.source.ondurationchange = h5player.ondurationchange;
            options.oPlayer.source.onended = h5player.onended;
        },
        oncanplay: function () {
            if (!options.adSetting.adActive && !options.beginningAdLoaded || options.adSetting.beginning.timeLength === 0) {
                options.beginningAdLoaded = true;
            }
            if (options.autoplay && !h5player.seeking && options.beginningAdLoaded && !h5player.paused) {
                options.oPlayer.source.play();
            }
        },
        // 视频数据加载进度更新 - buffered
        onprogress: function (e) {
            var currentTime = options.oPlayer.source.currentTime,
                buffered = options.oPlayer.source.buffered,
                nearLoadedTime = 0;
            for (var i = 0; i < buffered.length; i++) {
                if (buffered.end(i) >= currentTime && buffered.start(i) <= currentTime) {
                    nearLoadedTime = buffered.end(i);
                } else {
                    nearLoadedTime = currentTime + 1;
                }
            }
            var param = {
                loadedTime: nearLoadedTime
            };
            h5player.progressChange(param);
        },
        progressChange: function (oTime) {
            var $progressPlay = options.playerContainer.find('.h5player-progress-play'),
                $progressBtnScrubber = options.playerContainer.find('.h5player-progress-btn-scrubber'),
                $progressLoad = options.playerContainer.find('.h5player-progress-load'),
                duration = options.oPlayer.source.duration,
                currentTime = oTime.currentTime,
                currentTimePercent = oTime.currentTimePercent,
                loadedTime = oTime.loadedTime,
                isSeek = oTime.isSeek;

            if (currentTimePercent) {
                currentTime = Math.round(currentTimePercent * duration);
                if (isSeek) {
                    options.oPlayer.source.currentTime = currentTime;
                }
            }

            if (currentTime) {
                // 更新播放视频进度
                $progressPlay.css({
                    width: (currentTime / duration) * 100 + '%'
                });
                // 进度条小圆点
                $progressBtnScrubber.css({
                    left: (currentTime / duration) * 100 + '%'
                });
            }

            if (loadedTime) {
                // 更新加载视频进度
                $progressLoad.css({
                    width: (loadedTime / duration) * 100 + '%'
                });
            }
        },
        // 视频进度更新 - currentTime
        ontimeupdate: function (e) {
            var currentTime = options.oPlayer.source.currentTime,
                param = {
                    currentTime: currentTime
                };
            h5player.progressChange(param);
            h5player.currentTimeChanage();
        },
        initTimeline: function () {
            this.currentTimeChanage();
            this.durationTimeChanage();
        },
        // 视频当前播放位置时间变化事件
        currentTimeChanage: function () {
            var $currentTime = options.playerContainer.find('.h5player-ctrl-timeline-container .current-time'),
                currentTime = options.oPlayer.source.currentTime,
                currentTime = secondToTime(Math.round(currentTime));

            $currentTime.text(currentTime);
        },
        // 视频持续时间变化事件
        durationTimeChanage: function () {
            var $durationTime = options.playerContainer.find('.h5player-ctrl-timeline-container .duration-time'),
                durationTime = options.oPlayer.source.duration,
                durationTime = secondToTime(Math.round(durationTime));
            $durationTime.text(durationTime);
        },
        ondurationchange: function () {
            h5player.durationTimeChanage();
        },
        // 视频播放到结尾
        onended: function () {
            var $videoParent = $(options.oPlayer.source).parent();
            if (!options.oPlayer.source.paused) {
                options.oPlayer.source.pause();
            }
            $videoParent.addClass('h5player-status-paused').removeClass('h5player-status-playing');
            if (options.adSetting.adActive) {
                options.adVideo.init();
            }
        }
    };

    // 直播时初始化 videoUrl
    if (options.isLive) { initVideoUrl(); }

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
    // 初始化播放器
    initPlayer();

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

    //  初始化广告播放器
    if (options.adSetting.adActive) {
        options.adVideo = new AdVideo({
            h5player: h5player,
            beginningAdLoaded: options.beginningAdLoaded,
            playerContainer: options.playerContainer,
            adSetting: options.adSetting
        });
        options.adVideo.init();
    }

    // 刷新播放器
    function refreshPlayer() {
        if (!options.videoUrl) {
            if (options.isLive) {
                alert('直播流为空！');
            }
            else {
                alert('视频地址未传入！');
            }
            return;
        }
        // 根据播放器类型执行对应的播放方法
        switch (options.playerType) {
            case 'Html5':
                //Html5Player('refresh');
                options.oPlayer.current.refresh();
                break;
            case 'Flash':
                FlashPlayer('refresh');
                break;
            default: break;
        }
    }

    // HTML5播放器    
    function Html5Player() {

        let { playerSrc, playerVolume } = initPlayerStructure(options),
            playerCur = null,
            curVideoType = getVideoType(options.videoUrl);

        initHtml5CtrlEvents(options, h5player);

        switch (curVideoType) {
            case videoType['flv']:

                playerCur = new FlvPlayer(playerSrc, options.isLive);
                break;
            case videoType['hls']:

                playerCur = new HlsPlayer(playerSrc, options.isLive);
                break;
            default:
                if (options.isLive) {
                    alert('请传入正确的直播流地址！');
                    return;
                } else {

                    playerCur = new NativePlayer(playerSrc, options.isLive);
                }
                break;
        }
        playerCur.create(options.videoUrl);

        Html5VideoEventsBind(playerCur, playerSrc, playerVolume);

        // 是否开启VR功能
        if (options.vrSetting.vrSwitch) {
            vrLaunch(); // 启动vrvr
        }
    }

    function Html5VideoEventsBind(playerCur, playerSrc, playerVolume) {
        options.oPlayer.current = playerCur;
        options.oPlayer.source = playerSrc;
        options.oPlayer.volume = playerVolume;

        options.oPlayer.source.onloadeddata = h5player.onloadeddata;
        options.oPlayer.source.onloadedmetadata = h5player.onloadedmetadata;
    }

    function vrLaunch() {
        var vr = new Vr({
            debug: options.debug,
            container: options.playerContainer.find('.liveContent'),
            vrMode: options.vrSetting.vrMode,
            videoSource: options.oPlayer.source
        });

        vr.init();
    }

    // Flash播放器    
    function FlashPlayer(operation) {
        let { playerSrc, playerVolume } = initPlayerStructure(options),
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
        options.oPlayer.current = swfobject;
        // 自定义 destroy
        options.oPlayer.current.destroy = function () {
            swfobject.removeSWF(playerId);
        };
    }

    function updatePauseAdStatus(methodName) {
        var $pauseAdWrap = options.playerContainer.find('.h5player-pause-ad-wrap');
        switch (methodName) {
            // 暂停后再播放时打开弹幕
            case 'play':
                _play();
                break;
            // 暂停弹幕
            case 'pause':
                _pause();
                break;
            default:
                break;
        }
        function _play() {
            if ($pauseAdWrap.hasClass('active')) {
                $pauseAdWrap.removeClass('active');
            }
        }
        function _pause() {
            if (!$pauseAdWrap.hasClass('active')) {
                $pauseAdWrap.addClass('active');
            }
        }
    }

    // destroy
    function destroy() {

        options.oPlayer.current.destroy();
        // 事件销毁
        options.playerContainer.off('.vp_custom_event');
        options.playerContainer.find('.videoContainer').remove();
        // 清除弹幕定时器，如果存在
        /*
        if (options.barrageControl.intervalId) {
            clearInterval(options.barrageControl.intervalId);
            options.barrageControl.intervalId = undefined;
        }
        */
    }

    // 页面只引用一个播放器时的快速调用方法
    VP.pause = h5player.pause; // 暂停
    VP.play = h5player.play; // 播放
    VP.pause = h5player.pause; // 暂停
    VP.muted = h5player.muted; // 静音切换
    VP.seek = h5player.seek; // 视频寻址
    VP.seekForward = h5player.seekForward; // 前进
    VP.seekBackward = h5player.seekBackward; // 后退
    VP.playbackspeedChange = h5player.playbackspeedChange;

    // 返回函数
    return {
        version: VERSION,
        destroy: destroy,
        play: h5player.play, // 播放
        pause: h5player.pause, // 暂停
        muted: h5player.muted, // 静音切换
        seek: h5player.seek, // 视频寻址
        seekForward: h5player.seekForward, // 前进
        seekBackward: h5player.seekBackward, // 后退
        playbackspeedChange: h5player.playbackspeedChange
    };
};// end of videoPlayer

$.fn[pluginName] = function (options) {
    return new videoPlayer(options, this);
};