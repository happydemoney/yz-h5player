/**
 *  @version: yz-h5player 1.0.0;
 *  @link: https://github.com/happydemoney/HTML5-VR-Player;
 *  @license MIT licensed;
 *  @author: happydemoney(674425534@qq.com);
 */
// three library
import $ from 'jquery';
import flvjs from 'flvjs';
import Hls from 'hls';
import QRCode from 'qrcode';

// // es6 module
import swfobject from './module/swfobject.js';
import _ from './utils/common.js';    // 类似underscore功能函数
import Vr from './module/Vr.js';    // 全景模式相关
import Barrage from './module/Barrage.js';  // 弹幕交互相关

// scss
import '../css/videoPlayer.scss';

// 引入常量模块
import { defaultOptions, shareIcon, vrTextShow, videoType, regVideoType, barrageWordStyle } from './const/constant.js';

'use strict';
var $window = $(window);
var $document = $(document);
var VERSION = '1.0.0';
var pluginName = 'videoPlayer';

var idCount = { // 视频ID计数
    Html5: 0,
    Flash: 0
};

// 是否是支持触摸的设备    
var isTouchDevice = navigator.userAgent.match(/(iPhone|iPod|iPad|Android|playbook|silk|BlackBerry|BB10|Windows Phone|Tizen|Bada|webOS|IEMobile|Opera Mini)/),
    // 是否支持触摸事件
    isTouch = (('ontouchstart' in window) || (navigator.msMaxTouchPoints > 0) || (navigator.maxTouchPoints)),
    isWebkitBrowser = /webkit/gi.test(navigator.userAgent),
    isIE11Browser = /rv/gi.test(navigator.userAgent) && /trident/gi.test(navigator.userAgent),
    isEdgeBrowser = /edge/gi.test(navigator.userAgent) && /trident/gi.test(navigator.userAgent);

