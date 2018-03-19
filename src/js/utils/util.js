/**
 * 自定义一些功能函数
 */
/**
 * 时间秒数格式化
 * @param s 时间戳（单位：秒）
 * @returns {*} 格式化后的时分秒
 */
export function secondToTime(s) {
    var t = '';
    if (s > -1) {
        var hour = Math.floor(s / 3600);
        var min = Math.floor(s / 60) % 60;
        var sec = s % 60;

        if (hour > 0 && hour < 10) {
            t = '0' + hour + ":";
        } else if (hour >= 10) {
            t = hour + ":";
        }

        if (min < 10) { t += "0"; }
        t += min + ":";
        if (sec < 10) { t += "0"; }
        t += sec.toFixed(0);
    }
    return t;
}
/**
 * Shows a message in the console of the given type.
 * @param {*} type error / warn
 * @param {*} text 
 */
export function showError(type, text) {
    console && console[type] && console[type]('videoPlayer: ' + text);
}
/**
 * 输出调试信息
 * @param {Boolean} debugFlag
 * @param {*} logMsg 
 */
export function showLog(debugFlag, logMsg) {
    if (!debugFlag) {
        return;
    }
    console && console.log && console.log(logMsg);
}

/**
 * Find the right method, call on correct element
 * @param {*} element 
 */
export function launchFullScreen(element) {
    if (element.requestFullScreen) {
        element.requestFullScreen();
    } else if (element.mozRequestFullScreen) {
        element.mozRequestFullScreen();
    } else if (element.webkitRequestFullScreen) {
        element.webkitRequestFullScreen();
    } else if (element.msRequestFullscreen) {
        element.msRequestFullscreen();
    }
}
/**
 * 退出全屏
 */
export function exitFullscreen() {
    if (document.exitFullscreen) {
        document.exitFullscreen();
    } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
    } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
    }
}
/**
 * 返回全屏的元素对象，注意：要在用户授权全屏后才能获取全屏的元素，否则 fullscreenEle为null
 */
export function fullscreenElement() {
    var fullscreenEle = document.fullscreenElement ||
        document.mozFullScreenElement ||
        document.webkitFullscreenElement ||
        document.msFullscreenElement;
    return fullscreenEle;
}
/**
 * 是否是全屏状态
 */
export function fullscreenEnable() {
    var isFullscreen = document.fullscreenEnabled ||
        window.fullScreen ||
        document.webkitIsFullScreen ||
        document.msFullscreenEnabled;
    //注意：要在用户授权全屏后才能准确获取当前的状态
    return Boolean(isFullscreen);
}