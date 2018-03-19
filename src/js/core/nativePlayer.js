/**
 * 原生播放器
 */
class BaseNativePlayer {
    constructor(playerSrc, isLive) {
        this.playerSrc = playerSrc;
        this.isLive = isLive;
        if (new.target === BaseNativePlayer) {
            throw new Error('本类不能实例化');
        }
    }
    // 创建播放器
    create(videoUrl = '') {
        this.playerSrc.src = videoUrl;
        this.videoUrl = videoUrl;
    }
    destroy() {
        this.playerCur.pause();
    }
}
export class NativePlayer extends BaseNativePlayer {
    constructor(playerSrc, isLive) {
        super(playerSrc, isLive);
    }
    // 刷新播放器 
    refresh() {
        this.playerSrc.src = this.videoUrl;
    }
    /**
     * 重载播放器 - 用于视频清晰度切换
     * @param {*} videoUrl  - 重载视频的地址
     * @param {*} callback  - 重载回调函数 (currentTime,paused) 时间节点以及视频暂停状态
     */
    reload(videoUrl = '', callback = function (currentTime = 0, paused = false) { }) {
        var currentTime = this.playerSrc.currentTime,
            paused = this.playerSrc.paused;

        this.destroy();

        this.playerSrc.src = videoUrl;

        callback(currentTime, paused);
    }
}

export class AdNativePlayer extends BaseNativePlayer {
    constructor(playerSrc, isLive) {
        super(playerSrc, isLive);
    }
}