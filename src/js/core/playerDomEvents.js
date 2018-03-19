/**
 * 绑定H5播放控制器的相关dom事件
 */
// 引入常量模块
import { shareIcon, barrageWordStyle } from '../const/constant.js';
import QRCode from 'qrcode';

// util function
import _ from '../utils/common.js';    // 类似underscore功能函数
import { secondToTime, fullscreenElement, showError } from '../utils/util.js';

let Event_timeStamp; // 事件时间戳 - 主要解决chrome下mouseout mouseleave被click意外触发的问题

function initHtml5CtrlEvents(options, h5player) {
    let timeoutId = undefined,
        isWebkitBrowser = /webkit/gi.test(navigator.userAgent);

    options.playerContainer.on('mouseenter.vp_custom_event mouseleave.vp_custom_event mouseup.vp_custom_event ', '.videoContainer', function (e) {
        var $this = $(this);
        switch (e.type) {
            case 'mouseup':
                Event_timeStamp = e.timeStamp;
                break;
            case 'mouseenter':
                $this.hasClass('h5player-status-controls-in') ? '' : $this.addClass('h5player-status-controls-in');
                break;
            case 'mouseleave':
                if (!Event_timeStamp || (e.timeStamp - Event_timeStamp > 10)) {
                    $this.hasClass('h5player-status-controls-in') ? $this.removeClass('h5player-status-controls-in') : '';
                }
                break;
        }
    });
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
    // 视频进度条容器 鼠标按下事件 - // 时间进度条鼠标事件
    options.playerContainer.on('mouseenter.vp_custom_event mouseleave.vp_custom_event mouseup.vp_custom_event', '.h5player-live-ctrl .h5player-progress-bar-container',
        function progressBarContainerMouse(e) {
            var $videoContainer = options.playerContainer.find('.videoContainer');
            switch (e.type) {
                case 'mouseup':
                    Event_timeStamp = e.timeStamp;
                    break;
                case 'mouseenter':
                    $videoContainer.hasClass('h5player-status-progress-hover') ? '' : $videoContainer.addClass('h5player-status-progress-hover');
                    break;
                case 'mouseleave':
                    if (!Event_timeStamp || (e.timeStamp - Event_timeStamp > 10)) {
                        $videoContainer.hasClass('h5player-status-progress-hover') ? $videoContainer.removeClass('h5player-status-progress-hover') : '';
                    }
                    break;
            }
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
                duration = h5player.getDuration(),
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
                    //console.log(linksArr[index]);
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
    // 弹幕开关处理程序 - barrageFuncSwitch
    options.playerContainer.on('click.vp_custom_event', '.h5player-ctrl-bar .btn-barrage', function () {
        var $this = $(this),
            $thisParent = $this.parent(), // .h5player-ctrl-bar-barrage-container
            $parentLiveContent = $this.parents('.liveContent'),
            $h5playerBarrageWrap = $parentLiveContent.find('.h5player-barrage-wrap'),
            $barrageControl = $thisParent.find('.h5player-ctrl-bar-barrage-control'),
            $videoContainer = options.playerContainer.find('.videoContainer');

        if ($videoContainer.hasClass('h5player-status-adsPlayer-playing') || $this.hasClass('disabled')) {
            return;
        }

        if (!$this.hasClass('active')) {
            initBarrageStyle();
            $barrageControl.addClass('active');
            $this.addClass('active');

            if (barrageControl.timeoutTime > 0) {
                $this.addClass('disabled');
                // 延时 barrageControl.timeoutTime 开启弹幕切换
                setTimeout(function () {
                    $this.removeClass('disabled');
                }, barrageControl.timeoutTime);
            }

            barrageControl.isOpen = true;
            updateBarrageData('open');
        } else {
            $barrageControl.removeClass('active');
            $this.removeClass('active');

            if (barrageControl.timeoutTime > 0) {
                $this.addClass('disabled');
                // 延时 barrageControl.timeoutTime 开启弹幕切换
                setTimeout(function () {
                    $this.removeClass('disabled');
                }, barrageControl.timeoutTime);
            }

            $h5playerBarrageWrap.empty();
            barrageControl.isOpen = false;
            updateBarrageData('close');
        }
    });
    // barrageSend
    options.playerContainer.on('click.vp_custom_event', '.h5player-ctrl-bar-barrage-control .barrage-send', barrageSend);
    // barrageInput
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
    $(document).on('mousemove.vp_custom_event', function (e) {
        // document event
        if (h5player.seeking) {
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

            h5player.progressChange(param);
        }
    });
    $(document).on('mouseup.vp_custom_event', function (e) {
        if (h5player.seeking) {
            h5player.seeking = false;
            h5player.play();
        }
    });
    $(document).on('webkitfullscreenchange.vp_custom_event mozfullscreenchange.vp_custom_event MSFullscreenChange.vp_custom_event fullscreenchange.vp_custom_event', function () {
        let $videoContainer = options.playerContainer.find('.videoContainer ');
        if (h5player.fullscreenStatus && $videoContainer.hasClass('h5player-status-fullScreen') && !fullscreenElement()) {
            h5player.fullscreenStatus = false;
            $videoContainer.removeClass('h5player-status-fullScreen');
        }
    });

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

function pauseAdsClose() {
    var $this = $(this),
        $pauseAdsWrap = $this.parents('.h5player-pause-ads-wrap');

    $pauseAdsWrap.removeClass('active');
}

//  初始化弹幕动画样式
function initBarrageStyle() {

    if (!barrageControl.isInited) {
        barrageControl.isInited = true;

        // 弹幕动画完成 - 清除事件
        // Chrome, Safari 和 Opera 代码 - webkitAnimationEnd
        // 标准写法 - animationend
        options.barrageContainer.on('animationend webkitAnimationEnd', '.h5player-barrage-item', function () {
            $(this).remove();
        });

        let barrageContainer_width = options.barrageContainer.width();
        let newStyle = '<style>';

        // 通用
        newStyle += '@keyframes barrage {\
                                0% {\
                                    visibility: visible;\
                                    transform: translateX('+ barrageContainer_width + 'px);\
                                }\
                                100% {\
                                    visibility: visible;\
                                    transform: translateX(-100%);\
                                }\
                            }';

        // 兼容火狐浏览器    
        newStyle += '@-moz-keyframes barrage {\
                                0% {\
                                    visibility: visible;\
                                    -moz-transform: translateX('+ barrageContainer_width + 'px);\
                                }\
                                100% {\
                                    visibility: visible;\
                                    -moz-transform: translateX(-100%);\
                                }\
                            }';
        // 早期版本webkit内核浏览器
        newStyle += '@-webkit-keyframes barrage {\
                                0% {\
                                    visibility: visible;\
                                    -webkit-transform: translateX('+ barrageContainer_width + 'px);\
                                }\
                                100% {\
                                    visibility: visible;\
                                    -webkit-transform: translateX(-100%);\
                                }\
                            }';
        // opera
        newStyle += '@-o-keyframes barrage {\
                                0% {\
                                    visibility: visible;\
                                    -o-transform: translateX('+ barrageContainer_width + 'px);\
                                }\
                                100% {\
                                    visibility: visible;\
                                    -o-transform: translateX(-100%);\
                                }\
                            }';

        newStyle += '</style>';
        $(newStyle).appendTo('head');
    }
}

// 发送弹幕
function barrageSend() {
    var $this = $(this),
        $barrageInput = $this.siblings('.barrage-input'),
        barrageInfo = $barrageInput.val(),
        barrageMsg;

    if (!barrageInfo) {
        alert('请输入弹幕信息~');
    } else {

        var wordFont = barrageWordStyle.font[options.barrageSetting.wordStyle.font],
            wordColor = barrageWordStyle.color[options.barrageSetting.wordStyle.color];

        barrageMsg = {
            time: Math.round(options.player_source.currentTime),
            content: barrageInfo,
            font: wordFont,
            color: wordColor
        };

        options.barrageSetting.clientObject.SendMsgToServer(barrageMsg);
        options.barrageContainer.append(createBarrageDom(barrageMsg));
        $barrageInput.val('');
    }
}
//  *  更新弹幕页面展示效果
function updateBarrageDisplay(method) {
    if (method == 'clean') {
        options.barrageContainer.empty();
    } else if (!barrageControl.isMonitored) {

        barrageControl.isMonitored = true;
        options.barrageSetting.clientObject.messageMonitor(function (receiveMsg) {

            if (receiveMsg.length > 0) {
                for (var i = 0; i < receiveMsg.length; i++) {
                    options.barrageContainer.append(createBarrageDom(receiveMsg[i]));
                }
            }

        });
    }
}

// 创建弹幕dom节点
function createBarrageDom(barrageData) {
    var showMsg = '';
    // 直播
    if (options.isLive) {
        if (typeof barrageData.content === 'object') {
            showMsg = barrageData.content.ip + ' : ' + barrageData.content.msg
        } else {
            return;
        }
    } else {
        showMsg = barrageData.content;
    }

    var barrageItem = '<div class="h5player-barrage-item animation_barrage" style="' +
        'color:' + barrageData.color + ';' +
        'font-size:' + barrageData.font + 'px;' +
        'top:' + randomTop() + 'px;' +
        '">' + showMsg + '</div>';

    return barrageItem;
}
// 随机生成弹幕位置 - 距离视频顶部
function randomTop() {
    var randomNum = Math.random(),
        randomTop = Math.floor(randomNum * (576 - 26));

    return randomTop;
}
// 弹幕输入处理
function barrageInput(event) {
    // 回车
    if (event.keyCode == 13) {
        var $this = $(this),
            $barrageSend = $this.siblings('.barrage-send');
        $barrageSend.trigger('click');
    }
}

// 弹幕字体设置面板控制出现和隐藏
function barrageSettingSwitch() {
    var $this = $(this),
        $barrageWordSetting = $this.siblings('.barrage-word-setting');

    $barrageWordSetting.toggleClass('active');

    if ($barrageWordSetting.hasClass('active')) {
        barrageControl.settingTimeoutId = setTimeout(function () {
            if ($barrageWordSetting.hasClass('active')) {
                $barrageWordSetting.removeClass('active');
            }
        }, barrageControl.timeoutTime);
    } else {
        if (typeof barrageControl.settingTimeoutId !== 'undefined') {
            clearTimeout(barrageControl.settingTimeoutId);
        }
    }
}

function barrageSettingPanel(e) {
    switch (e.type) {
        case 'mouseup':
            Event_timeStamp = e.timeStamp;
            break;
        case 'mouseenter':
            clearTimeout(barrageControl.settingTimeoutId);
            break;
        case 'mouseleave':
            if (!Event_timeStamp || (e.timeStamp - Event_timeStamp > 10)) {
                var $this = $(this);
                if ($this.hasClass('active')) {
                    $this.removeClass('active');
                }
            }
            break;
    }
}

// 弹幕字体大小(颜色)设置
function barrageWordSetting() {
    var $this = $(this),
        parentClassName = $this.parent('ul').attr('class'),
        key = '';

    if (parentClassName === 'word-font') {
        key = 'font';
    } else if (parentClassName === 'word-color') {
        key = 'color';
    } else {
        return;
    }

    if (!$this.hasClass('active')) {
        var $active = $this.siblings('.active'),
            thisClassName = $this.attr('class');

        options.barrageSetting.wordStyle[key] = thisClassName;

        $this.addClass('active');
        $active.removeClass('active');
    }
}

// 清晰度切换
function definitionChange() {
    var $this = $(this);

    if ($this.hasClass('h5player-ctrl-bar-kbps-current')) {
        return;
    } else {
        var $thisParents = $this.parents('.btn-kbps'),
            $kbpsText = $thisParents.find('.btn-kbps-text'),
            $current = $this.siblings('.h5player-ctrl-bar-kbps-current'),
            newDefinitionText = $this.attr('data-res');

        $thisParents.addClass('h5player-ctrl-bar-kbps-panel-hide');

        function _loadAfterFunc() {
            $current.removeClass('h5player-ctrl-bar-kbps-current');
            $this.addClass('h5player-ctrl-bar-kbps-current');
            $kbpsText.text(newDefinitionText).attr('data-res', newDefinitionText);
        }
        reloadDefinition(newDefinitionText, _loadAfterFunc);

        // 暂时 - 清晰度切换完成执行
        setTimeout(function () {
            $thisParents.removeClass('h5player-ctrl-bar-kbps-panel-hide');
        }, 1000);

    }
}

export default initHtml5CtrlEvents;