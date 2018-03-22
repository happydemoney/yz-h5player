/* 定义常量以及插件默认选项 */
export const shareIcon = ['icon-weibo', 'icon-tWeibo', 'icon-qzone', 'icon-weChat', 'icon-qq', 'icon-renren'];
export const vrTextShow = ['全景', '半景', '小行星', '鱼眼'];
// 视频/视频流类别 - rtmp: Flash播放器(only) / flv: 基于flv.js的HTML5播放器 / hls: 基于hls.js的HTML5播放器 / html5: video标签原生支持的视频格式 .mp4/.ogg/.webm
export const videoType = { rtmp: 'RTMP', flv: 'FLV', hls: 'HLS', html5: 'HTML5' };
// 快进/退 默认值
export const seekIncrement = 5;
// 弹幕字体颜色和大小设置的默认参数
export const barrageWordStyle = {
    font: {
        large: 18,
        medium: 15,
        small: 12
    },
    color: {
        white: '#fff',
        yellow: '#fff100',
        orange: '#eb6100',
        red: '#e60012',
        pink: '#ea68a2',
        purple: '#920783',
        blue: '#00a0e9',
        green: '#22ac38'
    }
};