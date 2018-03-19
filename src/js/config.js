// 默认配置
export const defaultConfig = {
    // 播放器容器
    playerContainer: null,
    // 是否输出调试信息
    debug: false,
    // 直播(true)还是点播(false)
    isLive: false,
    // 视频加载完是否自动播放
    autoplay: true,
    // HTML5播放控件是否显示
    controls: true,
    // 是否使用默认HTML5播放器控件
    isDefaultControls: false,
    // 播放器类型
    playerType: 'Html5',    // Html5 - Flash
    // 直播视频流 rtmp视频流 - http-flv视频流 - hls分片视频索引文件(m3u8)
    liveStreamUrl: {
        RTMP: '',
        HLS: '',
        HTTPFLV: ''
    },
    // 播放视频源  - .flv - .mp4 - .m3u8 等等
    videoUrl: '',
    // 清晰度设置
    definitionSetting: {
        // 用于首次加载展示,类似于默认的清晰度
        firstRate: null,
        // 用于切换清晰度以及页面展示
        allRate: []
    },
    // 弹幕相关配置
    barrageSetting: {
        // 是否显示弹幕按钮
        isShow: false,
        wordStyle: {
            font: 'large',
            color: 'white'
        },
        // 视频信息 - 名称和ID
        videoInfo: {
            videoName: '',
            videoId: ''
        },
        // 弹幕服务器地址
        serverUrl: '',
        // 弹幕客户端对象 - 处理弹幕发送、接收和显示
        clientObject: null
    },
    // 弹幕显示区域父节点DOM对象
    barrageContainer: undefined,
    // 自定义h5播放控制器相关
    h5playerSetting: {
        // fullscreenHideTimeout - 全屏隐藏控制条时间间隔设置
        fullscreenHideTimeout: 2000
    },
    // VR相关设置
    vrSetting: {
        vrSwitch: false, // vr开关 - 默认关闭
        //0.普通视频 1.3D左右 2.3D上下 3.半景前视 4.半景3D左右 5.半景3D上下 6.全景视频 7.全景3D左右 8.全景3D上下  9.鱼眼 10.小行星 -- 待实现
        vrControl: true, // vrControl切换条是否展示
        vrMode: 0  // vrMode(全景类型--0：全景,1：半景,2：小行星,3：鱼眼);
    },
    // 广告设置 - 片头、暂停、片尾
    adsSetting: {
        adsActive: false, // 激活状态
        beginning: {
            timeLength: 0, // 广告时长
            source: [], // 一般为短视频 10~60秒
            link: []
        },
        pause: {
            source: [], // 一般为图片
            link: []
        },
        ending: {
            timeLength: 0, // 广告时长
            source: [], // 一般为短视频 10~60秒
            link: []
        }
    },
    // 皮肤设置
    skinSetting: {
        skinName: 'default', // 经典(classic)、现代(modern)、银白(silver)、时尚(fashion)、优雅(elegant)、科技(technology)、简洁(concise)
        skinColor: 'default' //  (#46C1DE)  /  (#28AAFA)  /  (#DC3C3C)  /  (#A0E064)  /  (#1289f7)  /   (#30D2FA) /    (#10CA56)
    },
    // 面板设置 - logo显示，开/关灯，分享到社交平台等
    panelSetting: {
        logo: {
            isShow: false,
            src: '',
            position: 'top-right' // top-left / top-right / bottom-left / bottom-right
        },
        light: {
            isShow: false, // true - false
            status: 1 // 1: on - 0: off
        },
        share: {
            isShow: false, // true - false
            options: '0|0|0|0|0|0', // 1 显示，0 不显示； 分享小插件图标新浪，腾讯微博，qq空间，微信，qq，人人网
            copy: '""|""', // 复制链接 复制html
            links: '""|""|""|""|""|""' // 分享对应的地址
        }
    },
    // 视频帧截图相关
    screenshotsSetting: {
        displayState: false, // 显示状态 - true / false
        serviceUrl: '', // 截图存放服务器地址
        suffix: '.jpg', // 默认后缀格式为 .jpg
        prefix: 'myvideo', // 默认前缀名称为 myvideo
        timeout: 300 // 控制视频截图滑动显示的频率，值越小，频率越大 - 单位 (ms/毫秒)
    }
};