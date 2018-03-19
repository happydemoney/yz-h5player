// three library
import flvjs from 'flvjs';

const flvOptions = {
    //fixAudioTimestampGap: false,
    //autoCleanupSourceBuffer: true,  // 自动清理MSE内存
    enableWorker: true,
    enableStashBuffer: true,
    stashInitialSize: 128   // 减少首桢显示等待时长 默认384
};
/**
 * BaseFlvPlayer 基础父类
 */
class BaseFlvPlayer {
    constructor(playerSrc, isLive) {
        this.playerSrc = playerSrc;
        this.isLive = isLive;
        if (new.target === BaseFlvPlayer) {
            throw new Error('本类不能实例化');
        }
    }
    // 创建播放器
    create(videoUrl = '') {
        let playerCur = flvjs.createPlayer({
            type: 'flv',
            isLive: this.isLive,
            cors: this.isLive,
            url: videoUrl,
            options: flvOptions
        });
        playerCur.attachMediaElement(this.playerSrc);
        playerCur.load();
        this.playerCur = playerCur;
    }
    destroy() {
        this.playerCur.destroy();
    }
}

// flvPlayer - 默认加载的播放器
export class FlvPlayer extends BaseFlvPlayer {
    constructor(playerSrc, isLive) {
        super(playerSrc, isLive);
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
    reload(videoUrl = '', callback = function (currentTime = 0, paused = false) { }) {
        var currentTime = this.playerSrc.currentTime,
            paused = this.playerSrc.paused;

        //reload_currentTime = currentTime;
        this.destroy();

        this.playerCur = flvjs.createPlayer({
            type: 'flv',
            isLive: this.isLive,
            cors: this.isLive,
            url: videoUrl,
            options: flvOptions
        });

        this.playerCur.attachMediaElement(this.playerSrc);
        this.playerCur.load();

        callback(currentTime, paused);
    }
}

// adFlvPlayer - 广告播放器
export class AdFlvPlayer extends BaseFlvPlayer {
    constructor(playerSrc, isLive) {
        super(playerSrc, isLive);
    }
}