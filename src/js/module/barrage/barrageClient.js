/**
 * 弹幕前端(browser)处理方法
 */

import Barrage from './barrageServer.js';  // 弹幕交互相关
import { barrageWordStyle } from '../../const/constant.js';
import { loadJsCss } from '../../utils/util';

// 此polyfill不支持 symbol 属性，因为ES5 中根本没有 symbol ：
if (typeof Object.assign != 'function') {
    // Must be writable: true, enumerable: false, configurable: true
    Object.defineProperty(Object, "assign", {
        value: function assign(target, varArgs) { // .length of function is 2
            'use strict';
            if (target == null) { // TypeError if undefined or null
                throw new TypeError('Cannot convert undefined or null to object');
            }

            var to = Object(target);

            for (var index = 1; index < arguments.length; index++) {
                var nextSource = arguments[index];

                if (nextSource != null) { // Skip over if undefined or null
                    for (var nextKey in nextSource) {
                        // Avoid bugs when hasOwnProperty is shadowed
                        if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                            to[nextKey] = nextSource[nextKey];
                        }
                    }
                }
            }
            return to;
        },
        writable: true,
        configurable: true
    });
}

// 弹幕控制对象 - 包含弹幕开启状态、定时器ID、请求延时时间设定
let barrageControl = Object.assign({}, {
    isInited: false,      // 弹幕动画样式是否初始化
    isOpen: false,        // 弹幕面板 和 展示 是否开启
    isMonitored: false,   // 弹幕服务监控是否开启
    intervalTime: 5000,   // 请求延时时间设定 - 5秒
    timeoutTime: 3000,    // 弹幕开关切换延时/弹幕字体大小及颜色设置面板切换关闭延时 为0时实时切换 默认3000
    settingTimeoutId: undefined // 弹幕字体设置定时器ID
}),
    Event_timeStamp; // 事件时间戳 - 主要解决chrome下mouseout mouseleave被click意外触发的问题

// 弹幕开关处理程序
export function barrageFuncSwitch(element, options) {

    var $this = $(element),
        $thisParent = $this.parent(), // .h5player-ctrl-bar-barrage-container
        $parentLiveContent = $this.parents('.liveContent'),
        $h5playerBarrageWrap = $parentLiveContent.find('.h5player-barrage-wrap'),
        $barrageControl = $thisParent.find('.h5player-ctrl-bar-barrage-control'),
        $videoContainer = options.playerContainer.find('.videoContainer');

    if ($videoContainer.hasClass('h5player-status-adsPlayer-playing') || $this.hasClass('disabled')) {
        return;
    }

    if (!$this.hasClass('active')) {

        initBarrageStyle(options.barrageContainer);

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
        updateBarrageData({ methodName: 'open', options });
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
        updateBarrageData({ methodName: 'close', options });
    }
}

/**
 * 更新弹幕数据
 * @param {methodName, options}
 */
