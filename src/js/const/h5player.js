// 自定义html5播放控制器相关 - 事件处理
const h5player = {
    // h5player源对象
    source: null,
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
        var $videoParent = $(this.source).parent();
        if (this.source.paused) {
            this.source.play();
            h5player.paused = false;
            $videoParent.addClass('h5player-status-playing').removeClass('h5player-status-paused');

            updateBarrageData('play');
            updatePauseAdsStatus('play');
        }
    },
    // 播放器暂停
    pause: function () {
        var $videoParent = $(this.source).parent();
        if (!this.source.paused) {
            this.source.pause();
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
        var $videoParent = $(this.source).parent();
        if (this.source.muted) {
            this.source.muted = false;
            $videoParent.removeClass('h5player-status-muted');
        } else {
            this.source.muted = true;
            $videoParent.addClass('h5player-status-muted');
        }
    },
    // 播放器 声音调节
    volumeChange: function (volumeValue) {
        this.source.volume = volumeValue;
        if (this.source.muted) {
            this.muted();
        }
    },
    // 视频寻址
    seek: function (seekVal) {
        this.source.currentTime = seekVal;
    },
    // 快进
    seekForward: function (forwardVal) {
        var seekVal = seekIncrement,
            curTime = this.source.currentTime;
        if (forwardVal) {
            seekVal = forwardVal;
        }
        this.source.currentTime = curTime + seekVal;
    },
    // 快退
    seekBackward: function (backwardVal) {
        var seekVal = seekIncrement,
            curTime = this.source.currentTime;
        if (backwardVal) {
            seekVal = backwardVal;
        }
        this.source.currentTime = curTime - seekVal;
    },
    playbackspeedChange: function (playbackspeed) {
        this.source.playbackRate = playbackspeed;
    },
    // 播放器全屏
    fullscreen: function () {
        var $videoParent = $(this.source).parents('.videoContainer');
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
            this.source.currentTime = reload_currentTime;
            reload_currentTime = 0;
        }
    },
    // 当浏览器已加载音频/视频的当前帧时
    onloadeddata: function () {
        this.source.oncanplay = h5player.oncanplay;
        // 直播状态不进行之后事件绑定
        if (options.isLive) {
            return;
        }
        h5player.initTimeline();
        this.source.onprogress = h5player.onprogress;
        this.source.ontimeupdate = h5player.ontimeupdate;
        this.source.ondurationchange = h5player.ondurationchange;
        this.source.onended = h5player.onended;
    },
    oncanplay: function () {
        if (!options.adsSetting.adsActive && !beginningAdsLoaded || options.adsSetting.beginning.timeLength === 0) {
            beginningAdsLoaded = true;
        }
        if (options.autoplay && !h5player.seeking && beginningAdsLoaded && !h5player.paused) {
            this.source.play();
        }
    },
    // 视频数据加载进度更新 - buffered
    onprogress: function (e) {
        var currentTime = this.source.currentTime,
            buffered = this.source.buffered,
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
            duration = this.source.duration,
            currentTime = oTime.currentTime,
            currentTimePercent = oTime.currentTimePercent,
            loadedTime = oTime.loadedTime,
            isSeek = oTime.isSeek;

        if (currentTimePercent) {
            currentTime = Math.round(currentTimePercent * duration);
            if (isSeek) {
                this.source.currentTime = currentTime;
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
        var currentTime = this.source.currentTime,
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
            currentTime = this.source.currentTime,
            currentTime = secondToTime(Math.round(currentTime));

        $currentTime.text(currentTime);
    },
    // 视频持续时间变化事件
    durationTimeChanage: function () {
        var $durationTime = options.playerContainer.find('.h5player-ctrl-timeline-container .duration-time'),
            durationTime = this.source.duration,
            durationTime = secondToTime(Math.round(durationTime));
        $durationTime.text(durationTime);
    },
    ondurationchange: function () {
        h5player.durationTimeChanage();
    },
    // 视频播放到结尾
    onended: function () {
        var $videoParent = $(this.source).parent();
        if (!this.source.paused) {
            this.source.pause();
        }
        $videoParent.addClass('h5player-status-paused').removeClass('h5player-status-playing');
        if (options.adsSetting.adsActive) {
            adsPlayer.init();
        }
    }
};

export default h5player;