var videoPlayer = function (options, oParent) {
    // common jQuery objects
    var $htmlBody = $('html, body');
    var $body = $('body');

    var VP = $.fn[pluginName];

    // 弹幕控制对象 - 包含弹幕开启状态、定时器ID、请求延时时间设定
    var barrageControl = {
        isInited: false,      // 弹幕动画样式是否初始化
        isOpen: false,        // 弹幕面板 和 展示 是否开启
        isMonitored: false,   // 弹幕服务监控是否开启
        intervalTime: 5000,   // 请求延时时间设定 - 5秒
        intervalId: undefined,// 定时器ID
        timeoutTime: 3000,    // 弹幕开关切换延时/弹幕字体大小及颜色设置面板切换关闭延时 为0时实时切换 默认3000
        settingTimeoutId: undefined // 弹幕字体设置定时器ID
    },
        seekIncrement = 5, // 快进/退 默认值
        beginningAdsLoaded = false, // 片头广告是否已加载 - 默认是false
        reload_currentTime = 0, // 加载清晰度的时间节点
        Event_timeStamp; // 事件时间戳 - 主要解决chrome下mouseout mouseleave被click意外触发的问题

    // $.extend(a,b) - 浅拷贝
    // $.extend(true,a,b) - 深拷贝
    options = $.extend(true, defaultOptions, options);
    options.playerContainer = oParent;

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
        // 播放器播放
        play: function () {
            var $videoParent = $(options.player_source).parent();
            if (options.player_source.paused) {
                options.player_source.play();
                h5player.paused = false;
                $videoParent.addClass('h5player-status-playing').removeClass('h5player-status-paused');

                updateBarrageData('play');
                updatePauseAdsStatus('play');
            }
        },
        // 播放器暂停
        pause: function () {
            var $videoParent = $(options.player_source).parent();
            if (!options.player_source.paused) {
                options.player_source.pause();
                h5player.paused = true;
                $videoParent.addClass('h5player-status-paused').removeClass('h5player-status-playing');

                updateBarrageData('pause');
                updatePauseAdsStatus('pause');
            }
        },
        // 播放器刷新
        refresh: function () {
            refreshPlayer();
        },
        // 播放器静音
        muted: function () {
            var $videoParent = $(options.player_source).parent();
            if (options.player_source.muted) {
                options.player_source.muted = false;
                $videoParent.removeClass('h5player-status-muted');
            } else {
                options.player_source.muted = true;
                $videoParent.addClass('h5player-status-muted');
            }
        },
        // 播放器 声音调节
        volumeChange: function (volumeValue) {
            options.player_source.volume = volumeValue;
            if (options.player_source.muted) {
                this.muted();
            }
        },
        // 视频寻址
        seek: function (seekVal) {
            options.player_source.currentTime = seekVal;
        },
        // 快进
        seekForward: function (forwardVal) {
            var seekVal = seekIncrement,
                curTime = options.player_source.currentTime;
            if (forwardVal) {
                seekVal = forwardVal;
            }
            options.player_source.currentTime = curTime + seekVal;
        },
        // 快退
        seekBackward: function (backwardVal) {
            var seekVal = seekIncrement,
                curTime = options.player_source.currentTime;
            if (backwardVal) {
                seekVal = backwardVal;
            }
            options.player_source.currentTime = curTime - seekVal;
        },
        playbackspeedChange: function (playbackspeed) {
            options.player_source.playbackRate = playbackspeed;
        },
        // 播放器全屏
        fullscreen: function () {
            var $videoParent = $(options.player_source).parents('.videoContainer');
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
            if (reload_currentTime > 0) {
                options.player_source.currentTime = reload_currentTime;
                reload_currentTime = 0;
            }
        },
        // 当浏览器已加载音频/视频的当前帧时
        onloadeddata: function () {
            options.player_source.oncanplay = h5player.oncanplay;
            // 直播状态不进行之后事件绑定
            if (options.isLive) {
                return;
            }
            h5player.initTimeline();
            options.player_source.onprogress = h5player.onprogress;
            options.player_source.ontimeupdate = h5player.ontimeupdate;
            options.player_source.ondurationchange = h5player.ondurationchange;
            options.player_source.onended = h5player.onended;
        },
        oncanplay: function () {
            if (!options.adsSetting.adsActive && !beginningAdsLoaded || options.adsSetting.beginning.timeLength === 0) {
                beginningAdsLoaded = true;
            }
            if (options.autoplay && !h5player.seeking && beginningAdsLoaded && !h5player.paused) {
                options.player_source.play();
            }
        },
        // 视频数据加载进度更新 - buffered
        onprogress: function (e) {
            var currentTime = options.player_source.currentTime,
                buffered = options.player_source.buffered,
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
                duration = options.player_source.duration,
                currentTime = oTime.currentTime,
                currentTimePercent = oTime.currentTimePercent,
                loadedTime = oTime.loadedTime,
                isSeek = oTime.isSeek;

            if (currentTimePercent) {
                currentTime = Math.round(currentTimePercent * duration);
                if (isSeek) {
                    options.player_source.currentTime = currentTime;
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
            var currentTime = options.player_source.currentTime,
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
                currentTime = options.player_source.currentTime,
                currentTime = secondToTime(Math.round(currentTime));

            $currentTime.text(currentTime);
        },
        // 视频持续时间变化事件
        durationTimeChanage: function () {
            var $durationTime = options.playerContainer.find('.h5player-ctrl-timeline-container .duration-time'),
                durationTime = options.player_source.duration,
                durationTime = secondToTime(Math.round(durationTime));
            $durationTime.text(durationTime);
        },
        ondurationchange: function () {
            h5player.durationTimeChanage();
        },
        // 视频播放到结尾
        onended: function () {
            var $videoParent = $(options.player_source).parent();
            if (!options.player_source.paused) {
                options.player_source.pause();
            }
            $videoParent.addClass('h5player-status-paused').removeClass('h5player-status-playing');
            if (options.adsSetting.adsActive) {
                adsPlayer.init();
            }
        }
    };

    // 直播时初始化 videoUrl
    if (options.isLive) { initVideoUrl(); }

    // 初始化播放器
    initPlayer();

    // 广告播放器相关
    if (options.adsSetting.adsActive) {
        var adsPlayer = {
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
                if (adsPlayer.status === 'beginning') {
                    adsPlayer.count = options.adsSetting.beginning.source.length;
                    adsPlayer.totalSeconds = options.adsSetting.beginning.timeLength;

                    if (adsPlayer.totalSeconds > 0) {
                        loadAdsPlayer('init');
                    } else {
                        adsPlayer.status = 'ending';
                        return;
                    }

                } else if (adsPlayer.status === 'ending') {
                    adsPlayer.index = 0;
                    adsPlayer.count = options.adsSetting.ending.source.length;
                    adsPlayer.totalSeconds = options.adsSetting.ending.timeLength;

                    if (adsPlayer.totalSeconds > 0) {
                        loadAdsPlayer('init');
                    } else {
                        return;
                    }
                }
                adsPlayer.videoEventInit();
                // 更新广告剩余时间
                adsPlayer.cdIntervalId = setInterval(function () {
                    adsPlayer.totalSeconds--;
                    adsPlayer.updateCountdownText();
                    if (adsPlayer.totalSeconds === 0) {
                        clearInterval(adsPlayer.cdIntervalId);
                    }
                }, 1000);
            },
            // 播放器事件初始化 - 因为可能有多个广告播放器
            videoEventInit: function () {
                adsPlayer.player.current.onloadeddata = adsPlayer.onloadeddata;
            },
            updateCountdownText: function () {
                var $adsCountDown = options.playerContainer.find('.ads-countDown');
                $adsCountDown.text(adsPlayer.totalSeconds);
            },
            updatAdsLink: function () {
                var adsVideoLink = null;
                if (adsPlayer.status === 'beginning') {
                    adsVideoLink = options.adsSetting.beginning.link;
                } else if (adsPlayer.status === 'ending') {
                    adsVideoLink = options.adsSetting.ending.link;
                }
                adsPlayer.adsLink = adsVideoLink[$(adsPlayer.player.current).attr('data-index')];
            },
            // 播放器静音
            muted: function () {
                if (adsPlayer.player.current.muted) {
                    adsPlayer.player.current.muted = false;
                } else {
                    adsPlayer.player.current.muted = true;
                }
            },
            // 播放器 声音调节
            volumeChange: function (volumeValue) {
                adsPlayer.player.current.volume = volumeValue;
                if (adsPlayer.player.current.muted) {
                    this.muted();
                }
            },
            onloadeddata: function () { // 当媒介数据已加载时运行的脚本。
                adsPlayer.player.current.oncanplay = adsPlayer.oncanplay;
                adsPlayer.player.current.onended = adsPlayer.onended;
            },
            oncanplay: function () {
                adsPlayer.player.current.play();
            },
            preload2Current: function () { // 预加载广告转为播放广告
                var current = adsPlayer.player.current,
                    isMuted = adsPlayer.player.current.muted,
                    preVolume = adsPlayer.player.current.volume;

                $(adsPlayer.player.preload).attr('data-type', 'current');

                adsPlayer.player.current = adsPlayer.player.preload;
                // 播放器音量继承
                adsPlayer.player.current.muted = isMuted;
                adsPlayer.player.current.volume = preVolume;
                adsPlayer.updatAdsLink();

                $(current).remove();
                adsPlayer.loadedVideoPlay();
            },
            loadedVideoPlay: function () {
                setTimeout(function () {
                    adsPlayer.player.current.play();
                    adsPlayer.player.current.onended = adsPlayer.onended;
                }, 0);
            },
            onended: function () { // 当媒介已到达结尾时运行的脚本（可发送类似“感谢观看”之类的消息）。
                // 广告未播完 - 误差初步控制在五秒之内
                if (adsPlayer.totalSeconds > 5) {
                    adsPlayer.preload2Current();
                    // 预加载广告视频
                    if (adsPlayer.count - adsPlayer.index > 0) {
                        loadAdsPlayer('update');
                    }
                }
                // 广告已播完
                else {
                    adsPlayer.playCompleted();
                    if (!beginningAdsLoaded) {
                        beginningAdsLoaded = true;
                    }
                }
            },
            // 广告播放完执行的操作 
            playCompleted: function () {
                if (adsPlayer.status === 'beginning') {
                    h5player.play();
                    adsPlayer.status = 'ending';
                }
                options.playerContainer.find('.videoContainer').removeClass('h5player-status-adsPlayer-playing');
                options.playerContainer.find('.html5-ads-player').remove();
                setTimeout(function () {
                    adsPlayer.player.preload = null;
                    adsPlayer.player.current = null;
                }, 0);
            }
        };
        adsPlayer.init();
    }

    // 加载广告播放器
    function loadAdsPlayer(operation) {
        var count = adsPlayer.count - adsPlayer.index,
            currentVideo, $currentVideo,
            preloadVideo, $preloadVideo,
            status = adsPlayer.status,
            adsVideoSource = null,
            adsVideoLink = null,
            $adsLink = null;

        if (status === 'beginning') {
            adsVideoSource = options.adsSetting.beginning.source;
            adsVideoLink = options.adsSetting.beginning.link;
        } else if (status === 'ending') {
            adsVideoSource = options.adsSetting.ending.source;
            adsVideoLink = options.adsSetting.ending.link;
        }

        if (operation === 'init') {
            // 只有一个视频广告
            if (count === 1) {
                initAdsVideoStruct('single');
                $currentVideo = options.playerContainer.find('.html5-ads-player video[data-type="current"]');
                currentVideo = $currentVideo.get(0);

                adsHtml5Player(currentVideo, adsVideoSource[$currentVideo.attr('data-index')]);
                adsPlayer.adsLink = adsVideoLink[$currentVideo.attr('data-index')];
                adsPlayer.player.current = currentVideo;
            }
            // 大于一个视频广告 
            else if (count > 1) {
                initAdsVideoStruct('normal');
                $currentVideo = options.playerContainer.find('.html5-ads-player video[data-type="current"]');
                currentVideo = $currentVideo.get(0);

                $preloadVideo = options.playerContainer.find('.html5-ads-player video[data-type="preload"]');
                preloadVideo = $preloadVideo.get(0);

                adsHtml5Player(currentVideo, adsVideoSource[$currentVideo.attr('data-index')]);
                adsPlayer.adsLink = adsVideoLink[$currentVideo.attr('data-index')];
                adsPlayer.player.current = currentVideo;

                adsHtml5Player(preloadVideo, adsVideoSource[$preloadVideo.attr('data-index')]);
                adsPlayer.player.preload = preloadVideo;
            }

            $adsLink = options.playerContainer.find('.html5-ads-player .html5-ads-link');

            $adsLink.on('click', function () {
                window.open(adsPlayer.adsLink);
            });

        } else if (operation === 'update') {
            updateAdsVideoStruct();

            $preloadVideo = options.playerContainer.find('.html5-ads-player video[data-type="preload"]');
            preloadVideo = $preloadVideo.get(0);

            adsHtml5Player(preloadVideo, adsVideoSource[$preloadVideo.attr('data-index')]);
            adsPlayer.player.preload = preloadVideo;
        }
    }

    // 初始化广告播放器结构 并返回生成的播放器对象
    function initAdsVideoStruct(createType) {

        var playerContainer = options.playerContainer;
        var adsVideoStr = '<div class="html5-ads-player">';

        switch (createType) {
            case 'single':
                adsVideoStr += '<video data-index="0" data-type="current"></video>';
                adsPlayer.index += 1;
                break;
            case 'normal':
                adsVideoStr += '<video data-index="' + adsPlayer.index + '" data-type="current"></video>';
                adsPlayer.index += 1;
                adsVideoStr += '<video data-index="' + adsPlayer.index + '" data-type="preload"></video>';
                adsPlayer.index += 1;
                break;
            default: break;
        }

        adsVideoStr += '<div class="html5-ads-countDown"><span class="ads-countDown">' + adsPlayer.totalSeconds + '</span>';
        adsVideoStr += '&nbsp;|&nbsp;秒之后关闭广告<span class="ads-close"></span></div>';
        adsVideoStr += '<a class="html5-ads-link" href="javascript:;"></a>';
        adsVideoStr += '</div>';

        playerContainer.find('.videoContainer').append(adsVideoStr).addClass('h5player-status-adsPlayer-playing');
    }
    // 预加载下一个广告
    function updateAdsVideoStruct() {
        var playerContainer = options.playerContainer;
        var $html5AdsPlayer = playerContainer.find('.html5-ads-player');


        var newVideoStr = '<video data-index="' + adsPlayer.index + '" data-type="preload"></video>';
        adsPlayer.index += 1;

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

    // 
    //  * 直播播放时根据用户浏览器兼容情况选好直播流
    //  * 1. 优先选择 基于flv.js 的HTML5播放器播放,播 HTTP-FLV直播流
    //  * 2. 其次选择 基于hls.js 的HTML5播放器播放,播 HLS直播流
    //  * 3. 最后选择Flash播放器，播RTMP直播流(PC)
    //  
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

    function reloadPlayer() {
        // 根据播放器类型执行对应的播放方法
        switch (options.playerType) {
            case 'Html5':
                Html5Player('reload');
                break;
            case 'Flash':
                FlashPlayer('reload');
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
                Html5Player('refresh');
                break;
            case 'Flash':
                FlashPlayer('refresh');
                break;
            default: break;
        }
    }

    // 重新加载清晰度
    function reloadDefinition(newDefinitionText, callback) {

        var allRate = options.definitionSetting.allRate;

        for (var i = 0; i < allRate.length; i++) {
            if (newDefinitionText === allRate[i].text) {
                options.videoUrl = allRate[i].url;
                break;
            }
        }
        reloadPlayer();
        callback();
    }

    // HTML5播放器    
    function Html5Player(operation) {
        switch (getVideoType(options.videoUrl)) {
            case videoType['flv']:
                FlvPlayer(operation);
                break;
            case videoType['hls']:
                HlsPlayer(operation);
                break;
            default:
                if (options.isLive) {
                    alert('请传入正确的直播流地址！');
                } else {
                    Html5PlayerSource(operation);
                }
                break;
        }
        // 是否开启VR功能
        if (options.vrSetting.vrSwitch) {
            vrLaunch(); // 启动vrvr
        }
    }

    function vrLaunch() {
        var vr = new Vr({
            debug: options.debug,
            container: options.playerContainer.find('.liveContent'),
            vrMode: options.vrSetting.vrMode,
            videoSource: options.player_source
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

    // 基于flv.js的html5播放器    
    function FlvPlayer(operation) {

        // 播放器刷新处理
        if (operation === 'refresh') {
            options.player.detachMediaElement(options.player_source);
            options.player.unload();

            options.player.attachMediaElement(options.player_source);
            options.player.load();
        } else if (operation === 'reload') {
            var currentTime = options.player_source.currentTime,
                paused = options.player_source.paused;

            reload_currentTime = currentTime;
            options.player.destroy();

            options.player = flvjs.createPlayer({
                type: 'flv',
                isLive: options.isLive,
                cors: options.isLive,
                url: options.videoUrl,
                options: {
                    //fixAudioTimestampGap: false,
                    //autoCleanupSourceBuffer: true,  // 自动清理MSE内存
                    enableWorker: true,
                    enableStashBuffer: true,
                    stashInitialSize: 128   // 减少首桢显示等待时长 默认384
                }
            });

            options.player.attachMediaElement(options.player_source);
            options.player.load();
            paused ? (h5player.paused = true) : '';
        } else {
            var oIds = initVideoStruct(),
                videoDom = document.getElementById(oIds.playerId),
                volumeSlidebar = document.getElementById(oIds.volumeSlidebarId),
                player = flvjs.createPlayer({
                    type: 'flv',
                    isLive: options.isLive,
                    cors: options.isLive,
                    url: options.videoUrl,
                    options: {
                        //fixAudioTimestampGap: false,
                        //autoCleanupSourceBuffer: true,  // 自动清理MSE内存
                        enableWorker: true,
                        enableStashBuffer: true,
                        stashInitialSize: 128   // 减少首桢显示等待时长 默认384
                    }
                });
            player.attachMediaElement(videoDom);
            player.load();

            Html5VideoEventsBind(player, videoDom, volumeSlidebar)
        }
    }

    // 基于hls.js的html5播放器        
    function HlsPlayer(operation) {

        // 播放器刷新处理
        if (operation === 'refresh') {
            // unbind
            options.player.detachMedia();

            // bind them together
            options.player.attachMedia(options.player_source);
            options.player.on(Hls.Events.MEDIA_ATTACHED, function () {
                options.player.loadSource(options.videoUrl);
                options.player.on(Hls.Events.MANIFEST_PARSED, function (event, data) {
                });
            });

            options.player.on(Hls.Events.ERROR, function (event, data) {
                switch (data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                        showError('error', 'fatal network error encountered, try to recover');
                        options.player.startLoad();
                        break;
                    case Hls.ErrorTypes.MEDIA_ERROR:
                        showError('error', 'fatal media error encountered, try to recover');
                        options.player.recoverMediaError();
                        break;
                    default:
                        // cannot recover
                        options.player.destroy();
                        break;
                }
            });
        } else if (operation === 'reload') {
            var currentTime = options.player_source.currentTime,
                paused = options.player_source.paused,
                hls = new Hls();

            reload_currentTime = currentTime;

            options.player.destroy();
            options.player = hls;

            // bind them together
            hls.attachMedia(options.player_source);
            hls.on(Hls.Events.MEDIA_ATTACHED, function () {
                ///console.log("video and hls.js are now bound together !");
                hls.loadSource(options.videoUrl);
                hls.on(Hls.Events.MANIFEST_PARSED, function (event, data) {
                    paused ? (h5player.paused = true) : '';
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
        } else {
            var oIds = initVideoStruct(),
                player = document.getElementById(oIds.playerId),
                volumeSlidebar = document.getElementById(oIds.volumeSlidebarId),
                hls = new Hls();

            // bind them together
            hls.attachMedia(player);
            hls.on(Hls.Events.MEDIA_ATTACHED, function () {
                ///console.log("video and hls.js are now bound together !");
                hls.loadSource(options.videoUrl);
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

            Html5VideoEventsBind(hls, player, volumeSlidebar)
        }
    }

    // 原生html5播放器          
    function Html5PlayerSource(operation) {

        if (operation === 'refresh') {
            options.player_source.src = options.videoUrl;
        } else if (operation === 'reload') {
            var currentTime = options.player_source.currentTime,
                paused = options.player_source.paused;

            reload_currentTime = currentTime;

            options.player_source.src = options.videoUrl;

            paused ? (h5player.paused = true) : '';
        } else {
            var oIds = initVideoStruct(),
                player = document.getElementById(oIds.playerId),
                volumeSlidebar = document.getElementById(oIds.volumeSlidebarId);

            player.src = options.videoUrl;

            Html5VideoEventsBind(player, player, volumeSlidebar);
            // 自定义 destroy
            options.player.destroy = function () {
                player.pause();
            };
        }
    }

    function Html5VideoEventsBind(player, player_source, volumeSlidebar) {

        options.player = player;
        options.player_source = player_source;
        h5player.playerVolumer = volumeSlidebar;

        player_source.onloadeddata = h5player.onloadeddata;
        player_source.onloadedmetadata = h5player.onloadedmetadata;
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
        options.player.destroy = function () {
            swfobject.removeSWF(playerId);
        };
    }

    // 初始化播放器结构 并返回生成的播放器DOM ID    
    function initVideoStruct() {
        idCount.Html5++;

        // 清晰度选择功能字符串
        var definitionString = '';

        if (options.definitionSetting.allRate.length > 0) {
            var firstRate = options.definitionSetting.firstRate,
                allRate = options.definitionSetting.allRate;
            if (allRate.length === 1) {
                definitionString += '<div class="h5player-ctrl-bar-btn btn-kbps"><span class="btn-kbps-text" data-res="' + allRate[0].text + '">' + allRate[0].text + '</span></div>';
            } else {
                definitionString += '<div class="h5player-ctrl-bar-btn btn-kbps"><span class="btn-kbps-text" data-res="' + firstRate.text + '">' + firstRate.text + '</span>';
                definitionString += '<div class="h5player-ctrl-bar-kbps-panel">';
                for (var i = 0; i < allRate.length; i++) {
                    if (allRate[i].text === firstRate.text) {
                        definitionString += '<span class="h5player-ctrl-bar-kbps-change h5player-ctrl-bar-kbps-current" data-res="' + allRate[i].text + '">' + allRate[i].text + '</span>';
                    } else {
                        definitionString += '<span class="h5player-ctrl-bar-kbps-change" data-res="' + allRate[i].text + '">' + allRate[i].text + '</span>';
                    }
                }
                definitionString += '</div></div>';
            }
        }

        // 暂停广告字符串
        var pauseAdsString = '';

        if (options.adsSetting.adsActive && options.adsSetting.pause.source.length > 0) {
            pauseAdsString += '<div class="h5player-pause-ads-wrap"><div class="h5player-pause-ads"><span class="close"></span>' +
                '<a target="_blank" href="' + options.adsSetting.pause.link[0] + '">' +
                '<img src="' + options.adsSetting.pause.source[0] + '" alt="pause-image"/></a>' +
                '</div></div>';
        }

        // 面板字符串 - 开关灯/分享到社交平台/logo显示
        var panelString = '';

        if (options.panelSetting.logo.isShow || options.panelSetting.light.isShow || options.panelSetting.share.isShow) {
            panelString = '<div class="h5player-panel-wrap">';

            if (options.panelSetting.logo.isShow) {
                var logoPosition = options.panelSetting.logo.position,
                    logoSrc = options.panelSetting.logo.src;

                panelString += '<div class="h5player-panel-logo ' + logoPosition + '">'
                panelString += '<img src="' + logoSrc + '" alt="logo"/></div>'
            }

            if (options.panelSetting.light.isShow || options.panelSetting.share.isShow) {
                var className = 'h5player-panel-control';
                if (options.panelSetting.light.isShow && options.panelSetting.share.isShow) {
                    className = 'h5player-panel-control double';
                }
                panelString += '<div class="' + className + '">';
                panelString += options.panelSetting.light.isShow ? '<div class="h5player-panel-light"><span class="icon-light">关灯</span></div>' : '';
                panelString += options.panelSetting.share.isShow ? '<div class="h5player-panel-share"><span class="icon-share">分享</span></div>' : '';
                panelString += '</div>';
            }
            panelString += '</div>';
        }

        // 弹幕结构相关
        var barrageString = '';

        if (options.barrageSetting.isShow) {
            // 弹幕开关以及弹幕输入
            barrageString += '<div class="h5player-ctrl-bar-barrage-container">';
            barrageString += '<div class="h5player-ctrl-bar-barrage-control">' +
                '<span class="h5player-ctrl-bar-btn btn-barrage-setting" data-info="弹幕设置"></span>' +
                '<div class="barrage-word-setting">' +
                '<ul class="word-font"><li class="large active">A</li><li class="medium">A</li><li class="small">A</li></ul>' +
                '<ul class="word-color"><li class="white active"></li><li class="yellow"></li><li class="orange"></li>' +
                '<li class="red"></li><li class="pink"></li><li class="purple"></li>' +
                '<li class="blue"></li><li class="green"></li></ul>' +
                '</div>';
            barrageString += '<div class="barrage-input-container">' +
                '<input class="barrage-input" type= "text" data-info="弹幕输入" placeholder= "发弹幕是不可能不发弹幕的，这辈子不可能不发弹幕的。" />' +
                '<input class="barrage-send" type="button" data-info="发送弹幕" value="发送" /></div></div>';
            barrageString += '<span class="h5player-ctrl-bar-btn btn-barrage" data-info="弹幕"></span>';

            barrageString += '</div>';
        }

        var playerContainer = options.playerContainer,
            videoIdFormal = options.isLive ? 'live' : 'onDemand',
            playerId = videoIdFormal + options.playerType + '-' + idCount.Html5,
            volumeSlidebarId = 'volumeSlidebar' + '-' + idCount.Html5,
            videoClassName = options.isLive ? 'videoLive' : 'videoOnDemand',
            controlsTag = (options.controls && options.isDefaultControls) ? 'controls' : '',
            h5playerStatusClass = (options.autoplay && (options.adsSetting.beginning.timeLength === 0 || !options.adsSetting.adsActive)) ? 'h5player-status-playing' : 'h5player-status-paused',
            h5playerSkinClass = options.skinSetting.skinName === 'default' ? '' : ' h5player-skin-' + options.skinSetting.skinName,
            timelineTag = '<div class="h5player-ctrl-timeline-container"><span class="current-time">00:00:01</span>/<span class="duration-time">01:30:30</span></div>', // 点播视频显示 - 当前时间 / 视频长度
            // 弹幕主体显示部分
            barrageContentString = options.barrageSetting.isShow ? '<div class="h5player-barrage-wrap"></div>' : '',
            // 是否开启VR功能 - 且 vrSetting.vrControl为true显示vr切换条
            vrContentString = options.vrSetting.vrSwitch && options.vrSetting.vrControl ? '<span class="h5player-ctrl-bar-btn btn-vr" data-info="' + vrTextShow[options.vrSetting.vrMode] + '">' + vrTextShow[options.vrSetting.vrMode] + '</span>' : '',

            html5ControlString_live = '<div class="h5player-live-ctrl">' +
                '<div class="h5player-live-bar">' +
                '<div class="h5player-ctrl-bar clearfix">' +
                '<span class="h5player-ctrl-bar-btn btn-play" data-info="播放/暂停"></span>' +
                '<span class="h5player-ctrl-bar-btn btn-refresh" data-info="刷新"></span>' +

                '<span class="h5player-ctrl-bar-btn btn-fullScreen" data-info="全屏"></span>' +
                vrContentString +
                definitionString +
                '<div class="h5player-ctrl-bar-volume-container">' +
                '<span class="h5player-ctrl-bar-btn btn-volume"></span>' +
                '<div class="h5player-ctrl-bar-btn h5player-ctrl-bar-volume-slide">' +
                '<input id="' + volumeSlidebarId + '" class="h5player-ctrl-bar-volume-slidebar" type="range" min="0" value="100" max="100" data-info="音量调整"/>' +
                '</div></div>' +
                barrageString +

                '</div></div></div>',

            html5ControlString_onDemond = '<div class="h5player-live-ctrl">' +
                '<div class="h5player-live-bar">' +

                '<div class="h5player-ctrl-bar clearfix">' +
                '<span class="h5player-ctrl-bar-btn btn-play" data-info="播放/暂停"></span>' +
                timelineTag +
                '<span class="h5player-ctrl-bar-btn btn-fullScreen" data-info="全屏"></span>' +
                vrContentString +
                definitionString +
                '<div class="h5player-ctrl-bar-volume-container">' +
                '<span class="h5player-ctrl-bar-btn btn-volume"></span>' +
                '<div class="h5player-ctrl-bar-btn h5player-ctrl-bar-volume-slide">' +
                '<input id="' + volumeSlidebarId + '" class="h5player-ctrl-bar-volume-slidebar" type="range" min="0" value="100" max="100" data-info="音量调整"/>' +
                '</div></div>' +
                barrageString +
                '</div>' +
                '<div class="h5player-progress-bar-container">' +
                '<div class="h5player-progress-list">' +
                '<div class="h5player-progress-load"></div>' +
                '<div class="h5player-progress-play"></div></div>' +
                '<div class="h5player-progress-btn-scrubber">' +
                '<div class="h5player-progress-btn-scrubber-indicator"></div></div></div>' +
                '</div></div>',

            html5ControlString = options.playerType !== 'Flash' && options.controls && !options.isDefaultControls ? (options.isLive ? html5ControlString_live : html5ControlString_onDemond) : '',
            videoString = '<div class="videoContainer"><div class="liveContent ' + h5playerStatusClass + h5playerSkinClass + '">' +
                '<video class="' + videoClassName + '" id="' + playerId + '" ' + controlsTag + '>' +
                'Your browser is too old which does not support HTML5 video' +
                '</video>' + barrageContentString + html5ControlString + pauseAdsString + panelString +
                '</div>' +
                '</div>';

        playerContainer.append(videoString);
        // 缓存弹幕父节点DOM对象
        options.barrageContainer = options.playerContainer.find('.h5player-barrage-wrap');

        initHtml5CtrlEvents();
        return {
            playerId: playerId,
            volumeSlidebarId: volumeSlidebarId
        };
    }

    // 绑定H5播放控制器的相关dom事件

    function initHtml5CtrlEvents() {

        // webkit内核浏览器volue slidebar样式初始化
        var webkitVolumePseudoClassInited = false,
            timeoutId = undefined;

        options.playerContainer.on('mouseenter.vp_custom_event mouseleave.vp_custom_event mouseup.vp_custom_event ', '.videoContainer', videoContainerEvents);
        // 全屏状态用户鼠标停留超过2s后关闭控制显示条，移动鼠标立即显示控制条
        options.playerContainer.on('mousemove.vp_custom_event', '.h5player-status-fullScreen', function () {
            var $this = $(this);
            if (timeoutId) {
                clearTimeout(timeoutId);
                $this.hasClass('h5player-status-controls-in') ? '' : $this.addClass('h5player-status-controls-in');
            }
            timeoutId = setTimeout(function () {
                $this.hasClass('h5player-status-controls-in') ? $this.removeClass('h5player-status-controls-in') : '';
            }, options.h5playerSetting.fullscreenHideTimeout);
        });
        options.playerContainer.on('click.vp_custom_event', '.h5player-status-playing .h5player-ctrl-bar .btn-play', function (e) {
            e.stopPropagation();
            e.preventDefault();
            e.stopImmediatePropagation();
            h5player.pause();
        });
        options.playerContainer.on('click.vp_custom_event', '.h5player-status-paused .h5player-ctrl-bar .btn-play', function () {
            var $videoContainer = options.playerContainer.find('.videoContainer');
            if ($videoContainer.hasClass('h5player-status-adsPlayer-playing')) {
                return;
            }
            h5player.play();
        });
        options.playerContainer.on('click.vp_custom_event', '.h5player-ctrl-bar .btn-refresh', function () {
            h5player.refresh();
        });
        options.playerContainer.on('click.vp_custom_event', '.h5player-ctrl-bar .btn-fullScreen', function () {
            h5player.fullscreen();
        });
        options.playerContainer.on('click.vp_custom_event', '.h5player-ctrl-bar .btn-volume', function () {
            h5player.muted();
            // 存在广告播放器且正在播放广告
            if (adsPlayer && adsPlayer.totalSeconds > 0) {
                adsPlayer.muted();
            }
        });

        // 屏蔽视频进度条圆点的拖放事件
        options.playerContainer.on('dragstart.vp_custom_event', '.h5player-live-ctrl .h5player-progress-btn-scrubber', function (e) {
            e.preventDefault();
        });
        // 视频进度条容器 鼠标按下事件
        options.playerContainer.on('mouseenter.vp_custom_event mouseleave.vp_custom_event mouseup.vp_custom_event', '.h5player-live-ctrl .h5player-progress-bar-container', progressBarContainerMouse);
        // 视频进度条容器 鼠标按下事件
        options.playerContainer.on('mousedown.vp_custom_event', '.h5player-live-ctrl .h5player-progress-bar-container', function (e) {
            e.stopPropagation();
            e.stopImmediatePropagation();
            var $this = $(this),
                thisWidth = $this.width(),
                thisParentsOffsetLeft = $this.parents('.videoContainer')[0].offsetLeft,
                thisPageX = e.pageX,
                currentTimePercent = (thisPageX - thisParentsOffsetLeft) / thisWidth,
                param = {
                    currentTimePercent: currentTimePercent,
                    isSeek: true
                },
                $videoContainer = options.playerContainer.find('.videoContainer');

            if ($videoContainer.hasClass('h5player-status-adsPlayer-playing')) {
                return;
            }
            h5player.progressChange(param);
            h5player.seeking = true;
            h5player.pause();
        });

        if (options.screenshotsSetting.displayState) {

            var throttled = _.throttle(screenshotsShow, options.screenshotsSetting.timeout),
                $liveContent = options.playerContainer.find('.liveContent');

            // 阻止进度条圆点事件冒泡
            options.playerContainer.on('mousemove.vp_custom_event', '.h5player-live-ctrl .h5player-progress-btn-scrubber', function (e) {
                e.stopPropagation();
            });
            // 视频进度条容器 鼠标移动事件
            options.playerContainer.on('mousemove.vp_custom_event', '.h5player-live-ctrl .h5player-progress-bar-container', function (e) {

                var contentWidth = $(this).width(),
                    duration = options.player_source.duration,
                    offsetX = e.offsetX,
                    curPercent = offsetX / contentWidth,
                    currentSecond = Math.round(curPercent * duration),
                    currentTime = secondToTime(currentSecond);
                throttled(contentWidth, offsetX, currentSecond, currentTime);
            });

            options.playerContainer.on('mouseleave.vp_custom_event', '.h5player-live-ctrl .h5player-progress-bar-container', function (e) {
                setTimeout(function () {
                    screenshotsHide();
                }, options.screenshotsSetting.timeout);
            });
            function screenshotsShow(contentWidth, offsetX, currentSecond, currentTime) {

                var $wrap = $liveContent.find('.h5player-screenshots-wrap');
                if ($wrap.length === 0) {
                    var layer = '<div class="h5player-screenshots-wrap"><img alt="screenshots-image" /><span></span></div>';
                    $liveContent.append(layer);

                    $wrap = $liveContent.find('.h5player-screenshots-wrap');
                } else {
                    if ($wrap.hasClass('hide-screenshots')) {
                        $wrap.removeClass('hide-screenshots');
                    }
                }
                _updateScreenshots();
                function _updateScreenshots() {
                    var $img = $wrap.find('img'),
                        $span = $wrap.find('span'),
                        wrapWidth = $wrap.width(),
                        actualOffsetX = offsetX - wrapWidth / 2,
                        minOffsetX = 0,
                        maxOffsetX = contentWidth - wrapWidth;

                    actualOffsetX = actualOffsetX < minOffsetX ? minOffsetX : actualOffsetX;
                    actualOffsetX = actualOffsetX > maxOffsetX ? maxOffsetX : actualOffsetX;

                    $wrap.css('left', actualOffsetX);
                    $img.attr('src', options.screenshotsSetting.serviceUrl + '/' + options.screenshotsSetting.prefix + (currentSecond + 1) + options.screenshotsSetting.suffix);
                    $span.text(currentTime);
                }
            }
            function screenshotsHide() {
                var $wrap = $liveContent.find('.h5player-screenshots-wrap');
                if (!$wrap.hasClass('hide-screenshots')) {
                    $wrap.addClass('hide-screenshots');
                }
            }
        }

        // 暂停广告关闭事件
        options.playerContainer.on('click.vp_custom_event', '.h5player-pause-ads-wrap .h5player-pause-ads .close', pauseAdsClose);

        // 开关灯/分享相关事件
        options.playerContainer.on('click.vp_custom_event', '.h5player-panel-control .h5player-panel-light .icon-light', lightSwitch);
        options.playerContainer.on('click.vp_custom_event', '.h5player-panel-control .h5player-panel-share .icon-share', shareSwitch);
        options.playerContainer.on('click.vp_custom_event', '.h5player-panel-share-content .close', sharePanelHide);
        options.playerContainer.on('click.vp_custom_event', '.h5player-panel-share-content .share-copy dd', shareCopy);

        // 弹幕相关事件 
        options.playerContainer.on('click.vp_custom_event', '.h5player-ctrl-bar .btn-barrage', barrageFuncSwitch);
        options.playerContainer.on('click.vp_custom_event', '.h5player-ctrl-bar-barrage-control .barrage-send', barrageSend);
        options.playerContainer.on('keydown.vp_custom_event', '.h5player-ctrl-bar-barrage-control .barrage-input', barrageInput);

        // 弹幕字体设置面板控制出现和隐藏
        options.playerContainer.on('click.vp_custom_event', '.h5player-ctrl-bar-barrage-control .btn-barrage-setting', barrageSettingSwitch);
        options.playerContainer.on('mouseenter.vp_custom_event mouseleave.vp_custom_event mouseup.vp_custom_event', '.h5player-ctrl-bar-barrage-control .barrage-word-setting', barrageSettingPanel);

        // 弹幕字体大小/颜色设置
        options.playerContainer.on('click.vp_custom_event', '.barrage-word-setting .word-font li,.barrage-word-setting .word-color li', barrageWordSetting);

        // 视频清晰度相关事件处理
        //options.playerContainer.on('click.vp_custom_event', '.h5player-ctrl-bar .btn-kbps-text', definitionSwicth);
        options.playerContainer.on('click.vp_custom_event', '.h5player-ctrl-bar .h5player-ctrl-bar-kbps-change', definitionChange);

        // document mousemove/mouseup 
        $document.on('mousemove.vp_custom_event', documentMousemove);
        $document.on('mouseup.vp_custom_event', documentMouseup);
        $document.on('webkitfullscreenchange.vp_custom_event mozfullscreenchange.vp_custom_event MSFullscreenChange.vp_custom_event fullscreenchange.vp_custom_event', documentFullscreenchange);

        // input range - input事件在IE10尚不支持，可以使用change替代
        options.playerContainer.on('input.vp_custom_event change.vp_custom_event', '.h5player-ctrl-bar .h5player-ctrl-bar-volume-slidebar', function () {
            var $this = $(this),
                thisValue = $this.val();
            h5player.volumeChange(thisValue / 100);
            // 存在广告播放器
            if (adsPlayer && adsPlayer.totalSeconds > 0) {
                adsPlayer.volumeChange(thisValue / 100);
            }
            if (isWebkitBrowser) {
                $this.attr('data-process', thisValue);
            }
        });
    }

    // 开关灯
    function lightSwitch() {
        //showLog('light switch');
        var $this = $(this),
            $body = $('body');
        if (!document.getElementById('vp-lightBg')) {
            $body.append('<div id="vp-lightBg" class="vp-lightBg"></div>');
            options.playerContainer.find('.videoContainer').addClass('light-off');
        } else {
            $('#vp-lightBg').remove();
            options.playerContainer.find('.videoContainer').removeClass('light-off');
        }
    }
    // 分享面板开启-关闭
    function shareSwitch() {
        //showLog('share switch');
        var $this = $(this),
            $panelWrap = $this.parents('.h5player-panel-wrap'),
            $shareContent = $panelWrap.find('.h5player-panel-share-content'),
            shareString = '';
        if ($shareContent.length > 0) {
            $shareContent.toggleClass('active');
        } else {
            var shareOptions = options.panelSetting.share.options,
                shareLinks = options.panelSetting.share.links,
                shareCopy = options.panelSetting.share.copy,
                optionsArr = shareOptions.split('|'),
                linksArr = shareLinks.split('|'),
                copyArr = shareCopy.split('|'),
                copyLink = '',
                copyHtml = '',
                index = 0;

            if (linksArr.length > 0) {
                copyLink = copyArr[0].replace(/\$#\$/g, '&');
                copyHtml = copyArr[1].replace(/\$#\$/g, '&');
            } else {
                showLog('panelSetting.share.copy is null.');
            }

            shareString += '<div class="h5player-panel-share-content active"><span class="close"></span>';

            // 一键分享字符串部分
            shareString += '<dl class="share-img"><dt>一键分享</dt>';
            optionsArr.forEach(function (element) {
                if (element === "1") {
                    //console.log(linksArr[index]);
                    shareString += '<dd><a target="_blank" href="' + linksArr[index].replace(/\$#\$/g, '&') + '" class="' + shareIcon[index] + '"></a></dd>';
                }
                index++;
            });
            shareString += '</dl>';

            // 复制粘贴字符串部分
            shareString += '<dl class="share-copy"><dt>复制转帖</dt>' +
                '<dd class="copy-link"><span>点击复制url代码</span><input type="text" value="' + copyLink + '"/></dd>' +
                '<dd class="copy-html"><span>点击复制html代码</span><input type="text" value="' + copyHtml + '"/></dd></dl>';

            // 扫码分享字符串部分
            shareString += '<dl class="share-qrcode"><dt>扫码轻松分享</dt><dd id="qrcode' + idCount.Html5 + '"></dd></dl>';

            shareString += '</div>';
            $panelWrap.append(shareString);

            // qrcode - 设置参数方式 - base on qrcode.js
            var qrcode = new QRCode('qrcode' + idCount.Html5, {
                text: copyLink,
                width: 90,
                height: 90,
                colorDark: '#000000',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.H
            });
        }
    }
    // 隐藏分享面板
    function sharePanelHide() {
        var $this = $(this),
            $thisParent = $this.parent();
        $thisParent.removeClass('active');
    }
    // 复制分享链接或html代码
    function shareCopy() {

        var $this = $(this),
            $thisInput = $this.find('input');

        if (!$this.hasClass('copied')) {

            $thisInput.focus();
            $thisInput.select();

            try {
                if (document.execCommand('copy', false, null)) {
                    //success info
                    var $siblingsCopied = $this.siblings('.copied');

                    if ($siblingsCopied.length > 0) {
                        $siblingsCopied.removeClass('copied');
                    }
                    $this.addClass('copied');
                } else {
                    //fail info
                    showLog('复制失败');
                }
            } catch (err) {
                //fail info
                showError('复制异常');
            }
        }
    }

    function videoContainerEvents(e) {
        var $this = $(this);
        switch (e.type) {
            case 'mouseup':
                Event_timeStamp = e.timeStamp;
                break;
            case 'mouseenter':
                $this.hasClass('h5player-status-controls-in') ? '' : $this.addClass('h5player-status-controls-in');
                break;
            case 'mouseleave':
                if (!Event_timeStamp || (e.timeStamp - Event_timeStamp > 10)) {
                    $this.hasClass('h5player-status-controls-in') ? $this.removeClass('h5player-status-controls-in') : '';
                }
                break;
        }
    }

    // 时间进度条鼠标事件
    function progressBarContainerMouse(e) {
        var $videoContainer = options.playerContainer.find('.videoContainer');
        switch (e.type) {
            case 'mouseup':
                Event_timeStamp = e.timeStamp;
                break;
            case 'mouseenter':
                $videoContainer.hasClass('h5player-status-progress-hover') ? '' : $videoContainer.addClass('h5player-status-progress-hover');
                break;
            case 'mouseleave':
                if (!Event_timeStamp || (e.timeStamp - Event_timeStamp > 10)) {
                    $videoContainer.hasClass('h5player-status-progress-hover') ? $videoContainer.removeClass('h5player-status-progress-hover') : '';
                }
                break;
        }
    }

    // 清晰度切换
    function definitionChange() {
        showLog('definitionChange function');
        var $this = $(this);

        if ($this.hasClass('h5player-ctrl-bar-kbps-current')) {
            showLog('active element');
            return;
        } else {
            showLog('not active element');
            var $thisParents = $this.parents('.btn-kbps'),
                $kbpsText = $thisParents.find('.btn-kbps-text'),
                $current = $this.siblings('.h5player-ctrl-bar-kbps-current'),
                newDefinitionText = $this.attr('data-res');

            $thisParents.addClass('h5player-ctrl-bar-kbps-panel-hide');

            function _loadAfterFunc() {
                showLog('_loadAfterFunc function');
                $current.removeClass('h5player-ctrl-bar-kbps-current');
                $this.addClass('h5player-ctrl-bar-kbps-current');
                $kbpsText.text(newDefinitionText).attr('data-res', newDefinitionText);
            }
            reloadDefinition(newDefinitionText, _loadAfterFunc);

            // 暂时 - 清晰度切换完成执行
            setTimeout(function () {
                $thisParents.removeClass('h5player-ctrl-bar-kbps-panel-hide');
            }, 1000);

        }
    }

    // document event
    function documentMousemove(e) {
        if (h5player.seeking) {
            e.stopPropagation();
            e.stopImmediatePropagation();
            var $this = $(this),
                $progressBarContainer = options.playerContainer.find('.h5player-live-ctrl .h5player-progress-bar-container'),
                containerWidth = $progressBarContainer.width(),
                thisParentsOffsetLeft = $progressBarContainer.parents('.videoContainer')[0].offsetLeft,
                thisPageX = e.pageX,
                currentTimePercent = (thisPageX - thisParentsOffsetLeft) / containerWidth,
                param = {
                    currentTimePercent: currentTimePercent,
                    isSeek: true
                };

            h5player.progressChange(param);
        }
    }
    function documentMouseup(e) {
        if (h5player.seeking) {
            h5player.seeking = false;
            h5player.play();
        }
    }
    function documentFullscreenchange() {
        var $videoContainer = options.playerContainer.find('.videoContainer ');
        if (h5player.fullscreenStatus && $videoContainer.hasClass('h5player-status-fullScreen') && !fullscreenElement()) {
            h5player.fullscreenStatus = false;
            $videoContainer.removeClass('h5player-status-fullScreen');
        }
    }

    function pauseAdsClose() {
        var $this = $(this),
            $pauseAdsWrap = $this.parents('.h5player-pause-ads-wrap');

        $pauseAdsWrap.removeClass('active');
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

    // 
    //  * 更新弹幕数据
    //  * methodName (open/close)
    //  
    function updateBarrageData(methodName) {

        switch (methodName) {
            // 打开弹幕
            case 'open':
                _open();
                break;
            // 关闭弹幕
            case 'close':
                _close();
                break;
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

        // 打开弹幕
        function _open() {
            if (!options.barrageSetting.clientObject) {
                options.barrageSetting.clientObject = new Barrage(options.isLive); // Barrage.js
                options.barrageSetting.clientObject.connectServer(options.barrageSetting.serverUrl, options.barrageSetting.videoInfo.videoName, options.barrageSetting.videoInfo.videoId);
            }
            options.barrageSetting.clientObject.getMessageByTime(Math.round(options.player_source.currentTime));
            updateBarrageDisplay();

            barrageControl.intervalId = setInterval(function () {
                options.barrageSetting.clientObject.getMessageByTime(Math.round(options.player_source.currentTime));
            }, barrageControl.intervalTime);
        }

        // 关闭弹幕
        function _close() {
            updateBarrageDisplay('clean');
            clearInterval(barrageControl.intervalId);
            barrageControl.intervalId = undefined;
            // 关闭当前客户端与服务端的连接
            options.barrageSetting.clientObject.closeServer(options.barrageSetting.videoInfo.videoName, options.barrageSetting.videoInfo.videoId);
            // 初始化弹幕交互对象
            options.barrageSetting.clientObject = null;
            // 弹幕监听关闭，值改为false
            barrageControl.isMonitored = false;
        }

        // 暂停后再播放时打开弹幕
        function _play() {
            if (barrageControl.isOpen && !barrageControl.intervalId) {
                barrageControl.intervalId = setInterval(function () {
                    options.barrageSetting.clientObject.getMessageByTime(Math.round(options.player_source.currentTime));
                }, barrageControl.intervalTime);
            }
        }

        // 暂停弹幕
        function _pause() {
            if (barrageControl.isOpen && barrageControl.intervalId) {
                clearInterval(barrageControl.intervalId);
                barrageControl.intervalId = undefined;
            }
        }
    }

    // 
    //  *  更新弹幕页面展示效果
    //  
    function updateBarrageDisplay(method) {
        if (method == 'clean') {
            options.barrageContainer.empty();
        } else if (!barrageControl.isMonitored) {

            barrageControl.isMonitored = true;
            options.barrageSetting.clientObject.messageMonitor(function (receiveMsg) {

                if (receiveMsg.length > 0) {
                    for (var i = 0; i < receiveMsg.length; i++) {
                        options.barrageContainer.append(createBarrageDom(receiveMsg[i]));
                    }
                }

            });
        }
    }

    // 弹幕开关处理程序
    function barrageFuncSwitch() {
        var $this = $(this),
            $thisParent = $this.parent(), // .h5player-ctrl-bar-barrage-container
            $parentLiveContent = $this.parents('.liveContent'),
            $h5playerBarrageWrap = $parentLiveContent.find('.h5player-barrage-wrap'),
            $barrageControl = $thisParent.find('.h5player-ctrl-bar-barrage-control'),
            $videoContainer = options.playerContainer.find('.videoContainer');

        if ($videoContainer.hasClass('h5player-status-adsPlayer-playing') || $this.hasClass('disabled')) {
            return;
        }

        if (!$this.hasClass('active')) {
            initBarrageStyle();
            $barrageControl.addClass('active');
            $this.addClass('active');

            if (barrageControl.timeoutTime > 0) {
                $this.addClass('disabled');
                // 延时 barrageControl.timeoutTime 开启弹幕切换
                setTimeout(function () {
                    $this.removeClass('disabled');
                }, barrageControl.timeoutTime);
            }

            barrageControl.isOpen = true;
            updateBarrageData('open');
        } else {
            $barrageControl.removeClass('active');
            $this.removeClass('active');

            if (barrageControl.timeoutTime > 0) {
                $this.addClass('disabled');
                // 延时 barrageControl.timeoutTime 开启弹幕切换
                setTimeout(function () {
                    $this.removeClass('disabled');
                }, barrageControl.timeoutTime);
            }

            $h5playerBarrageWrap.empty();
            barrageControl.isOpen = false;
            updateBarrageData('close');
        }
    }
    //  初始化弹幕动画样式
    function initBarrageStyle() {

        if (!barrageControl.isInited) {
            barrageControl.isInited = true;

            // 弹幕动画完成 - 清除事件
            // Chrome, Safari 和 Opera 代码 - webkitAnimationEnd
            // 标准写法 - animationend
            options.barrageContainer.on('animationend webkitAnimationEnd', '.h5player-barrage-item', function () {
                $(this).remove();
            });

            var barrageContainer_width = options.barrageContainer.width();
            var newStyle = '<style>';

            // 通用
            newStyle += '@keyframes barrage {\
                                    0% {\
                                        visibility: visible;\
                                        transform: translateX('+ barrageContainer_width + 'px);\
                                    }\
                                    100% {\
                                        visibility: visible;\
                                        transform: translateX(-100%);\
                                    }\
                                }';

            // 兼容火狐浏览器    
            newStyle += '@-moz-keyframes barrage {\
                                    0% {\
                                        visibility: visible;\
                                        -moz-transform: translateX('+ barrageContainer_width + 'px);\
                                    }\
                                    100% {\
                                        visibility: visible;\
                                        -moz-transform: translateX(-100%);\
                                    }\
                                }';
            // 早期版本webkit内核浏览器
            newStyle += '@-webkit-keyframes barrage {\
                                    0% {\
                                        visibility: visible;\
                                        -webkit-transform: translateX('+ barrageContainer_width + 'px);\
                                    }\
                                    100% {\
                                        visibility: visible;\
                                        -webkit-transform: translateX(-100%);\
                                    }\
                                }';
            // opera
            newStyle += '@-o-keyframes barrage {\
                                    0% {\
                                        visibility: visible;\
                                        -o-transform: translateX('+ barrageContainer_width + 'px);\
                                    }\
                                    100% {\
                                        visibility: visible;\
                                        -o-transform: translateX(-100%);\
                                    }\
                                }';

            newStyle += '</style>';
            $(newStyle).appendTo('head');
        }
    }
    // 发送弹幕
    function barrageSend() {
        var $this = $(this),
            $barrageInput = $this.siblings('.barrage-input'),
            barrageInfo = $barrageInput.val(),
            barrageMsg;

        if (!barrageInfo) {
            alert('请输入弹幕信息~');
        } else {

            var wordFont = barrageWordStyle.font[options.barrageSetting.wordStyle.font],
                wordColor = barrageWordStyle.color[options.barrageSetting.wordStyle.color];

            barrageMsg = {
                time: Math.round(options.player_source.currentTime),
                content: barrageInfo,
                font: wordFont,
                color: wordColor
            };

            options.barrageSetting.clientObject.SendMsgToServer(barrageMsg);
            options.barrageContainer.append(createBarrageDom(barrageMsg));
            $barrageInput.val('');
        }
    }
    // 弹幕输入处理
    function barrageInput(event) {
        // 回车
        if (event.keyCode == 13) {
            var $this = $(this),
                $barrageSend = $this.siblings('.barrage-send');
            $barrageSend.trigger('click');
        }
    }
    // 创建弹幕dom节点
    function createBarrageDom(barrageData) {
        var showMsg = '';
        // 直播
        if (options.isLive) {
            if (typeof barrageData.content === 'object') {
                showMsg = barrageData.content.ip + ' : ' + barrageData.content.msg
            } else {
                return;
            }
        } else {
            showMsg = barrageData.content;
        }

        var barrageItem = '<div class="h5player-barrage-item animation_barrage" style="' +
            'color:' + barrageData.color + ';' +
            'font-size:' + barrageData.font + 'px;' +
            'top:' + randomTop() + 'px;' +
            '">' + showMsg + '</div>';

        return barrageItem;
    }
    // 随机生成弹幕位置 - 距离视频顶部
    function randomTop() {
        var randomNum = Math.random(),
            randomTop = Math.floor(randomNum * (576 - 26));

        return randomTop;
    }
    // 弹幕字体设置面板控制出现和隐藏
    function barrageSettingSwitch() {
        var $this = $(this),
            $barrageWordSetting = $this.siblings('.barrage-word-setting');

        $barrageWordSetting.toggleClass('active');

        if ($barrageWordSetting.hasClass('active')) {
            barrageControl.settingTimeoutId = setTimeout(function () {
                if ($barrageWordSetting.hasClass('active')) {
                    $barrageWordSetting.removeClass('active');
                }
            }, barrageControl.timeoutTime);
        } else {
            if (typeof barrageControl.settingTimeoutId !== 'undefined') {
                clearTimeout(barrageControl.settingTimeoutId);
            }
        }
    }
    function barrageSettingPanel(e) {
        switch (e.type) {
            case 'mouseup':
                Event_timeStamp = e.timeStamp;
                break;
            case 'mouseenter':
                clearTimeout(barrageControl.settingTimeoutId);
                break;
            case 'mouseleave':
                if (!Event_timeStamp || (e.timeStamp - Event_timeStamp > 10)) {
                    var $this = $(this);
                    if ($this.hasClass('active')) {
                        $this.removeClass('active');
                    }
                }
                break;
        }
    }
    // 弹幕字体大小(颜色)设置
    function barrageWordSetting() {
        var $this = $(this),
            parentClassName = $this.parent('ul').attr('class'),
            key = '';

        if (parentClassName === 'word-font') {
            key = 'font';
        } else if (parentClassName === 'word-color') {
            key = 'color';
        } else {
            return;
        }

        if (!$this.hasClass('active')) {
            var $active = $this.siblings('.active'),
                thisClassName = $this.attr('class');

            options.barrageSetting.wordStyle[key] = thisClassName;

            $this.addClass('active');
            $active.removeClass('active');

            showLog(options.barrageSetting.wordStyle);
        }
    }

    // destroy
    function destroy() {

        options.player.destroy();
        options.playerContainer.find('.videoContainer').remove();
        // 事件销毁
        options.playerContainer.off('.vp_custom_event');
        // 清除弹幕定时器，如果存在
        if (barrageControl.intervalId) {
            clearInterval(barrageControl.intervalId);
            barrageControl.intervalId = undefined;
        }
    }

    // Shows a message in the console of the given type.
    // type: error / warn
    function showError(type, text) {
        console && console[type] && console[type]('videoPlayer: ' + text);
    }


    // 输出调试信息
    // @param {*} logMsg 
    function showLog(logMsg) {
        if (!options.debug) {
            return;
        }

        console && console.log && console.log(logMsg);
    }
    //  时间秒数格式化
    //  @param s 时间戳（单位：秒）
    //  @returns {*} 格式化后的时分秒
    function secondToTime(s) {
        var t = '';
        if (s > -1) {
            var hour = Math.floor(s / 3600);
            var min = Math.floor(s / 60) % 60;
            var sec = s % 60;

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
    };

    // Find the right method, call on correct element
    function launchFullScreen(element) {
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
    // 退出全屏
    function exitFullscreen() {
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
    // 返回全屏的元素对象，注意：要在用户授权全屏后才能获取全屏的元素，否则 fullscreenEle为null
    function fullscreenElement() {
        var fullscreenEle = document.fullscreenElement ||
            document.mozFullScreenElement ||
            document.webkitFullscreenElement ||
            document.msFullscreenElement;
        return fullscreenEle;
    }

    function fullscreenEnable() {
        var isFullscreen = document.fullscreenEnabled ||
            window.fullScreen ||
            document.webkitIsFullScreen ||
            document.msFullscreenEnabled;
        //注意：要在用户授权全屏后才能准确获取当前的状态
        return Boolean(isFullscreen);
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

//export default videoPlayer;