export function updateBarrageData({ methodName, options }) {
    switch (methodName) {
        // 打开弹幕
        case 'open':
            _open();
            break;
        // 关闭弹幕
        case 'close':
            _close();
            break;
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

    // 打开弹幕
    function _open() {
        if (!options.barrageSetting.clientObject) {
            options.barrageSetting.clientObject = new Barrage(options.isLive); // Barrage.js
            if( !window.io ){
                loadJsCss( 'lib/socket.io.js', () => {
                    options.barrageSetting.clientObject.connectServer(options.barrageSetting.serverUrl, options.barrageSetting.videoInfo.videoName, options.barrageSetting.videoInfo.videoId);
                } )
            }else{
                options.barrageSetting.clientObject.connectServer(options.barrageSetting.serverUrl, options.barrageSetting.videoInfo.videoName, options.barrageSetting.videoInfo.videoId);
            }
        }
        options.barrageSetting.clientObject.getMessageByTime(Math.round(options.playerCurrent.currentTime));
        updateBarrageDisplay(options);

        options.barrageIntervalId = setInterval(function () {
            options.barrageSetting.clientObject.getMessageByTime(Math.round(options.playerCurrent.currentTime));
        }, barrageControl.intervalTime);
    }

    // 关闭弹幕
    function _close() {
        updateBarrageDisplay(options, 'clean');
        clearInterval(options.barrageIntervalId);
        options.barrageIntervalId = undefined;
        // 关闭当前客户端与服务端的连接
        options.barrageSetting.clientObject.closeServer(options.barrageSetting.videoInfo.videoName, options.barrageSetting.videoInfo.videoId);
        // 初始化弹幕交互对象
        options.barrageSetting.clientObject = null;
        // 弹幕监听关闭，值改为false
        barrageControl.isMonitored = false;
    }

    // 暂停后再播放时打开弹幕
    function _play() {
        if (barrageControl.isOpen && !options.barrageIntervalId) {
            options.barrageIntervalId = setInterval(function () {
                options.barrageSetting.clientObject.getMessageByTime(Math.round(options.playerCurrent.currentTime));
            }, barrageControl.intervalTime);
        }
    }

    // 暂停弹幕
    function _pause() {
        if (barrageControl.isOpen && options.barrageIntervalId) {
            clearInterval(options.barrageIntervalId);
            options.barrageIntervalId = undefined;
        }
    }
}

/**
 * 弹幕发送
 * @param {domElement} element
 * @param {Object} options 
 * @param {String} currenttime 
 */
export function barrageSend(element, options, currenttime) {

    var $this = $(element),
        $barrageInput = $this.siblings('.barrage-input'),
        barrageInfo = $barrageInput.val(),
        barrageMsg;

    if (!barrageInfo) {
        alert('请输入弹幕信息~');
    } else {

        var wordFont = barrageWordStyle.font[options.barrageSetting.wordStyle.font],
            wordColor = barrageWordStyle.color[options.barrageSetting.wordStyle.color];

        barrageMsg = {
            time: Math.round(currenttime),
            content: barrageInfo,
            font: wordFont,
            color: wordColor
        };

        options.barrageSetting.clientObject.SendMsgToServer(barrageMsg);
        options.barrageContainer.append(createBarrageDom(barrageMsg, options.isLive));
        $barrageInput.val('');
    }
}

/**
 * 弹幕字体设置面板控制出现和隐藏
 */
export function barrageSettingSwitch() {

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
/**
 * @param {Event} e 
 */
export function barrageSettingPanel(e) {
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

/**
 * 弹幕字体大小(颜色)设置
 * @param {Dom} element 
 * @param {Object} barrageSetting 
 */
export function barrageWordSetting(element, barrageSetting) {
    var $this = $(element),
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

        barrageSetting.wordStyle[key] = thisClassName;

        $this.addClass('active');
        $active.removeClass('active');
    }
}

/**
 * 弹幕输入处理
 * @param {Object} event 
 */
export function barrageInput(event) {
    // 回车
    if (event.keyCode == 13) {
        var $this = $(this),
            $barrageSend = $this.siblings('.barrage-send');
        $barrageSend.trigger('click');
    }
}

/**
 * 更新弹幕页面展示效果
 * @param {Object} options
 * @param {String} method 
 */
function updateBarrageDisplay(options, method) {
    if (method == 'clean') {
        options.barrageContainer.empty();
    } else if (!barrageControl.isMonitored) {

        barrageControl.isMonitored = true;
        options.barrageSetting.clientObject.messageMonitor(function (receiveMsg) {

            if (receiveMsg.length > 0) {
                for (var i = 0; i < receiveMsg.length; i++) {
                    options.barrageContainer.append(createBarrageDom(receiveMsg[i], options.isLive));
                }
            }

        });
    }
}

/**
 * 创建弹幕dom节点
 * @param {Object} barrageData 
 * @param {Boolean} isLive
 */
function createBarrageDom(barrageData, isLive) {
    var showMsg = '';
    // 直播
    if (isLive) {
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
/**
 * 随机生成弹幕位置 - 距离视频顶部
 */
function randomTop() {
    var randomNum = Math.random(),
        randomTop = Math.floor(randomNum * (576 - 26));

    return randomTop;
}

/**
 * 初始化弹幕动画样式
 * @param {*} options 
 */
function initBarrageStyle(barrageContainer) {

    if (!barrageControl.isInited) {
        barrageControl.isInited = true;

        // 弹幕动画完成 - 清除事件
        // Chrome, Safari 和 Opera 代码 - webkitAnimationEnd
        // 标准写法 - animationend
        barrageContainer.on('animationend webkitAnimationEnd', '.h5player-barrage-item', function () {
            $(this).remove();
        });

        let barrageContainer_width = barrageContainer.width();
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