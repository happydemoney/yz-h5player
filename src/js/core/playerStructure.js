/**
 * 初始化播放器结构 并返回生成的播放器DOM ID    
 */
import { vrTextShow } from '../const/constant.js';
import _ from '../utils/common.js';    // 类似underscore功能函数

function initPlayerStructure(options) {

    // 清晰度选择功能字符串
    let definitionString = '';

    if (options.definitionSetting.allRate.length > 0) {
        let firstRate = options.definitionSetting.firstRate,
            allRate = options.definitionSetting.allRate;
        if (allRate.length === 1) {
            definitionString += '<div class="h5player-ctrl-bar-btn btn-kbps"><span class="btn-kbps-text" data-res="' + allRate[0].text + '">' + allRate[0].text + '</span></div>';
        } else {
            definitionString += '<div class="h5player-ctrl-bar-btn btn-kbps"><span class="btn-kbps-text" data-res="' + firstRate.text + '">' + firstRate.text + '</span>';
            definitionString += '<div class="h5player-ctrl-bar-kbps-panel">';
            for (let i = 0; i < allRate.length; i++) {
                if (allRate[i].text === firstRate.text) {
                    definitionString += '<span class="h5player-ctrl-bar-kbps-change h5player-ctrl-bar-kbps-current" data-res="' + allRate[i].text + '">' + allRate[i].text + '</span>';
                } else {
                    definitionString += '<span class="h5player-ctrl-bar-kbps-change" data-res="' + allRate[i].text + '">' + allRate[i].text + '</span>';
                }
            }
            definitionString += '</div></div>';
        }
    }

    // 暂停广告字符串
    let pauseAdString = '';

    if (options.adSetting.adActive && options.adSetting.pause.source.length > 0) {
        pauseAdString += '<div class="h5player-pause-ad-wrap"><div class="h5player-pause-ad"><span class="close"></span>' +
            '<a target="_blank" href="' + options.adSetting.pause.link[0] + '">' +
            '<img src="' + options.adSetting.pause.source[0] + '" alt="pause-image"/></a>' +
            '</div></div>';
    }

    // 面板字符串 - 开关灯/分享到社交平台/logo显示
    let panelString = '';

    if (options.panelSetting.logo.isShow || options.panelSetting.light.isShow || options.panelSetting.share.isShow) {
        panelString = '<div class="h5player-panel-wrap">';

        if (options.panelSetting.logo.isShow) {
            let logoPosition = options.panelSetting.logo.position,
                logoSrc = options.panelSetting.logo.src;

            panelString += '<div class="h5player-panel-logo ' + logoPosition + '">'
            panelString += '<img src="' + logoSrc + '" alt="logo"/></div>'
        }

        if (options.panelSetting.light.isShow || options.panelSetting.share.isShow) {
            let className = 'h5player-panel-control';
            if (options.panelSetting.light.isShow && options.panelSetting.share.isShow) {
                className = 'h5player-panel-control double';
            }
            panelString += '<div class="' + className + '">';
            panelString += options.panelSetting.light.isShow ? '<div class="h5player-panel-light"><span class="icon-light">关灯</span></div>' : '';
            panelString += options.panelSetting.share.isShow ? '<div class="h5player-panel-share"><span class="icon-share">分享</span></div>' : '';
            panelString += '</div>';
        }
        panelString += '</div>';
    }

    // 弹幕结构相关
    let barrageString = '';

    if (options.barrageSetting.isShow) {
        // 弹幕开关以及弹幕输入
        barrageString += '<div class="h5player-ctrl-bar-barrage-container">';
        barrageString += '<div class="h5player-ctrl-bar-barrage-control">' +
            '<span class="h5player-ctrl-bar-btn btn-barrage-setting" data-info="弹幕设置"></span>' +
            '<div class="barrage-word-setting">' +
            '<ul class="word-font"><li class="large active">A</li><li class="medium">A</li><li class="small">A</li></ul>' +
            '<ul class="word-color"><li class="white active"></li><li class="yellow"></li><li class="orange"></li>' +
            '<li class="red"></li><li class="pink"></li><li class="purple"></li>' +
            '<li class="blue"></li><li class="green"></li></ul>' +
            '</div>';
        barrageString += '<div class="barrage-input-container">' +
            '<input class="barrage-input" type= "text" data-info="弹幕输入" placeholder= "发弹幕是不可能不发弹幕的，这辈子不可能不发弹幕的。" />' +
            '<input class="barrage-send" type="button" data-info="发送弹幕" value="发送" /></div></div>';
        barrageString += '<span class="h5player-ctrl-bar-btn btn-barrage" data-info="弹幕"></span>';

        barrageString += '</div>';
    }

    let now = _.now(),
        playerContainer = options.playerContainer,
        videoIdFormal = options.isLive ? 'live' : 'onDemand',
        playerId = videoIdFormal + options.playerType + '-' + now,
        volumeSlidebarId = 'volumeSlidebar' + '-' + now,
        videoClassName = options.isLive ? 'videoLive' : 'videoOnDemand',
        controlsTag = (options.controls && options.isDefaultControls) ? 'controls' : '',
        h5playerStatusClass = (options.autoplay && (options.adSetting.beginning.timeLength === 0 || !options.adSetting.adActive)) ? 'h5player-status-playing' : 'h5player-status-paused',
        h5playerSkinClass = options.skinSetting.skinName === 'default' ? '' : ' h5player-skin-' + options.skinSetting.skinName,
        timelineTag = '<div class="h5player-ctrl-timeline-container"><span class="current-time">00:00:01</span>/<span class="duration-time">01:30:30</span></div>', // 点播视频显示 - 当前时间 / 视频长度
        // 弹幕主体显示部分
        barrageContentString = options.barrageSetting.isShow ? '<div class="h5player-barrage-wrap"></div>' : '',
        // 是否开启VR功能 - 且 vrSetting.vrControl为true显示vr切换条
        vrContentString = options.vrSetting.vrSwitch && options.vrSetting.vrControl ? '<span class="h5player-ctrl-bar-btn btn-vr" data-info="' + vrTextShow[options.vrSetting.vrMode] + '">' + vrTextShow[options.vrSetting.vrMode] + '</span>' : '',

        html5ControlString_live = '<div class="h5player-live-ctrl">' +
            '<div class="h5player-live-bar">' +
            '<div class="h5player-ctrl-bar clearfix">' +
            '<span class="h5player-ctrl-bar-btn btn-play" data-info="播放/暂停"></span>' +
            '<span class="h5player-ctrl-bar-btn btn-refresh" data-info="刷新"></span>' +

            '<span class="h5player-ctrl-bar-btn btn-fullScreen" data-info="全屏"></span>' +
            vrContentString +
            definitionString +
            '<div class="h5player-ctrl-bar-volume-container">' +
            '<span class="h5player-ctrl-bar-btn btn-volume"></span>' +
            '<div class="h5player-ctrl-bar-btn h5player-ctrl-bar-volume-slide">' +
            '<input id="' + volumeSlidebarId + '" class="h5player-ctrl-bar-volume-slidebar" type="range" min="0" value="100" max="100" data-info="音量调整"/>' +
            '</div></div>' +
            barrageString +

            '</div></div></div>',

        html5ControlString_onDemond = '<div class="h5player-live-ctrl">' +
            '<div class="h5player-live-bar">' +

            '<div class="h5player-ctrl-bar clearfix">' +
            '<span class="h5player-ctrl-bar-btn btn-play" data-info="播放/暂停"></span>' +
            timelineTag +
            '<span class="h5player-ctrl-bar-btn btn-fullScreen" data-info="全屏"></span>' +
            vrContentString +
            definitionString +
            '<div class="h5player-ctrl-bar-volume-container">' +
            '<span class="h5player-ctrl-bar-btn btn-volume"></span>' +
            '<div class="h5player-ctrl-bar-btn h5player-ctrl-bar-volume-slide">' +
            '<input id="' + volumeSlidebarId + '" class="h5player-ctrl-bar-volume-slidebar" type="range" min="0" value="100" max="100" data-info="音量调整"/>' +
            '</div></div>' +
            barrageString +
            '</div>' +
            '<div class="h5player-progress-bar-container">' +
            '<div class="h5player-progress-list">' +
            '<div class="h5player-progress-load"></div>' +
            '<div class="h5player-progress-play"></div></div>' +
            '<div class="h5player-progress-btn-scrubber">' +
            '<div class="h5player-progress-btn-scrubber-indicator"></div></div></div>' +
            '</div></div>',

        html5ControlString = options.playerType !== 'Flash' && options.controls && !options.isDefaultControls ? (options.isLive ? html5ControlString_live : html5ControlString_onDemond) : '',
        videoString = '<div class="videoContainer"><div class="liveContent ' + h5playerStatusClass + h5playerSkinClass + '">' +
            '<video class="' + videoClassName + '" id="' + playerId + '" ' + controlsTag + '>' +
            'Your browser is too old which does not support HTML5 video' +
            '</video>' + barrageContentString + html5ControlString + pauseAdString + panelString +
            '</div>' +
            '</div>';

    playerContainer.append(videoString);
    // 缓存弹幕父节点DOM对象
    options.barrageContainer = options.playerContainer.find('.h5player-barrage-wrap');

    return {
        playerSrc: document.getElementById(playerId),
        playerVolume: document.getElementById(volumeSlidebarId)
    };
};

export default initPlayerStructure;