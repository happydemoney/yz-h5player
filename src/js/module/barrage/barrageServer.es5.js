/* 
 * Barrage 弹幕相关操作 
 * 依赖包: socket.io.js
 **/
import io from 'io';

var Barrage = function (isLive) {
    this.isLive = isLive;
};
// Barrage 原型
Barrage.prototype = {
    id: undefined,  // 当前socket连接唯一ID
    curCity: undefined, // 当前位置信息
    socket: null,   // socket对象
    // 连接弹幕服务器
    connectServer: function (serverUrl, name, id) {
        var thisBarrage = this;
        thisBarrage.socket = io(serverUrl);
        //thisBarrage.socket = new io(serverUrl);
        thisBarrage.socket.on('connect', function () {
            thisBarrage.mainFunc(name, id);   // 设置建联以后返回给播放器去主动获取id
        });
        thisBarrage.socket.emit("get_region"); // 获取地理位置信息
        thisBarrage.socket.on('client_region', function (region) {
            if (typeof region != 'string') {
                thisBarrage.curCity = "深圳";
            } else {
                thisBarrage.curCity = region;
            }
        });
    },
    // 弹幕主处理程序
    mainFunc: function (name, id) {
        var thisBarrage = this;
        // 请求打开弹幕服务
        thisBarrage.socket.emit("open_barrage", name, id);
        // 请求连接唯一ID
        thisBarrage.socket.emit('get_id');
        // 获取唯一ID
        thisBarrage.socket.on('id', function (data) {
            thisBarrage.id = data;
        });
        // 连接错误
        thisBarrage.socket.on('connect_error', function () {
            console.log("Barrage connect_error");
        });
        // 重连失败
        thisBarrage.socket.on('reconnect_failed', function () {
            console.log("Barrage reconnect_failed");
        });
        // 断开连接
        thisBarrage.socket.on('disconnect', function () {
            console.log("Barrage disconnect");
        });
        // 连接超时
        thisBarrage.socket.on('connect_timeout', function () {
            console.log("Barrage connect_timeout");
        });
        // 异常错误
        thisBarrage.socket.on('error', function (err) {
            console.log("Barrage error");
        });
    },
    /* 此方法执行一次 */
    messageMonitor: function (callback) {
        callback = callback || function () { };
        // 监听广播消息
        this.socket.on('server', function (data) {
            var msgs = JSON.parse(data);
            if (this.isLive) {
                if (msgs != null && msgs[0].usr_type == 0) {
                    var con = msgs[0].content.msg;
                    var reg = con.match(/\[[^@]{1,3}\]/g);
                    if (reg !== null) {
                        for (var i = 0; i < reg.length; i++) {
                            con = con.replace(reg[i], '');
                        }
                    }
                    var msg = [{
                        "time": msgs[0].time,
                        "color": msgs[0].color,
                        "font": msgs[0].font,
                        "usr_id": msgs[0].usr_id,
                        "content": con
                    }];
                }
            } else {
                msg = msgs;
            }
            //thisBarrage.receiveMsg = msg;
            if (msg.length > 0) {
                callback(msg);
            }
        });
    },
    // 发送消息到服务器
    // barrageMsg { time  content color font }
    // time 时间 - content 弹幕或消息内容 - color 字体颜色 - font 字号大小
    // userType: 0 游客或观众 ， 1 主播 （ 针对直播 ）
    SendMsgToServer: function (barrageMsg, userType) {
        var msg = null;
        userType = userType || 0;
        if (this.isLive) {
            msg = {
                'time': barrageMsg.time,
                'content': {
                    "ip": this.curCity,
                    "msg": barrageMsg.content
                },
                'color': barrageMsg.color,
                'font': barrageMsg.font,
                'usr_id': this.id,
                'usr_type': userType
            };
        } else {
            msg = {
                'time': barrageMsg.time,
                'content': barrageMsg.content,
                'color': barrageMsg.color,
                'font': barrageMsg.font,
                'usr_id': this.id
            };
        }
        this.socket.emit('message', JSON.stringify(msg));
    },
    // 获取视频当前进度的弹幕消息
    getMessageByTime: function (time) {
        this.socket.emit('get_msg', time);
    },
    // 根据name-id关闭socket连接
    closeServer: function (name, id) {
        this.socket.emit('close_barrage', name, id);
    }
};

export default Barrage;