# yz-h5player

    A video player base on HTML5 , support barrage and custom UI and other useful funcition.


[![GitHub release](https://img.shields.io/github/release/happydemoney/yz-h5player.svg)](https://github.com/happydemoney/yz-h5player/releases)
[![License MIT](https://img.shields.io/github/license/happydemoney/yz-h5player.svg)](https://github.com/happydemoney/yz-h5player/blob/master/LICENSE)
[ ![showUrl](https://img.shields.io/badge/%E6%BC%94%E7%A4%BA%E5%9C%B0%E5%9D%80-v1.0.0-orange.svg)](https://happydemoney.github.io)
[ ![showUrlCode](https://img.shields.io/badge/%E6%BC%94%E7%A4%BA%E4%BB%93%E5%BA%93-v1.0.0-blue.svg)](https://github.com/happydemoney/happydemoney.github.io)

## 功能说明 
*   点播/直播，支持视频格式{.flv(h264+aac/mp3),.m3u8,.mp4及其他video原生支持的视频格式.ogg/.webm等等(需要浏览器支持)},直播协议HTTP-FLV,HLS,RTMP（需要flash支持，功能很少，只有基本的播放功能）
*   支持清晰度切换(240P/480P/720P/1080P)，自由配置
*   支持VR全景播放 - 基于three.js( 可在普通、全景、半景之间切换 )
*   支持广告功能（片头、片尾、暂停） - 页面结构优化基本完成
*   支持弹幕交互功能及弹幕字体大小和颜色设置(弹幕数据来源需要弹幕交互服务支持)
*   播放器UI定制功能[三款皮肤(优雅、科技、简洁)]
*   开关灯/分享到社交平台
*   视频进度条帧截图（需要使用工具（比如ffmepg）提前把视频的帧截图处理好并提供存放服务器路径）

##   Getting start

环境依赖：nodejs ( https://nodejs.org/en/ )

    npm install
    npm run build

##   How to use

```javascript
<div id="videoWrap"></div>

/* jquery依赖库 */
<script type="text/javascript" charset="utf-8" src="http://apps.bdimg.com/libs/jquery/1.9.1/jquery.min.js"></script>
<script type="text/javascript" charset="utf-8" src="dist/videoPlayer.js"></script>
<script type="text/javascript" charset="utf-8" >
    /* 1. on demand(点播) */
    $('#videoWrap').videoPlayer({
        videoUrl: 'http://***.mp4(.ogg/.webm/.flv/.m3u8)'
    });
    // 2. live(直播)
    $('#videoWrap').videoPlayer({
        isLive: true,
        liveStreamUrl: {
            RTMP: 'rtmp://<hostName>:1935/<appName>/<sreamName>',
            HLS: 'http://<hostName>:HLSport/<appName>/<streamName>.m3u8',
            HTTPFLV: 'http://<hostName>:FLVport/<appName>/<streamName>.flv'
        }
    });
</script>
```

##  Local Test

直播测试：
    1. 在livego目录下，根据md文件描述下载符合自己电脑环境的相关 livego 文件并运行它
    2. 用ffmepg本地推流
    3. 在testFile目录下找到live.js设置相关路径
    4. 在当前根目录执行node命令(http-server),启动（需要安装 npm -g install http-server）静态服务器测试

点播测试：
    1. 在本地videoTest文件夹内加入相应video文件并在./testFile/js/live.js 设置相应路径
    2. 启动静态服务器

##   Option

*   playerType: 播放器类型 (Html5/Flash) 
    
    默认HTML5，很多功能基于HTML5，Flash只有基本的播放功能。

*   isLive: 直播/点播 (true/false)

*   autoplay: 自动播放 (true/false)

*   controls: 播放器控制条 (true/false)

*   liveStreamUrl: 可播放的直播流地址 (object)

    只在isLive为true的情况下生效。支持RTMP/HLS/HTTPFLV直播流
```javascript
    {
        isLive: true,
        liveStreamUrl: {
            RTMP: 'rtmp://<hostName>:1935/<appName>/<sreamName>',
            HLS: 'http://<hostName>:HLSport/<appName>/<streamName>.m3u8',
            HTTPFLV: 'http://<hostName>:FLVport/<appName>/<streamName>.flv'
        }
    }
```
*   videoUrl: 可播放的视频地址(string)

    支持HTML5-video原生支持的视频元素(.mp4/.webm等等)，额外支持.flv(flv.js)/.m3u8(HLS.js).
```javascript
    {
        videoUrl: 'http://***.mp4(.ogg/.webm/.flv/.m3u8)'
    }
```
*   skinSetting：皮肤设置(skinName: String,skinColor: String)

    skinName: 皮肤名称 [默认(default)、优雅(elegant)、科技(technology)、简洁(concise)]
    skinColor: 皮肤色系 { 'default', '#1289f7' }

```javascript
skinSetting: {
    skinName: 'elegant', 
    skinColor: '#1289f7'
}
```    
*   barrageSetting: 弹幕功能相关 (object)

    isShow: 是否显示弹幕按钮 (true/false)
    videoInfo: 关联视频名称及视频ID信息
    serverUrl: 弹幕交互服务地址 

此功能目前是基于一套解决方案定制的，后期会剥离出来，扩展支持其它弹幕交互解决方案。

```javascript
// 弹幕相关配置
barrageSetting: {
    // 是否显示弹幕按钮
    isShow: false,
    // 视频信息 - 名称和ID
    videoInfo: {
        videoName: '',
        videoId: ''
    },
    // 弹幕服务器地址
    serverUrl: ''
}
```
*   vrSetting: VR全景相关(object)

    vrSwitch：是否启用全景(true/false)
    vrControl:  是否展示vrControl切换条(true/false)
    vrMode: 全景类型(0：普通,1：全景,2：半景)

```javascript
// 全景相关配置
vrSetting: {
    vrSwitch: true,  // vr开关 - 默认关闭
    vrControl: true, // vrControl切换条是否展示
    vrMode: 0  // vrMode(全景类型--0：普通,1：全景,2：半景);
}
```
*   definitionSetting: 清晰度设置 {firstRate:null,allRate:[]}

    firstRate: 默认清晰度 （对象 - Object）
    allRate: 所有可选清晰度 （数组 -Array）

这个配置选项中firstRate会与videoUrl冲突，如果有设置videoUrl会优先加载videoUrl的地址视频。
```javascript
 // 清晰度设置
definitionSetting: {
    firstRate: {
        text: '超清',
        url: ''
    },
    allRate: [{
        text: '超清',
        url: ''
    }, {
        text: '高清',
        url: ''
    }, {
        text: '标清',
        url: ''
    }, {
        text: '1080P',
        url:''
    }]
}
```
*   adSetting：广告设置 (adActive:Boolean,beginning:Object,pause:Object,ending:Object)

    adActive: 广告开启/关闭(true/false)
    beginning: 片头广告
    pause: 暂停广告
    ending: 片尾广告

```javascript
// 广告设置 - 片头、暂停、片尾
adSetting: {
    adActive: true, // 激活状态
    beginning: {
        timeLength: 0, //片头广告总时长
        source: [], // 一般为短视频 10~60秒
        link: []
    },
    pause: {
        source: [], // 一般为图片
        link: []
    },
    ending: {
        timeLength: 0, //片尾广告总时长
        source: [], // 一般为短视频 10~60秒
        link: []
    }
}
```
*   screenshotsSetting：视频帧截图设置(displayState: Boolean,serviceUrl: String,suffix: String, prefix: String, timeout: Integer)

```javascript
screenshotsSetting: {
    displayState: true, // 显示状态 - true / false
    serviceUrl: 'http://127.0.0.1:8080/videoTest/flv/Screenshots', // 截图存放服务器地址
    suffix: '.jpg', // 默认后缀格式为 .jpg
    prefix: 'myvideo', // 默认前缀名称为 myvideo
    timeout: 300 // 控制视频截图滑动显示的频率
}
```
##   Method

    当页面内只存在一个videoPlayer对象的时候,可使用$.fn.videoPlayer.methodName()简洁引用方法，
    存在多个videoPlayer对象时，需要在创建时缓存对应的videoPlayer对象，方便后面调用方法。

Apply:

    single videoPlayer: $.fn.videoPlayer.methodName();
    multiple videoPlayer: videoPlayer.methodName(); [var videoPlayer = $('#videoWrap').videoPlayer(options)]

*   play: 播放

*   pause: 暂停

*   muted: 静音开启/关闭

*   seek: 视频寻址(取值 0 ~ 视频最大时间长度 - 单位秒(s))

*   seekForward: 前进 (默认5，可传入任意需要的秒数，比如 5/10/15)

*   seekBackward: 后退 (默认5，可传入任意需要的秒数，比如 5/10/15)

*   playbackspeedChange: 播放速率调整(推荐参数：0.5/0.75/1.0/1.25/1.5/2.0) - 1.0为正常速率

##   Experience sharing

*   Chrome browser mouse event (mouseout mouseleave) BUG ?

    描述：给一个元素添加mouseout或mouseleave事件，在chrome下在元素内部快速连续点击或双击会触发 mouseout或mouseleave 事件，这与事件的实现预期不符。

    初步解决方案：
```javascript
$(element).on('mouseup  mouseout', eventHandler);
var timeStamp;
function eventHandler(e) {
    switch (e.type) {
        case 'mouseup':
            console.log('mouseup');
            timeStamp = e.timeStamp;
            break;
        case 'mouseout':
            if (!timeStamp || (e.timeStamp - timeStamp > 10)) {
                console.log('mouseout');
            }
            break;
        default:
            break;
    }
}
```
