/**
 * 弹幕前端(browser)处理方法
 */
/**
 * 更新弹幕数据
 * @param {*} methodName (open/close)
 */
import Barrage from './barrageServer.js';  // 弹幕交互相关

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
            options.barrageSetting.clientObject.connectServer(options.barrageSetting.serverUrl, options.barrageSetting.videoInfo.videoName, options.barrageSetting.videoInfo.videoId);
        }
        options.barrageSetting.clientObject.getMessageByTime(Math.round(oPlayer.source.currentTime));
        updateBarrageDisplay();

        options.barrageControl.intervalId = setInterval(function () {
            options.barrageSetting.clientObject.getMessageByTime(Math.round(oPlayer.source.currentTime));
        }, options.barrageControl.intervalTime);
    }

    // 关闭弹幕
    function _close() {
        updateBarrageDisplay('clean');
        clearInterval(options.barrageControl.intervalId);
        options.barrageControl.intervalId = undefined;
        // 关闭当前客户端与服务端的连接
        options.barrageSetting.clientObject.closeServer(options.barrageSetting.videoInfo.videoName, options.barrageSetting.videoInfo.videoId);
        // 初始化弹幕交互对象
        options.barrageSetting.clientObject = null;
        // 弹幕监听关闭，值改为false
        options.barrageControl.isMonitored = false;
    }

    // 暂停后再播放时打开弹幕
    function _play() {
        if (options.barrageControl.isOpen && !options.barrageControl.intervalId) {
            options.barrageControl.intervalId = setInterval(function () {
                options.barrageSetting.clientObject.getMessageByTime(Math.round(oPlayer.source.currentTime));
            }, options.barrageControl.intervalTime);
        }
    }

    // 暂停弹幕
    function _pause() {
        if (options.barrageControl.isOpen && options.barrageControl.intervalId) {
            clearInterval(options.barrageControl.intervalId);
            options.barrageControl.intervalId = undefined;
        }
    }
}