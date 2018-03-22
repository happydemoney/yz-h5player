/**
 * 播放器事件和属性定义
 */
import { secondToTime, launchFullScreen, exitFullscreen } from '../utils/util.js';
// barrageClient
import { updateBarrageData } from '../module/barrage/barrageClient.js';

import flvjs from 'flvjs';
import Hls from 'hls';

const flvOptions = {
    //fixAudioTimestampGap: false,
    //autoCleanupSourceBuffer: true,  // 自动清理MSE内存
    enableWorker: true,
    enableStashBuffer: true,
    stashInitialSize: 128   // 减少首桢显示等待时长 默认384
}

class BasePlayer {
    constructor(playerSrc, options) {
        // 播放器源对象
        this.playerSrc = playerSrc;
        // 配置信息
        this.options = options;

        // 全屏状态
        this._fullscreenStatus = false;
        // 用户是否正在寻址，操作视频进度条
        this._seeking = false;
        // 播放器暂停 - 默认false
        this._paused = false;
        // 重载时间节点
        this._reloadCurrentTime = 0;
    }

    get currentTime() {
        if (this.playerSrc) {
            return this.playerSrc.currentTime;
        }
        return 0;
    }

    set currentTime(seconds) {
        if (this.playerSrc) {
            this.playerSrc.currentTime = seconds;
        }
    }

    // 获取当前视频时长
    get duration() {
        return this.playerSrc.duration;
    }

    // 播放器播放
    play() {

        var $videoParent = $(this.playerSrc).parent();
        if (this.playerSrc.paused) {
            this.playerSrc.play();
            this._paused = false;

            $videoParent.addClass('h5player-status-playing').removeClass('h5player-status-paused');
            updateBarrageData({ methodName: 'play', options: this.options });
            updatePauseAdStatus(this.options.playerContainer, 'play');
        }
    }

    // 播放器暂停
    pause() {

        var $videoParent = $(this.playerSrc).parent();
        if (!this.playerSrc.paused) {
            this.playerSrc.pause();
            this._paused = true;

            $videoParent.addClass('h5player-status-paused').removeClass('h5player-status-playing');
            updateBarrageData({ methodName: 'pause', options: this.options });
            updatePauseAdStatus(this.options.playerContainer, 'pause');
        }
    }

    // 播放器静音
    muted() {
        var $videoParent = $(this.playerSrc).parent();
        if (this.playerSrc.muted) {
            this.playerSrc.muted = false;
            $videoParent.removeClass('h5player-status-muted');
        } else {
            this.playerSrc.muted = true;
            $videoParent.addClass('h5player-status-muted');
        }
    }

    // 播放器 声音调节
    volumeChange(volumeValue) {
        this.playerSrc.volume = volumeValue;
        if (this.playerSrc.muted) {
            this.muted();
        }
    }

    // 视频寻址
    seek(seekVal) {
        this.playerSrc.currentTime = seekVal;
    }


    // 快进
    seekForward(forwardVal) {
        var seekVal = seekIncrement,
            curTime = this.playerSrc.currentTime;
        if (forwardVal) {
            seekVal = forwardVal;
        }
        this.playerSrc.currentTime = curTime + seekVal;
    }

    // 快退
    seekBackward(backwardVal) {
        var seekVal = seekIncrement,
            curTime = this.playerSrc.currentTime;
        if (backwardVal) {
            seekVal = backwardVal;
        }
        this.playerSrc.currentTime = curTime - seekVal;
    }

    // 调整视频播放速率
    playbackspeedChange(playbackspeed) {
        this.playerSrc.playbackRate = playbackspeed;
    }

    // 播放器全屏
    fullscreen() {
        var $videoParent = $(this.playerSrc).parents('.videoContainer');
        if (!$videoParent.hasClass('h5player-status-fullScreen')) {
            launchFullScreen($videoParent.get(0));
            $videoParent.addClass('h5player-status-fullScreen');
            this.fullscreenStatus = true;
        } else {
            exitFullscreen();
            $videoParent.removeClass('h5player-status-fullScreen');
            this.fullscreenStatus = false;
        }
    }

    // 当浏览器已加载音频/视频的元数据时
    onloadedmetadata() {
        if (this._reloadCurrentTime > 0) {
            this.playerSrc.currentTime = this._reloadCurrentTime;
            this._reloadCurrentTime = 0;
        }
    }

    // 当浏览器已加载音频/视频的当前帧时
    onloadeddata() {
        this.playerSrc.oncanplay = () => {
            this.oncanplay();
        }
        // 直播状态不进行之后事件绑定
        if (this.options.isLive) {
            return;
        }
        this.initTimeline();
        this.playerSrc.onprogress = () => {
            this.onprogress();
        }
        this.playerSrc.ontimeupdate = () => {
            this.ontimeupdate();
        }
        this.playerSrc.ondurationchange = () => {
            this.ondurationchange();
        }
        this.playerSrc.onended = () => {
            this.onended();
        };
    }

