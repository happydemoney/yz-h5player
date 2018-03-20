/**
 * 包含ad-video的属性以及方法
 */

// core player Class
import { AdFlvPlayer } from '../../core/flvPlayer.js';
import { AdHlsPlayer } from '../../core/hlsPlayer.js';
import { AdNativePlayer } from '../../core/nativePlayer.js';

// util function
import { getVideoType } from '../../utils/util.js';
// 引入常量模块
import { videoType } from '../../const/constant.js';

let AdVideoControl = {
    index: 0, // 标记执行过播放的视频数量 index <= count
    totalSeconds: 0, // 广告总秒数 - 单位秒
    count: 0   // 标记要播放的广告视频数量
}

class AdVideo {
    constructor({ h5player, beginningAdLoaded, playerContainer, adSetting, status = 'beginning', cdIntervalId, adLink = '' }) {
        this.h5player = h5player;   // h5player
        this.beginningAdLoaded = beginningAdLoaded; // options.beginningAdLoaded
        this.playerContainer = playerContainer; // options.playerContainer
        this.adSetting = adSetting;  // options.adSetting
        this.status = status; // beginning | ending / 片头还是片尾广告
        this.cdIntervalId = cdIntervalId;   // 倒计时定时器id
        this.adLink = adLink;   // 广告链接
    }
    // 广告播放器初始化
    init() {

        // 播放器对象 - preload(预加载video广告视频对象) | current(当前播放video广告视频对象)
        this.player = {
            preload: null,
            current: null
        }

        if (this.status === 'beginning') {

            AdVideoControl.count = this.adSetting.beginning.source.length;
            AdVideoControl.totalSeconds = this.adSetting.beginning.timeLength;

            if (AdVideoControl.totalSeconds > 0) {
                this.loadAdPlayer('init');
            } else {
                this.status = 'ending';
                return;
            }

        } else if (this.status === 'ending') {

            AdVideoControl.index === 0 ? '' : AdVideoControl.index = 0;

            AdVideoControl.count = this.adSetting.ending.source.length;
            AdVideoControl.totalSeconds = this.adSetting.ending.timeLength;

            if (AdVideoControl.totalSeconds > 0) {
                this.loadAdPlayer('init');
            } else {
                return;
            }
        }
        this.videoEventInit();
        // 更新广告剩余时间
        this.cdIntervalId = setInterval(() => {
            AdVideoControl.totalSeconds--;
            this.updateCountdownText();
            if (AdVideoControl.totalSeconds === 0) {
                clearInterval(this.cdIntervalId);
            }
        }, 1000);
    }
    // 播放器事件初始化 - 因为可能有多个广告播放器
    videoEventInit() {
        this.player.current.onloadeddata = () => {
            this.player.current.oncanplay = () => {
                this.oncanplay();
            };
            // 当媒介已到达结尾时运行的脚本（可发送类似“感谢观看”之类的消息）。
            this.player.current.onended = () => {
                this.onended();
            };
        }
    }
    oncanplay() {
        this.player.current.play();
    }
    onended() {
        // 广告未播完 - 误差初步控制在五秒之内
        if (AdVideoControl.totalSeconds > 5) {
            this.preload2Current();
            // 预加载广告视频
            if (AdVideoControl.count - AdVideoControl.index > 0) {
                this.loadAdPlayer('update');
            }
        }
        // 广告已播完
        else {
            this.playCompleted();
            if (!this.beginningAdLoaded) {
                this.beginningAdLoaded = true;
            }
        }
    }
    updateCountdownText() {
        let $adCountDown = this.playerContainer.find('.ad-countDown');
        $adCountDown.text(AdVideoControl.totalSeconds);
    }
    updateAdLink() {
        let adVideoLink = null;
        if (this.status === 'beginning') {
            adVideoLink = this.adSetting.beginning.link;
        } else if (this.status === 'ending') {
            adVideoLink = this.adSetting.ending.link;
        }
        this.adLink = adVideoLink[$(this.player.current).attr('data-index')];
    }
    // 播放器静音
    muted() {
        if (this.player.current.muted) {
            this.player.current.muted = false;
        } else {
            this.player.current.muted = true;
        }
    }
    // 播放器 声音调节
    volumeChange(volumeValue) {
        this.player.current.volume = volumeValue;
        if (this.player.current.muted) {
            this.muted();
        }
    }
    // 预加载广告转为播放广告
    preload2Current() {
        let current = this.player.current,
            isMuted = this.player.current.muted,
            preVolume = this.player.current.volume;

        $(this.player.preload).attr('data-type', 'current');

        this.player.current = this.player.preload;
        // 播放器音量继承
        this.player.current.muted = isMuted;
        this.player.current.volume = preVolume;
        this.updateAdLink();

        $(current).remove();
        this.loadedVideoPlay();
    }
    loadedVideoPlay() {
        setTimeout(() => {
            this.oncanplay();
            this.player.current.onended = () => {
                this.onended();
            };
        }, 0);
    }
    // 广告播放完执行的操作 
    playCompleted() {
        if (this.status === 'beginning') {
            this.h5player.play();
            this.status = 'ending';
        }
        this.playerContainer.find('.videoContainer').removeClass('h5player-status-adPlayer-playing');
        this.playerContainer.find('.html5-ad-player').remove();
        setTimeout(() => {
            this.player.preload = null;
            this.player.current = null;
        }, 0);
    }
    // 加载广告播放器
    loadAdPlayer(operation) {

        var count = AdVideoControl.count - AdVideoControl.index,
            currentVideo, $currentVideo,
            preloadVideo, $preloadVideo,
            adVideoSource = null,
            adVideoLink = null,
            $adLink = null;

        if (this.status === 'beginning') {
            adVideoSource = this.adSetting.beginning.source;
            adVideoLink = this.adSetting.beginning.link;
        } else if (this.status === 'ending') {
            adVideoSource = this.adSetting.ending.source;
            adVideoLink = this.adSetting.ending.link;
        }

        if (operation === 'init') {
            // 只有一个视频广告
            if (count === 1) {
                initAdVideoStruct(this.playerContainer, 'single');
                $currentVideo = this.playerContainer.find('.html5-ad-player video[data-type="current"]');
                currentVideo = $currentVideo.get(0);

                adHtml5Player(currentVideo, adVideoSource[$currentVideo.attr('data-index')]);
                this.adLink = adVideoLink[$currentVideo.attr('data-index')];
                this.player.current = currentVideo;
            }
            // 大于一个视频广告 
            else if (count > 1) {
                initAdVideoStruct(this.playerContainer, 'normal');
                $currentVideo = this.playerContainer.find('.html5-ad-player video[data-type="current"]');
                currentVideo = $currentVideo.get(0);

                $preloadVideo = this.playerContainer.find('.html5-ad-player video[data-type="preload"]');
                preloadVideo = $preloadVideo.get(0);

                adHtml5Player(currentVideo, adVideoSource[$currentVideo.attr('data-index')]);

                this.adLink = adVideoLink[$currentVideo.attr('data-index')];
                this.player.current = currentVideo;

                adHtml5Player(preloadVideo, adVideoSource[$preloadVideo.attr('data-index')]);

                this.player.preload = preloadVideo;
            }

            $adLink = this.playerContainer.find('.html5-ad-player .html5-ad-link');

            $adLink.on('click', function () {
                window.open(this.adLink);
            });

        } else if (operation === 'update') {

            updateAdVideoStruct(this.playerContainer);

            $preloadVideo = this.playerContainer.find('.html5-ad-player video[data-type="preload"]');
            preloadVideo = $preloadVideo.get(0);

            adHtml5Player(preloadVideo, adVideoSource[$preloadVideo.attr('data-index')]);
            this.player.preload = preloadVideo;
        }
    }
}

