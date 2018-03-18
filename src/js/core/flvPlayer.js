// three library
import flvjs from 'flvjs';

const flvOptions = {
    //fixAudioTimestampGap: false,
    //autoCleanupSourceBuffer: true,  // 自动清理MSE内存
    enableWorker: true,
    enableStashBuffer: true,
    stashInitialSize: 128   // 减少首桢显示等待时长 默认384
};

// global Object: options

class FlvPlayer {
    Construncor({ playerId, volumeSlidebarId }) {
        this.playerId = playerId;
        this.volumeSlidebarId = volumeSlidebarId;
    }
    // 创建播放器
    create({ isLive, videoUrl } = { isLive: false, videoUrl: '' }) {
        let player_source = document.getElementById(this.playerId),
            volumeSlidebar = document.getElementById(this.volumeSlidebarId),
            player = flvjs.createPlayer({
                type: 'flv',
                isLive: isLive,
                cors: isLive,
                url: videoUrl,
                options: flvOptions
            });

        player.attachMediaElement(player_source);
        player.load();

        this.player = player;

        h5player.source = player_source;
        h5player.playerVolumer = volumeSlidebar;

        player_source.onloadeddata = h5player.onloadeddata;
        player_source.onloadedmetadata = h5player.onloadedmetadata;
    }
    // 刷新播放器 
    refresh() {
        this.player.detachMediaElement(options.player_source);
        this.player.unload();

        this.player.attachMediaElement(options.player_source);
        this.player.load();
    }
    // 重载播放器 - 用于视频清晰度切换
    reload() {
        var currentTime = h5player.source.currentTime,
            paused = h5player.source.paused;

        reload_currentTime = currentTime;
        this.destroy();

        this.player = flvjs.createPlayer({
            type: 'flv',
            isLive: options.isLive,
            cors: options.isLive,
            url: options.videoUrl,
            options: flvOptions
        });

        this.player.attachMediaElement(options.player_source);
        this.player.load();

        //paused ? (h5player.paused = true) : '';
    }
    destroy() {
        this.player.destroy();
    }
}

export default FlvPlayer;