    oncanplay() {
        if (!this.options.adSetting.adActive && !this.options.beginningAdLoaded || this.options.adSetting.beginning.timeLength === 0) {
            this.options.beginningAdLoaded = true;
        }
        if (this.options.autoplay && !this._seeking && this.options.beginningAdLoaded && !this._paused) {
            this.playerSrc.play();
        }
    }

    initTimeline() {
        this.currentTimeChanage();
        this.durationTimeChanage();
    }

    // 视频数据加载进度更新 - buffered
    onprogress(e) {
        var currentTime = this.playerSrc.currentTime,
            buffered = this.playerSrc.buffered,
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
        this.progressChange(param);
    }

    progressChange(oTime) {

        var $progressPlay = this.options.playerContainer.find('.h5player-progress-play'),
            $progressBtnScrubber = this.options.playerContainer.find('.h5player-progress-btn-scrubber'),
            $progressLoad = this.options.playerContainer.find('.h5player-progress-load'),
            duration = this.playerSrc.duration,
            currentTime = oTime.currentTime,
            currentTimePercent = oTime.currentTimePercent,
            loadedTime = oTime.loadedTime,
            isSeek = oTime.isSeek;

        if (currentTimePercent) {
            currentTime = Math.round(currentTimePercent * duration);
            if (isSeek) {
                this.playerSrc.currentTime = currentTime;
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
    }
    // 视频进度更新 - currentTime
    ontimeupdate(e) {
        var currentTime = this.playerSrc.currentTime,
            param = {
                currentTime: currentTime
            };
        this.progressChange(param);
        this.currentTimeChanage();
    }

    // 视频当前播放位置时间变化事件
    currentTimeChanage() {
        var $currentTime = this.options.playerContainer.find('.h5player-ctrl-timeline-container .current-time'),
            currentTime = this.playerSrc.currentTime,
            currentTime = secondToTime(Math.round(currentTime));

        $currentTime.text(currentTime);
    }
    // 视频持续时间变化事件
    durationTimeChanage() {
        var $durationTime = this.options.playerContainer.find('.h5player-ctrl-timeline-container .duration-time'),
            durationTime = this.playerSrc.duration,
            durationTime = secondToTime(Math.round(durationTime));
        $durationTime.text(durationTime);
    }
    ondurationchange() {
        this.durationTimeChanage();
    }
    // 视频播放到结尾
    onended() {
        var $videoParent = $(this.playerSrc).parent();
        if (!this.playerSrc.paused) {
            this.pause();
        }
        $videoParent.addClass('h5player-status-paused').removeClass('h5player-status-playing');
        if (this.options.adSetting.adActive) {
            this.options.adPlayer.init();
        }
    }

    destroy() {

        this.playerCur.destroy();

        this.playerSrc.onloadeddata = null;
        this.playerSrc.onloadedmetadata = null;
        this.playerSrc.oncanplay = null;
        this.playerSrc.onprogress = null;
        this.playerSrc.ontimeupdate = null;
        this.playerSrc.ondurationchange = null;
        this.playerSrc.onended = null;

        this.playerSrc.src = '';
        this.playerSrc.removeAttribute('src');
    }

}

/* 基于flv.js的flvPlayer */
export class FlvPlayer extends BasePlayer {
    constructor(playerSrc, options) {
        super(playerSrc, options);
    }
    // 创建播放器
    create() {

        let playerCur = flvjs.createPlayer({
            type: 'flv',
            isLive: this.options.isLive,
            cors: this.options.isLive,
            url: this.options.videoUrl,
            options: flvOptions
        });
        playerCur.attachMediaElement(this.playerSrc);
        playerCur.load();
        this.playerCur = playerCur;

        this.playerSrc.onloadeddata = () => {
            this.onloadeddata();
        }
        this.playerSrc.onloadedmetadata = () => {
            this.onloadedmetadata();
        }
    }
    // 刷新播放器 
    refresh() {
        this.playerCur.detachMediaElement(this.playerSrc);
        this.playerCur.unload();

        this.playerCur.attachMediaElement(this.playerSrc);
        this.playerCur.load();
    }
    /**
     * 重载播放器 - 用于视频清晰度切换
     * @param {*} videoUrl  - 重载视频的地址
     * @param {*} callback  - 重载回调函数 (currentTime,paused) 时间节点以及视频暂停状态
     */
    reload() {
        let currentTime = this.playerSrc.currentTime,
            paused = this.playerSrc.paused;

        //  重载状态设置
        this._reloadCurrentTime = currentTime;
        this._paused = paused;

        this.playerCur.destroy();

        this.playerCur = flvjs.createPlayer({
            type: 'flv',
            isLive: this.options.isLive,
            cors: this.options.isLive,
            url: this.options.videoUrl,
            options: flvOptions
        });

        this.playerCur.attachMediaElement(this.playerSrc);
        this.playerCur.load();
    }
}

/* 基于hls.js的hlsPlayer */
export class HlsPlayer extends BasePlayer {
    constructor(playerSrc, options) {
        super(playerSrc, options);
    }
    create() {

        this.playerCur = new Hls();

        let thisPlayer = this.playerCur;
        // bind them together
        this.playerCur.attachMedia(this.playerSrc);
        this.playerCur.on(Hls.Events.MEDIA_ATTACHED, function () {
            ///console.log("video and hls.js are now bound together !");
            thisPlayer.loadSource(this.options.videoUrl);
            thisPlayer.on(Hls.Events.MANIFEST_PARSED, function (event, data) {
                //console.log("manifest loaded, found " + data.levels.length + " quality level");
            });
        });

        this.playerCur.on(Hls.Events.ERROR, function (event, data) {
            switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                    showError('error', 'fatal network error encountered, try to recover');
                    thisPlayer.startLoad();
                    break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                    showError('error', 'fatal media error encountered, try to recover');
                    thisPlayer.recoverMediaError();
                    break;
                default:
                    // cannot recover
                    thisPlayer.destroy();
                    break;
            }
        });
    }
    // 刷新播放器 
    refresh() {

        let thisPlayer = this.playerCur;

        // unbind
        this.playerCur.detachMedia();

        // bind them together
        this.playerCur.attachMedia(this.playerSrc);
        this.playerCur.on(Hls.Events.MEDIA_ATTACHED, function () {
            thisPlayer.loadSource(this.options.videoUrl);
            thisPlayer.on(Hls.Events.MANIFEST_PARSED, function (event, data) {
            });
        });

        this.playerCur.on(Hls.Events.ERROR, function (event, data) {
            switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                    showError('error', 'fatal network error encountered, try to recover');
                    thisPlayer.startLoad();
                    break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                    showError('error', 'fatal media error encountered, try to recover');
                    thisPlayer.recoverMediaError();
                    break;
                default:
                    // cannot recover
                    thisPlayer.destroy();
                    break;
            }
        });
    }
    /**
     * 重载播放器 - 用于视频清晰度切换
     * @param {*} videoUrl  - 重载视频的地址
     * @param {*} callback  - 重载回调函数 (currentTime,paused) 时间节点以及视频暂停状态
     */
    reload() {

        let currentTime = this.playerSrcs.currentTime,
            paused = this.playerSrc.paused,
            hls = new Hls();

        //  重载状态设置
        this._reloadCurrentTime = currentTime;
        this._paused = paused;

        this.playerCur.destroy();
        this.playerCur = hls;

        let thisPlayer = this.playerCur;

        // bind them together
        this.playerCur.attachMedia(this.playerSrc);
        this.playerCur.on(Hls.Events.MEDIA_ATTACHED, function () {
            ///console.log("video and hls.js are now bound together !");
            thisPlayer.loadSource(this.options.videoUrl);
            thisPlayer.on(Hls.Events.MANIFEST_PARSED, function (event, data) {
            });
        });

        this.playerCur.on(Hls.Events.ERROR, function (event, data) {
            switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                    showError('error', 'fatal network error encountered, try to recover');
                    thisPlayer.startLoad();
                    break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                    showError('error', 'fatal media error encountered, try to recover');
                    thisPlayer.recoverMediaError();
                    break;
                default:
                    // cannot recover
                    thisPlayer.destroy();
                    break;
            }
        });
    }
}

/* 基于HtmlVideoElement的nativePlayer */
export class NativePlayer extends BasePlayer {
    constructor(playerSrc, options) {
        super(playerSrc, options);
    }
    // 创建播放器
    create() {
        this.playerSrc.src = this.options.videoUrl;
    }
    // 刷新播放器 
    refresh() {
        this.playerSrc.src = '';
        this.playerSrc.src = this.options.videoUrl;
    }
    /**
     * 重载播放器 - 用于视频清晰度切换
     * @param {*} videoUrl  - 重载视频的地址
     * @param {*} callback  - 重载回调函数 (currentTime,paused) 时间节点以及视频暂停状态
     */
    reload() {
        var currentTime = this.playerSrc.currentTime,
            paused = this.playerSrc.paused;

        //  重载状态设置
        this._reloadCurrentTime = currentTime;
        this._paused = paused;

        this.playerSrc.src = '';

        this.playerSrc.src = this.options.videoUrl;
    }
}

function updatePauseAdStatus(playerContainer, methodName) {
    let $pauseAdWrap = playerContainer.find('.h5player-pause-ad-wrap');
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