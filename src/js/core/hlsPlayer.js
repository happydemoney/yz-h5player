// three library
import Hls from 'hls';

class BaseHlsPlayer {
    constructor(playerSrc, isLive) {
        this.playerSrc = playerSrc;
        this.isLive = isLive;
        if (new.target === BaseHlsPlayer) {
            throw new Error('本类不能实例化');
        }
    }
    create(videoUrl = '') {

        this.playerCur = new Hls();
        this.videoUrl = videoUrl;

        let thisPlayer = this.playerCur;
        // bind them together
        this.playerCur.attachMedia(this.playerSrc);
        this.playerCur.on(Hls.Events.MEDIA_ATTACHED, function () {
            ///console.log("video and hls.js are now bound together !");
            thisPlayer.loadSource(videoUrl);
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
    destroy() {
        this.playerCur.destroy();
    }
}

export class HlsPlayer extends BaseHlsPlayer {
    constructor(playerSrc, isLive) {
        super(playerSrc, isLive);
    }
    // 刷新播放器 
    refresh() {

        let thisPlayer = this.playerCur;

        // unbind
        this.playerCur.detachMedia();

        // bind them together
        this.playerCur.attachMedia(this.playerSrc);
        this.playerCur.on(Hls.Events.MEDIA_ATTACHED, function () {
            thisPlayer.loadSource(this.videoUrl);
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
    reload(videoUrl = '', callback = function (currentTime = 0, paused = false) { }) {

        let currentTime = this.playerSrcs.currentTime,
            paused = this.playerSrc.paused,
            hls = new Hls();

        //reload_currentTime = currentTime;
        this.destroy();
        this.playerCur = hls;

        let thisPlayer = this.playerCur;

        // bind them together
        this.playerCur.attachMedia(this.playerSrc);
        this.playerCur.on(Hls.Events.MEDIA_ATTACHED, function () {
            ///console.log("video and hls.js are now bound together !");
            thisPlayer.loadSource(videoUrl);
            thisPlayer.on(Hls.Events.MANIFEST_PARSED, function (event, data) {
                //paused ? (h5player.paused = true) : '';
                callback(currentTime, paused);
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

export class AdHlsPlayer extends BaseHlsPlayer {
    constructor(playerSrc, isLive) {
        super(playerSrc, isLive);
    }
}