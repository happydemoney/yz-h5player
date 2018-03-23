/**
 * 播放器事件和属性定义
 */
import { secondToTime } from '../utils/util.js';
import { seekIncrement } from '../const/constant.js';

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

    get fullscreenStatus() {
        return this._fullscreenStatus;
    }

    set fullscreenStatus(status) {
        this._fullscreenStatus = status;
    }

    get seeking() {
        return this._seeking;
    }

    set seeking(seeking) {
        this._seeking = seeking;
    }

    // 播放器播放
    play() {

        if (this.playerSrc.paused) {
            this.playerSrc.play();
            this._paused = false;
        }
    }

    // 播放器暂停
    pause() {
        if (!this.playerSrc.paused) {

            this.playerSrc.pause();
            this._paused = true;
        }
    }

    get muted() {
        return this.playerSrc.muted;
    }

    set muted(muted) {
        this.playerSrc.muted = muted;
    }

    // 播放器 声音调节
    volumeChange(volumeValue) {
        this.playerSrc.volume = volumeValue;
        if (this.muted) {
            this.muted = false;
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

    // 当浏览器已加载音频/视频的元数据时
    onloadedmetadata() {
        if (this._reloadCurrentTime > 0) {
            this.currentTime = this._reloadCurrentTime;
            this._reloadCurrentTime = 0;
        }
    }

    // 当浏览器已加载音频/视频的当前帧时
    onloadeddata(callback = function () { }) {
        callback();
        this.playerSrc.onended = () => {
            this.onended();
        };
    }


    get buffered() {
        return this.playerSrc.buffered;
    }

    // 视频播放到结尾
    onended(callback = function () { }) {

        if (!this.playerSrc.paused) {
            this.pause();
        }

        if (this.options.adSetting.adActive) {
            this.options.adPlayer.init();
        }
        callback();
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
