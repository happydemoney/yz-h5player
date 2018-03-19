/**
 *  @version: yz-h5player 1.0.0;
 *  @link: https://github.com/happydemoney/HTML5-VR-Player;
 *  @license MIT licensed;
 *  @author: happydemoney(674425534@qq.com);
 */
// three library
import $ from 'jquery';

// // es6 module
import swfobject from './module/swfobject.js';
import Vr from './module/vr/vr.js';    // 全景模式相关

// scss
import '../css/videoPlayer.scss';

// 引入常量模块
import { shareIcon, videoType, regVideoType, seekIncrement } from './const/constant.js';
import Config from './config.js';

// util function
import { secondToTime, launchFullScreen, exitFullscreen } from './utils/util.js';

// core -- create dom structure,bind dom event
import initPlayerStructure from './core/playerStructure.js';
import initHtml5CtrlEvents from './core/playerDomEvents.js';

// core player Class
import { FlvPlayer, AdFlvPlayer } from './core/flvPlayer.js';
import { HlsPlayer, AdHlsPlayer } from './core/hlsPlayer.js';
import { NativePlayer, AdNativePlayer } from './core/nativePlayer.js';

'use strict';
var $window = $(window);
var $document = $(document);
var VERSION = '1.0.0';
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

    // 弹幕控制对象 - 包含弹幕开启状态、定时器ID、请求延时时间设定
    var beginningAdsLoaded = false; // 片头广告是否已加载 - 默认是false

    options = $.extend(true, new Config().init(), options);
    options.playerContainer = oParent;
    options.oPlayer = {
        current: null,
        source: null,
        volume: null
    };// 存放原生player对象和当前处理的player对象以及音量控制对象
    options.reload_currentTime = 0; // 加载清晰度的时间节点

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

                //updateBarrageData('play');
                updatePauseAdsStatus('play');
            }
        },
        // 播放器暂停
        pause: function () {
            var $videoParent = $(options.oPlayer.source).parent();
            if (!options.oPlayer.source.paused) {
                options.oPlayer.source.pause();
                h5player.paused = true;
                $videoParent.addClass('h5player-status-paused').removeClass('h5player-status-playing');

                //updateBarrageData('pause');
                updatePauseAdsStatus('pause');
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
            if (!options.adSetting.adActive && !beginningAdsLoaded || options.adSetting.beginning.timeLength === 0) {
                beginningAdsLoaded = true;
            }
            if (options.autoplay && !h5player.seeking && beginningAdsLoaded && !h5player.paused) {
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
                options.adPlayer.init();
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

    // 广告播放器相关
    if (options.adSetting.adActive) {
        options.adPlayer = {
            status: 'beginning', // beginning | ending
            count: undefined, // 标记要播放的广告视频数量
            index: 0, // 标记执行过播放的视频数量 index <= count
            totalSeconds: 0,  // 广告总秒数 - 单位秒
            cdIntervalId: undefined, // 倒计时定时器id
            player: {
                preload: null,  // 预加载video广告视频对象
                current: null   // 当前播放video广告视频对象
            }, // 播放器对象
            adsLink: '', // 广告链接
            init: function () { // 广告播放器初始化
                if (options.adPlayer.status === 'beginning') {
                    options.adPlayer.count = options.adSetting.beginning.source.length;
                    options.adPlayer.totalSeconds = options.adSetting.beginning.timeLength;

                    if (options.adPlayer.totalSeconds > 0) {
                        loadAdsPlayer('init');
                    } else {
                        options.adPlayer.status = 'ending';
                        return;
                    }

                } else if (options.adPlayer.status === 'ending') {
                    options.adPlayer.index = 0;
                    options.adPlayer.count = options.adSetting.ending.source.length;
                    options.adPlayer.totalSeconds = options.adSetting.ending.timeLength;

                    if (options.adPlayer.totalSeconds > 0) {
                        loadAdsPlayer('init');
                    } else {
                        return;
                    }
                }
                options.adPlayer.videoEventInit();
                // 更新广告剩余时间
                options.adPlayer.cdIntervalId = setInterval(function () {
                    options.adPlayer.totalSeconds--;
                    options.adPlayer.updateCountdownText();
                    if (options.adPlayer.totalSeconds === 0) {
                        clearInterval(options.adPlayer.cdIntervalId);
                    }
                }, 1000);
            },
            // 播放器事件初始化 - 因为可能有多个广告播放器
            videoEventInit: function () {
                options.adPlayer.player.current.onloadeddata = options.adPlayer.onloadeddata;
            },
            updateCountdownText: function () {
                var $adsCountDown = options.playerContainer.find('.ads-countDown');
                $adsCountDown.text(options.adPlayer.totalSeconds);
            },
            updatAdsLink: function () {
                var adsVideoLink = null;
                if (options.adPlayer.status === 'beginning') {
                    adsVideoLink = options.adSetting.beginning.link;
                } else if (options.adPlayer.status === 'ending') {
                    adsVideoLink = options.adSetting.ending.link;
                }
                options.adPlayer.adsLink = adsVideoLink[$(options.adPlayer.player.current).attr('data-index')];
            },
            // 播放器静音
            muted: function () {
                if (options.adPlayer.player.current.muted) {
                    options.adPlayer.player.current.muted = false;
                } else {
                    options.adPlayer.player.current.muted = true;
                }
            },
            // 播放器 声音调节
            volumeChange: function (volumeValue) {
                options.adPlayer.player.current.volume = volumeValue;
                if (options.adPlayer.player.current.muted) {
                    this.muted();
                }
            },
            onloadeddata: function () { // 当媒介数据已加载时运行的脚本。
                options.adPlayer.player.current.oncanplay = options.adPlayer.oncanplay;
                options.adPlayer.player.current.onended = options.adPlayer.onended;
            },
            oncanplay: function () {
                options.adPlayer.player.current.play();
            },
            preload2Current: function () { // 预加载广告转为播放广告
                var current = options.adPlayer.player.current,
                    isMuted = options.adPlayer.player.current.muted,
                    preVolume = options.adPlayer.player.current.volume;

                $(options.adPlayer.player.preload).attr('data-type', 'current');

                options.adPlayer.player.current = options.adPlayer.player.preload;
                // 播放器音量继承
                options.adPlayer.player.current.muted = isMuted;
                options.adPlayer.player.current.volume = preVolume;
                options.adPlayer.updatAdsLink();

                $(current).remove();
                options.adPlayer.loadedVideoPlay();
            },
            loadedVideoPlay: function () {
                setTimeout(function () {
                    options.adPlayer.player.current.play();
                    options.adPlayer.player.current.onended = options.adPlayer.onended;
                }, 0);
            },
            onended: function () { // 当媒介已到达结尾时运行的脚本（可发送类似“感谢观看”之类的消息）。
                // 广告未播完 - 误差初步控制在五秒之内
                if (options.adPlayer.totalSeconds > 5) {
                    options.adPlayer.preload2Current();
                    // 预加载广告视频
                    if (options.adPlayer.count - options.adPlayer.index > 0) {
                        loadAdsPlayer('update');
                    }
                }
                // 广告已播完
                else {
                    options.adPlayer.playCompleted();
                    if (!beginningAdsLoaded) {
                        beginningAdsLoaded = true;
                    }
                }
            },
            // 广告播放完执行的操作 
            playCompleted: function () {
                if (options.adPlayer.status === 'beginning') {
                    h5player.play();
                    options.adPlayer.status = 'ending';
                }
                options.playerContainer.find('.videoContainer').removeClass('h5player-status-options.adPlayer-playing');
                options.playerContainer.find('.html5-ads-player').remove();
                setTimeout(function () {
                    options.adPlayer.player.preload = null;
                    options.adPlayer.player.current = null;
                }, 0);
            }
        };
        options.adPlayer.init();
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

    // getVideoType - 获取视频类型
    function getVideoType(videoUrl) {
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

    // Flash播放器    
    function FlashPlayer(operation) {
        var oIds = initVideoStruct(),
            playerId = oIds.playerId;
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
        options.player = swfobject;
        // 自定义 destroy
        options.oPlayer.current.destroy = function () {
            swfobject.removeSWF(playerId);
        };
    }

    function updatePauseAdsStatus(methodName) {
        var $pauseAdsWrap = options.playerContainer.find('.h5player-pause-ads-wrap');
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
            if ($pauseAdsWrap.hasClass('active')) {
                $pauseAdsWrap.removeClass('active');
            }
        }
        function _pause() {
            if (!$pauseAdsWrap.hasClass('active')) {
                $pauseAdsWrap.addClass('active');
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

    // 加载广告播放器
    function loadAdsPlayer(operation) {
        var count = options.adPlayer.count - options.adPlayer.index,
            currentVideo, $currentVideo,
            preloadVideo, $preloadVideo,
            status = options.adPlayer.status,
            adsVideoSource = null,
            adsVideoLink = null,
            $adsLink = null;

        if (status === 'beginning') {
            adsVideoSource = options.adSetting.beginning.source;
            adsVideoLink = options.adSetting.beginning.link;
        } else if (status === 'ending') {
            adsVideoSource = options.adSetting.ending.source;
            adsVideoLink = options.adSetting.ending.link;
        }

        if (operation === 'init') {
            // 只有一个视频广告
            if (count === 1) {
                initAdsVideoStruct('single');
                $currentVideo = options.playerContainer.find('.html5-ads-player video[data-type="current"]');
                currentVideo = $currentVideo.get(0);

                adsHtml5Player(currentVideo, adsVideoSource[$currentVideo.attr('data-index')]);
                options.adPlayer.adsLink = adsVideoLink[$currentVideo.attr('data-index')];
                options.adPlayer.player.current = currentVideo;
            }
            // 大于一个视频广告 
            else if (count > 1) {
                initAdsVideoStruct('normal');
                $currentVideo = options.playerContainer.find('.html5-ads-player video[data-type="current"]');
                currentVideo = $currentVideo.get(0);

                $preloadVideo = options.playerContainer.find('.html5-ads-player video[data-type="preload"]');
                preloadVideo = $preloadVideo.get(0);

                adsHtml5Player(currentVideo, adsVideoSource[$currentVideo.attr('data-index')]);
                options.adPlayer.adsLink = adsVideoLink[$currentVideo.attr('data-index')];
                options.adPlayer.player.current = currentVideo;

                adsHtml5Player(preloadVideo, adsVideoSource[$preloadVideo.attr('data-index')]);
                options.adPlayer.player.preload = preloadVideo;
            }

            $adsLink = options.playerContainer.find('.html5-ads-player .html5-ads-link');

            $adsLink.on('click', function () {
                window.open(options.adPlayer.adsLink);
            });

        } else if (operation === 'update') {
            updateAdsVideoStruct();

            $preloadVideo = options.playerContainer.find('.html5-ads-player video[data-type="preload"]');
            preloadVideo = $preloadVideo.get(0);

            adsHtml5Player(preloadVideo, adsVideoSource[$preloadVideo.attr('data-index')]);
            options.adPlayer.player.preload = preloadVideo;
        }
    }

    // 初始化广告播放器结构 并返回生成的播放器对象
    function initAdsVideoStruct(createType) {

        var playerContainer = options.playerContainer;
        var adsVideoStr = '<div class="html5-ads-player">';

        switch (createType) {
            case 'single':
                adsVideoStr += '<video data-index="0" data-type="current"></video>';
                options.adPlayer.index += 1;
                break;
            case 'normal':
                adsVideoStr += '<video data-index="' + options.adPlayer.index + '" data-type="current"></video>';
                options.adPlayer.index += 1;
                adsVideoStr += '<video data-index="' + options.adPlayer.index + '" data-type="preload"></video>';
                options.adPlayer.index += 1;
                break;
            default: break;
        }

        adsVideoStr += '<div class="html5-ads-countDown"><span class="ads-countDown">' + options.adPlayer.totalSeconds + '</span>';
        adsVideoStr += '&nbsp;|&nbsp;秒之后关闭广告<span class="ads-close"></span></div>';
        adsVideoStr += '<a class="html5-ads-link" href="javascript:;"></a>';
        adsVideoStr += '</div>';

        playerContainer.find('.videoContainer').append(adsVideoStr).addClass('h5player-status-options.adPlayer-playing');
    }
    // 预加载下一个广告
    function updateAdsVideoStruct() {
        var playerContainer = options.playerContainer;
        var $html5AdsPlayer = playerContainer.find('.html5-ads-player');


        var newVideoStr = '<video data-index="' + options.adPlayer.index + '" data-type="preload"></video>';
        options.adPlayer.index += 1;

        $html5AdsPlayer.append(newVideoStr);
    }

    function adsHtml5Player(videoSource, videoUrl) {
        switch (getVideoType(videoUrl)) {
            case videoType['flv']:
                adsFlvPlayer(videoSource, videoUrl);
                break;
            case videoType['hls']:
                adsHlsPlayer(videoSource, videoUrl);
                break;
            default:
                adsHtml5PlayerSource(videoSource, videoUrl);
                break;
        }
    }
    // flv广告播放器
    // @param {*} videoSource - video原生对象
    // @param {*} videoUrl - video - url
    function adsFlvPlayer(videoSource, videoUrl) {
        var player = flvjs.createPlayer({
            type: 'flv',
            url: videoUrl,
            options: {
                //fixAudioTimestampGap: false,
                //autoCleanupSourceBuffer: true,  // 自动清理MSE内存
                enableWorker: true,
                enableStashBuffer: true,
                stashInitialSize: 128   // 减少首桢显示等待时长 默认384
            }
        });

        player.attachMediaElement(videoSource);
        player.load();
    }

    // 
    //   hls广告播放器
    //   @param {*} videoSource - video原生对象
    //   @param {*} videoUrl - video - url
    //  
    function adsHlsPlayer(videoSource, videoUrl) {

        var hls = new Hls();

        // bind them together
        hls.attachMedia(videoSource);
        hls.on(Hls.Events.MEDIA_ATTACHED, function () {
            ///console.log("video and hls.js are now bound together !");
            hls.loadSource(videoUrl);
            hls.on(Hls.Events.MANIFEST_PARSED, function (event, data) {
                //console.log("manifest loaded, found " + data.levels.length + " quality level");
            });
        });

        hls.on(Hls.Events.ERROR, function (event, data) {
            switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                    showError('error', 'fatal network error encountered, try to recover');
                    hls.startLoad();
                    break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                    showError('error', 'fatal media error encountered, try to recover');
                    hls.recoverMediaError();
                    break;
                default:
                    // cannot recover
                    hls.destroy();
                    break;
            }
        });
    }

    // 
    //  * html5原生视频广告播放器
    //  * @param {*} videoSource - video原生对象
    //  * @param {*} videoUrl - video - url
    //  
    function adsHtml5PlayerSource(videoSource, videoUrl) {
        videoSource.src = videoUrl;
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