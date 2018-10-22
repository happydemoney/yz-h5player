/**
 * 绑定H5播放控制器的相关dom事件
 */
// 引入常量模块
import { shareIcon, fullscreenHideTimeout } from '../const/constant.js';
// import QRCode from 'qrcode';

// util function
import _ from '../utils/common.js';    // 类似underscore功能函数
import { 
    secondToTime, 
    fullscreenElement, 
    launchFullScreen, 
    exitFullscreen, 
    showError, 
    loadJsCss 
} from '../utils/util.js';

// barrageClient
import { 
    barrageFuncSwitch, 
    barrageSend, 
    barrageInput, 
    barrageSettingSwitch, 
    barrageSettingPanel, 
    barrageWordSetting,
    updateBarrageData
} from '../module/barrage/barrageClient.js';

let Event_timeStamp, // 事件时间戳 - 主要解决chrome下mouseout mouseleave被click意外触发的问题
    timeoutId = undefined,
    isWebkitBrowser = /webkit/gi.test(navigator.userAgent);

export function initHtml5CtrlEvents(options) {

    let playerContainer = options.playerContainer,
        playerCurrent = options.playerCurrent,
        playerSource = playerCurrent.playerSrc,
        isLive = options.isLive;

    // onloadeddata
    playerCurrent.onloadeddata(function () {

        // 1. canplay
        playerSource.oncanplay = () => {
            playerCanplay(options);
        }
        // 直播状态不进行之后事件绑定
        if (isLive) {
            return;
        }

        playerCurrentTimeChanage({ playerCurrent, playerContainer });
        playerDurationTimeChanage({ playerCurrent, playerContainer });

        // 2.onprogress
        playerSource.onprogress = () => {

            playerProgress(playerCurrent, playerContainer);
        }
        // 3.ontimeupdate
        playerSource.ontimeupdate = () => {

            playerTimeupate(playerCurrent, playerContainer);
        }
        // 4.ondurationchange
        playerSource.ondurationchange = () => {
            //this.ondurationchange();
            playerDurationTimeChanage({ playerCurrent, playerContainer })
        }
        // 5.onended
        playerSource.onended = () => {
            playerCurrent.onended(function () {
                playerEnded(options.playerContainer);
            });
        }
    });

    options.playerContainer.on('mouseenter.vp_custom_event mouseleave.vp_custom_event mouseup.vp_custom_event ', '.videoContainer', function (e) {
        videoContainerMouseEvent(this, e.type, e.timeStamp);
    });

    // 全屏状态用户鼠标停留超过2s后关闭控制显示条，移动鼠标立即显示控制条
    options.playerContainer.on('mousemove.vp_custom_event', '.h5player-status-fullScreen', fullScreenMouseMove);

    // 视频暂停
    options.playerContainer.on('click.vp_custom_event', '.h5player-status-playing .h5player-ctrl-bar .btn-play', function (e) {
        e.stopPropagation();
        e.preventDefault();
        e.stopImmediatePropagation();

        playerPause(options);
    });

    // 视频播放
    options.playerContainer.on('click.vp_custom_event', '.h5player-status-paused .h5player-ctrl-bar .btn-play', function () {
        var $videoContainer = options.playerContainer.find('.videoContainer');
        if ($videoContainer.hasClass('h5player-status-adPlayer-playing')) {
            return;
        }

        playerPlay(options);
    });

    // 视频刷新
    options.playerContainer.on('click.vp_custom_event', '.h5player-ctrl-bar .btn-refresh', function () {
        options.playerCurrent.refresh();
    });

    // 全屏
    options.playerContainer.on('click.vp_custom_event', '.h5player-ctrl-bar .btn-fullScreen', function () {

        playerFullscreen(options);
    });

    options.playerContainer.on('click.vp_custom_event', '.h5player-ctrl-bar .btn-volume', function () {

        playerMuted(options);

        // 存在广告播放器且正在播放广告
        if (options.adPlayer && options.adPlayer.totalSeconds > 0) {
            options.adPlayer.muted();
        }
    });

    // 屏蔽视频进度条圆点的拖放事件
    options.playerContainer.on('dragstart.vp_custom_event', '.h5player-live-ctrl .h5player-progress-btn-scrubber', function (e) {
        e.preventDefault();
    });

    // 视频进度条容器 鼠标按下事件 - // 时间进度条鼠标事件
    options.playerContainer.on('mouseenter.vp_custom_event mouseleave.vp_custom_event mouseup.vp_custom_event', '.h5player-live-ctrl .h5player-progress-bar-container', function (e) {
        progressBarContainerMouseEvent(options, e.type, e.timeStamp);
    });

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

        if ($videoContainer.hasClass('h5player-status-adPlayer-playing')) {
            return;
        }
        //options.playerCurrent.progressChange(param);
        playerProgressChange({ param, playerCurrent: options.playerCurrent, playerContainer: options.playerContainer });
        options.playerCurrent.seeking = true;

        playerPause(options);
    });

    function progressBarContainerMouseDown() {

    }

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
                duration = options.playerCurrent.duration,
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
    options.playerContainer.on('click.vp_custom_event', '.h5player-pause-ad-wrap .h5player-pause-ad .close', pauseAdClose);

    // 开关灯/分享相关事件
    // 开关灯 - lightSwitch
    options.playerContainer.on('click.vp_custom_event', '.h5player-panel-control .h5player-panel-light .icon-light', function () {
        var $this = $(this),
            $body = $('body');
        if (!document.getElementById('vp-lightBg')) {
            $body.append('<div id="vp-lightBg" class="vp-lightBg"></div>');
            options.playerContainer.find('.videoContainer').addClass('light-off');
        } else {
            $('#vp-lightBg').remove();
            options.playerContainer.find('.videoContainer').removeClass('light-off');
        }
    });
    // 分享面板开启-关闭 - shareSwitch
    options.playerContainer.on('click.vp_custom_event', '.h5player-panel-control .h5player-panel-share .icon-share', function () {
        var $this = $(this),
            $panelWrap = $this.parents('.h5player-panel-wrap'),
            $shareContent = $panelWrap.find('.h5player-panel-share-content'),
            shareString = '';
        if ($shareContent.length > 0) {
            $shareContent.toggleClass('active');
        } else {
            let shareOptions = options.panelSetting.share.options,
                shareLinks = options.panelSetting.share.links,
                shareCopy = options.panelSetting.share.copy,
                optionsArr = shareOptions.split('|'),
                linksArr = shareLinks.split('|'),
                copyArr = shareCopy.split('|'),
                copyLink = '',
                copyHtml = '',
                index = 0,
                now = _.now();

            if (linksArr.length > 0) {
                copyLink = copyArr[0].replace(/\$#\$/g, '&');
                copyHtml = copyArr[1].replace(/\$#\$/g, '&');
            } else {
                showError('warn', 'panelSetting.share.copy is null.');
            }

            shareString += '<div class="h5player-panel-share-content active"><span class="close"></span>';

            // 一键分享字符串部分
            shareString += '<dl class="share-img"><dt>一键分享</dt>';
            optionsArr.forEach(function (element) {
                if (element === "1") {
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
            shareString += '<dl class="share-qrcode"><dt>扫码轻松分享</dt><dd id="qrcode' + now + '"></dd></dl>';

            shareString += '</div>';
            $panelWrap.append(shareString);

            if( !window.QRCode ){
                loadJsCss( 'lib/qrcode.js' , () => {
                    // qrcode - 设置参数方式 - base on qrcode.js
                    var qrcode = new QRCode('qrcode' + now, {
                        text: copyLink,
                        width: 90,
                        height: 90,
                        colorDark: '#000000',
                        colorLight: '#ffffff',
                        correctLevel: QRCode.CorrectLevel.H
                    });
                } );
            }else{
                // qrcode - 设置参数方式 - base on qrcode.js
                var qrcode = new QRCode('qrcode' + now, {
                    text: copyLink,
                    width: 90,
                    height: 90,
                    colorDark: '#000000',
                    colorLight: '#ffffff',
                    correctLevel: QRCode.CorrectLevel.H
                });
            }
        }
    });
    // 隐藏分享面板 - sharePanelHide
    options.playerContainer.on('click.vp_custom_event', '.h5player-panel-share-content .close', function () {
        var $this = $(this),
            $thisParent = $this.parent();
        $thisParent.removeClass('active');
    });
    // 复制分享链接或html代码 - shareCopy
    options.playerContainer.on('click.vp_custom_event', '.h5player-panel-share-content .share-copy dd', function () {
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
                    showError('warn', '复制失败');
                }
            } catch (err) {
                //fail info
                showError('error', '复制异常');
            }
        }
    });

    // 弹幕相关事件 
    // 弹幕开关处理程序
    options.playerContainer.on('click.vp_custom_event', '.h5player-ctrl-bar .btn-barrage', function () {
        barrageFuncSwitch(this, options);
    });
    options.playerContainer.on('click.vp_custom_event', '.h5player-ctrl-bar-barrage-control .barrage-send', function () {
        barrageSend(this, options, options.playerCurrent.currentTime);
    });

    options.playerContainer.on('keydown.vp_custom_event', '.h5player-ctrl-bar-barrage-control .barrage-input', barrageInput);
    // 弹幕字体设置面板控制出现和隐藏
    options.playerContainer.on('click.vp_custom_event', '.h5player-ctrl-bar-barrage-control .btn-barrage-setting', barrageSettingSwitch);
    options.playerContainer.on('mouseenter.vp_custom_event mouseleave.vp_custom_event mouseup.vp_custom_event', '.h5player-ctrl-bar-barrage-control .barrage-word-setting', barrageSettingPanel);

    // 弹幕字体大小/颜色设置
    options.playerContainer.on('click.vp_custom_event', '.barrage-word-setting .word-font li,.barrage-word-setting .word-color li', function () {
        barrageWordSetting(this, options.barrageSetting);
    });

    // 视频清晰度相关事件处理
    //options.playerContainer.on('click.vp_custom_event', '.h5player-ctrl-bar .btn-kbps-text', definitionSwicth);
    options.playerContainer.on('click.vp_custom_event', '.h5player-ctrl-bar .h5player-ctrl-bar-kbps-change', function () {
        definitionChange(this, options);
    });

    // document mousemove/mouseup 
    $(document).on('mousemove.vp_custom_event', function (e) {
        // document event
        if (options && options.playerCurrent && options.playerCurrent.seeking) {
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

            //options.playerCurrent.progressChange(param);
            playerProgressChange({ param, playerCurrent: options.playerCurrent, playerContainer: options.playerContainer });
        }
    });
    $(document).on('mouseup.vp_custom_event', function (e) {

        if (options && options.playerCurrent && options.playerCurrent.seeking) {
            options.playerCurrent.seeking = false;
            playerPlay(options);
        }
    });
    $(document).on('webkitfullscreenchange.vp_custom_event mozfullscreenchange.vp_custom_event MSFullscreenChange.vp_custom_event fullscreenchange.vp_custom_event', function () {

        let $videoContainer = options.playerContainer.find('.videoContainer ');
        if (options.playerCurrent.fullscreenStatus && $videoContainer.hasClass('h5player-status-fullScreen') && !fullscreenElement()) {
            options.playerCurrent.fullscreenStatus = false;
            $videoContainer.removeClass('h5player-status-fullScreen');
        }
    });

    // input range - input事件在IE10尚不支持，可以使用change替代
    options.playerContainer.on('input.vp_custom_event change.vp_custom_event', '.h5player-ctrl-bar .h5player-ctrl-bar-volume-slidebar', function () {

        let $this = $(this),
            thisValue = $this.val();
        options.playerCurrent.volumeChange(thisValue / 100);
        // 存在广告播放器
        if (options.adPlayer && options.adPlayer.totalSeconds > 0) {
            options.adPlayer.volumeChange(thisValue / 100);
        }
        if (isWebkitBrowser) {
            $this.attr('data-process', thisValue);
        }
    });
}

function videoContainerMouseEvent(element, eType, eTimeStamp) {
    var $this = $(element);
    switch (eType) {
        case 'mouseup':
            Event_timeStamp = eTimeStamp;
            break;
        case 'mouseenter':
            $this.hasClass('h5player-status-controls-in') ? '' : $this.addClass('h5player-status-controls-in');
            break;
        case 'mouseleave':
            if (!Event_timeStamp || (eTimeStamp - Event_timeStamp > 10)) {
                $this.hasClass('h5player-status-controls-in') ? $this.removeClass('h5player-status-controls-in') : '';
            }
            break;
    }
}
function fullScreenMouseMove() {
    let $this = $(this);
    if (timeoutId) {
        clearTimeout(timeoutId);
        $this.hasClass('h5player-status-controls-in') ? '' : $this.addClass('h5player-status-controls-in');
    }
    timeoutId = setTimeout(function () {
        $this.hasClass('h5player-status-controls-in') ? $this.removeClass('h5player-status-controls-in') : '';
    }, fullscreenHideTimeout);
}
export function playerPause(options) {

    if (!options.playerCurrent.playerSrc.paused) {
        var $liveContent = options.playerContainer.find('.liveContent');
        $liveContent.addClass('h5player-status-paused').removeClass('h5player-status-playing');
        updateBarrageData({ methodName: 'pause', options });
        updatePauseAdStatus(options.playerContainer, 'pause');
        options.playerCurrent.pause();
    }
}

// canplay
function playerCanplay(options) {

    if (!options.adSetting.adActive && !options.beginningAdLoaded || options.adSetting.beginning.timeLength === 0) {
        options.beginningAdLoaded = true;
    }
    if (options.autoplay && !options.playerCurrent.seeking && options.beginningAdLoaded && !options.playerCurrent._paused) {
        playerPlay(options);
    }

}
// 视频数据加载进度更新 - buffered
function playerProgress(playerCurrent, playerContainer) {
    let currentTime = playerCurrent.currentTime,
        buffered = playerCurrent.buffered,
        nearLoadedTime = 0,
        param = {
            loadedTime: nearLoadedTime
        };
    for (var i = 0; i < buffered.length; i++) {
        if (buffered.end(i) >= currentTime && buffered.start(i) <= currentTime) {
            nearLoadedTime = buffered.end(i);
        } else {
            nearLoadedTime = currentTime + 1;
        }
    }
    param.loadedTime = nearLoadedTime;
    playerProgressChange({ param, playerCurrent, playerContainer });
}

// 视频进度更新 - currentTime
function playerTimeupate(playerCurrent, playerContainer) {
    let param = { currentTime: playerCurrent.currentTime };
    playerProgressChange({ param, playerCurrent, playerContainer });
    playerCurrentTimeChanage({ playerCurrent, playerContainer });
}

// 进度条变化触发
function playerProgressChange({ param, playerCurrent, playerContainer }) {

    let $progressPlay = playerContainer.find('.h5player-progress-play'),
        $progressBtnScrubber = playerContainer.find('.h5player-progress-btn-scrubber'),
        $progressLoad = playerContainer.find('.h5player-progress-load'),

        loadedTime = param.loadedTime,
        isSeek = param.isSeek,
        currentTimePercent = param.currentTimePercent,
        currentTime = param.currentTime,

        duration = playerCurrent.duration;

    if (currentTimePercent) {
        currentTime = Math.round(currentTimePercent * duration);
        if (isSeek) {
            playerCurrent.currentTime = currentTime;
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

// 视频当前播放位置时间变化事件
function playerCurrentTimeChanage({ playerCurrent, playerContainer }) {

    let $currentTime = playerContainer.find('.h5player-ctrl-timeline-container .current-time'),
        currentTime = playerCurrent.currentTime,
        currentTimeText = secondToTime(Math.round(currentTime));

    $currentTime.text(currentTimeText);
}
// 视频持续时间变化事件
function playerDurationTimeChanage({ playerCurrent, playerContainer }) {

    let $durationTime = playerContainer.find('.h5player-ctrl-timeline-container .duration-time'),
        durationTime = playerCurrent.duration,
        durationTimeText = secondToTime(Math.round(durationTime));

    $durationTime.text(durationTimeText);
}
// 视频结束
function playerEnded(playerContainer) {
    var $liveContent = playerContainer.find('.liveContent');
    $liveContent.addClass('h5player-status-paused').removeClass('h5player-status-playing');
}

export function playerPlay(options) {

    if (options.playerCurrent.playerSrc.paused) {
        var $liveContent = options.playerContainer.find('.liveContent');
        $liveContent.addClass('h5player-status-playing').removeClass('h5player-status-paused');
        updateBarrageData({ methodName: 'play', options });
        updatePauseAdStatus(options.playerContainer, 'play');
        options.playerCurrent.play();
    }
}

function playerFullscreen(options) {

    var $videoContainer = options.playerContainer.find('.videoContainer');
    if (!$videoContainer.hasClass('h5player-status-fullScreen')) {
        launchFullScreen($videoContainer.get(0));
        $videoContainer.addClass('h5player-status-fullScreen');
        options.playerCurrent.fullscreenStatus = true;
    } else {
        exitFullscreen();
        $videoContainer.removeClass('h5player-status-fullScreen');
        options.playerCurrent.fullscreenStatus = false;
    }
}

export function playerMuted(options) {

    var $liveContent = options.playerContainer.find('.liveContent');
    if (options.playerCurrent.muted) {
        options.playerCurrent.muted = false;
        $liveContent.removeClass('h5player-status-muted');
    } else {
        options.playerCurrent.muted = true;
        $liveContent.addClass('h5player-status-muted');
    }
}

function progressBarContainerMouseEvent(options, eType, eTimeStamp) {
    var $videoContainer = options.playerContainer.find('.videoContainer');
    switch (eType) {
        case 'mouseup':
            Event_timeStamp = eTimeStamp;
            break;
        case 'mouseenter':
            $videoContainer.hasClass('h5player-status-progress-hover') ? '' : $videoContainer.addClass('h5player-status-progress-hover');
            break;
        case 'mouseleave':
            if (!Event_timeStamp || (eTimeStamp - Event_timeStamp > 10)) {
                $videoContainer.hasClass('h5player-status-progress-hover') ? $videoContainer.removeClass('h5player-status-progress-hover') : '';
            }
            break;
    }
}

function pauseAdClose() {
    var $this = $(this),
        $pauseAdWrap = $this.parents('.h5player-pause-ad-wrap');

    $pauseAdWrap.removeClass('active');
}

// 清晰度切换
function definitionChange(element, options) {

    let $this = $(element);

    if ($this.hasClass('h5player-ctrl-bar-kbps-current')) {
        return;
    } else {
        let $thisParents = $this.parents('.btn-kbps'),
            $kbpsText = $thisParents.find('.btn-kbps-text'),
            $current = $this.siblings('.h5player-ctrl-bar-kbps-current'),
            newDefinitionText = $this.attr('data-res');

        $thisParents.addClass('h5player-ctrl-bar-kbps-panel-hide');

        function _loadAfterFunc() {
            $current.removeClass('h5player-ctrl-bar-kbps-current');
            $this.addClass('h5player-ctrl-bar-kbps-current');
            $kbpsText.text(newDefinitionText).attr('data-res', newDefinitionText);
        }
        reloadDefinition(options, newDefinitionText, _loadAfterFunc);

        // 暂时 - 清晰度切换完成执行
        setTimeout(function () {
            $thisParents.removeClass('h5player-ctrl-bar-kbps-panel-hide');
        }, 1000);

    }
}

/**
 * 重新加载清晰度
 * @param {String} newDefinitionText 
 * @param {function} callback 
 */
function reloadDefinition(options, newDefinitionText, callback) {

    var allRate = options.definitionSetting.allRate;

    for (var i = 0; i < allRate.length; i++) {
        if (newDefinitionText === allRate[i].text) {
            options.videoUrl = allRate[i].url;
            break;
        }
    }

    options.playerCurrent.reload();
    callback();
}

/**
 * 更新暂停广告显示和隐藏
 * @param {*} playerContainer 
 * @param {*} methodName 
 */
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

// Production steps of ECMA-262, Edition 5, 15.4.4.18
// Reference: http://es5.github.io/#x15.4.4.18
if (!Array.prototype.forEach) {

    Array.prototype.forEach = function (callback, thisArg) {

        var T, k;

        if (this == null) {
            throw new TypeError(' this is null or not defined');
        }

        // 1. Let O be the result of calling toObject() passing the
        // |this| value as the argument.
        var O = Object(this);

        // 2. Let lenValue be the result of calling the Get() internal
        // method of O with the argument "length".
        // 3. Let len be toUint32(lenValue).
        var len = O.length >>> 0;

        // 4. If isCallable(callback) is false, throw a TypeError exception. 
        // See: http://es5.github.com/#x9.11
        if (typeof callback !== "function") {
            throw new TypeError(callback + ' is not a function');
        }

        // 5. If thisArg was supplied, let T be thisArg; else let
        // T be undefined.
        if (arguments.length > 1) {
            T = thisArg;
        }

        // 6. Let k be 0
        k = 0;

        // 7. Repeat, while k < len
        while (k < len) {

            var kValue;

            // a. Let Pk be ToString(k).
            //    This is implicit for LHS operands of the in operator
            // b. Let kPresent be the result of calling the HasProperty
            //    internal method of O with argument Pk.
            //    This step can be combined with c
            // c. If kPresent is true, then
            if (k in O) {

                // i. Let kValue be the result of calling the Get internal
                // method of O with argument Pk.
                kValue = O[k];

                // ii. Call the Call internal method of callback with T as
                // the this value and argument list containing kValue, k, and O.
                callback.call(T, kValue, k, O);
            }
            // d. Increase k by 1.
            k++;
        }
        // 8. return undefined
    };
}