#   Source description（源码说明）

##  const（常量）

    定义常量以及插件默认选项

##  core（核心）

1.  basePlaer.js

    播放器事件和属性定义

2. playerStructure.js

    播放控制器dom结构，此处创建的结构与css内的样式相结合组成播放器的主要控制界面。

3.  playerDomEvents.js

    播放器事件集合：播放、暂停、视频进度条拖拽等等。

##  lib（依赖库）

    jquery需要提前加载，其它库文件按需加载。

1.  flv.js
    
    支撑播放器对.flv格式的直播流或点播文件的播放。

2.  hls.js

    支撑播放器对.m3u8格式的直播流或点播文件的播放(主要在PC上需要)

3.  jquery.js

    dom操作需要

4.  qrcode.js

    主要用于生成分享链接二维码。

5.  socket.io.js

    主要用户弹幕交互模块。

6.  three.js

    主要用户全景和半景视频模式的支撑。

##  module（其它模块部分代码）

1.  ad

    广告播放器相关模块

2.  barrage

    弹幕服务端交互和客户端模块

3.  vr

    全景视频模块部分

4. swfobject.js

    flash播放器的库文件

##  utils（工具函数）

1.  common.js

    常用的一些功能函数

2.  polyfill.js

    垫片库

3.  utils.js

    自定义的一些功能函数

##  其它

1. config.js

    插件配置信息

2.  yzH5player.js

```
简单流程说明：

1. 先判断是否是直播，直播需要初始化videoUrl
2. 初始化播放器，根据videoUrl的类型判定使用哪类播放器
3. 初始化播放控制器结构，是否显示vr控制条
4. 是否启用广告播放器
5. 暴露播放器的控制方法（播放、暂停、seek等等），供实例使用
```