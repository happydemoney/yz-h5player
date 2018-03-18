/**
 * 绑定H5播放控制器的相关dom事件
 */
export function initHtml5CtrlEvents(options) {

    let timeoutId = undefined;

    options.playerContainer.on('mouseenter.vp_custom_event mouseleave.vp_custom_event mouseup.vp_custom_event ', '.videoContainer', videoContainerEvents);
    // 全屏状态用户鼠标停留超过2s后关闭控制显示条，移动鼠标立即显示控制条
    options.playerContainer.on('mousemove.vp_custom_event', '.h5player-status-fullScreen', function () {
        let $this = $(this);
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
        let $this = $(this),
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

        let throttled = _.throttle(screenshotsShow, options.screenshotsSetting.timeout),
            $liveContent = options.playerContainer.find('.liveContent');

        // 阻止进度条圆点事件冒泡
        options.playerContainer.on('mousemove.vp_custom_event', '.h5player-live-ctrl .h5player-progress-btn-scrubber', function (e) {
            e.stopPropagation();
        });
        // 视频进度条容器 鼠标移动事件
        options.playerContainer.on('mousemove.vp_custom_event', '.h5player-live-ctrl .h5player-progress-bar-container', function (e) {

            let contentWidth = $(this).width(),
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
                let layer = '<div class="h5player-screenshots-wrap"><img alt="screenshots-image" /><span></span></div>';
                $liveContent.append(layer);

                $wrap = $liveContent.find('.h5player-screenshots-wrap');
            } else {
                if ($wrap.hasClass('hide-screenshots')) {
                    $wrap.removeClass('hide-screenshots');
                }
            }
            _updateScreenshots();
            function _updateScreenshots() {
                let $img = $wrap.find('img'),
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
            let $wrap = $liveContent.find('.h5player-screenshots-wrap');
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
        let $this = $(this),
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