/**
 * 初始化广告播放器结构 并返回生成的播放器对象
 * @param {Dom-node} playerContainer 
 * @param {String} createType 
 */
function initAdVideoStruct(playerContainer, createType) {
    var adVideoStr = '<div class="html5-ad-player">';

    switch (createType) {
        case 'single':
            adVideoStr += '<video data-index="0" data-type="current"></video>';
            AdVideoControl.index += 1;
            break;
        case 'normal':
            adVideoStr += '<video data-index="' + AdVideoControl.index + '" data-type="current"></video>';
            AdVideoControl.index += 1;
            adVideoStr += '<video data-index="' + AdVideoControl.index + '" data-type="preload"></video>';
            AdVideoControl.index += 1;
            break;
        default: break;
    }

    adVideoStr += '<div class="html5-ad-countDown"><span class="ad-countDown">' + AdVideoControl.totalSeconds + '</span>';
    adVideoStr += '&nbsp;|&nbsp;秒之后关闭广告<span class="ad-close"></span></div>';
    adVideoStr += '<a class="html5-ad-link" href="javascript:;"></a>';
    adVideoStr += '</div>';

    playerContainer.find('.videoContainer').append(adVideoStr).addClass('h5player-status-adPlayer-playing');
}

/**
 * 预加载下一个广告的dom元素
 * @param {Dom-node} playerContainer 
 */
function updateAdVideoStruct(playerContainer) {

    var $html5AdPlayer = playerContainer.find('.html5-ad-player'),
        newVideoStr = '<video data-index="' + AdVideoControl.index + '" data-type="preload"></video>';

    AdVideoControl.index += 1;
    $html5AdPlayer.append(newVideoStr);
}

/**
 * 为广告短片选择合适的播放器
 * @param {Dom-Node} videoSource 
 * @param {String} videoUrl 
 */
function adHtml5Player(videoSource, videoUrl) {
    switch (getVideoType(videoUrl)) {
        case videoType['flv']:
            new AdFlvPlayer(videoSource, false).create(videoUrl);
            break;
        case videoType['hls']:
            new AdHlsPlayer(videoSource, false).create(videoUrl);
            break;
        default:
            new AdNativePlayer(videoSource, false).create(videoUrl);
            break;
    }
}

export default AdVideo;