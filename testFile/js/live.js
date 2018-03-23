var playerNew = null;
$(function () {

    // stream url param

    setStreamUrl();
    $('.ant-switch').on('click', antSwitch);

    $('.player-control').on('click', 'input[name="control-play"]', function () {
        console.log('play');
        //playerNew.play();
        console.log($.fn.videoPlayer);
        $.fn.videoPlayer.play();
    });

    $('.player-control').on('click', 'input[name="control-pause"]', function () {
        console.log('pause');
        playerNew.pause();
    });

    $('.player-control').on('click', 'input[name="control-muted"]', function () {
        console.log('muted');
        playerNew.muted();
    });

    $('.player-control').on('click', 'input[name="control-seek"]', function () {
        var seekVal = $(this).siblings('input[name="control-seek-value"]').val();
        console.log('seek ' + seekVal);
        playerNew.seek(seekVal);
    });

    $('.player-control').on('click', 'input[name="control-seekForward"]', function () {
        playerNew.seekForward();
    });

    $('.player-control').on('click', 'input[name="control-seekBackward"]', function () {
        playerNew.seekBackward();
    });

    $('.player-control').on('click', 'input[name="control-playbackspeed"]', function () {
        var playbackspeedVal = $(this).siblings('input[name="control-playbackspeed-value"]').val();
        console.log('playbackspeed to ' + playbackspeedVal);
        playerNew.playbackspeedChange(playbackspeedVal);
    });

});

function antSwitch() {

    var $this = $(this),
        $parentRenderItem = $this.parents('.render-item'),
        dataType = $this.attr('data-type'),
        isLive = $parentRenderItem.attr('data-isLive') == 'true' ? true : false;

    if (!$this.hasClass('ant-switch-checked')) {
        if (isLive) {

            switch (dataType) {
                case 'FlvJs':
                    var player = $parentRenderItem.videoPlayer({
                        liveStreamUrl: liveStreamUrl,
                        isLive: true,
                        barrage: {
                            isShow: true,
                            videoInfo: {
                                videoName: 'liveTest',
                                videoId: 999
                            },
                            serverUrl: 'http://192.168.1.114:3001'
                        }
                    });
                    $parentRenderItem.data('player', player);
                    break;
                case 'HlsJs':
                    var player = $parentRenderItem.videoPlayer({
                        isLive: true,
                        videoUrl: liveStreamUrl.HLS
                    });
                    $parentRenderItem.data('player', player);
                    break;
                case 'Flash':
                    var player = $parentRenderItem.videoPlayer({
                        liveStreamUrl: liveStreamUrl,
                        isLive: true,
                        playerType: 'Flash'
                    });
                    $parentRenderItem.data('player', player);
                    break;
                default: break;
            }
        } else {
            switch (dataType) {
                case 'FlvJs':
                    var player = $parentRenderItem.videoPlayer({
                        debug: true,
                        //videoUrl: oVideoUrl.flv,
                        barrageSetting: {
                            isShow: true,
                            videoInfo: {
                                videoName: 'videoTest',
                                videoId: 1000
                            },
                            serverUrl: 'http://192.168.1.114:3000'
                        },
                        skinSetting: {
                            skinName: 'concise', // 优雅(elegant)、科技(technology)、简洁(concise)
                            skinColor: 'default' // (#1289f7)  /   (#30D2FA) /    (#10CA56)
                        },
                        // 广告设置 - 片头、暂停、片尾
                        adSetting: {
                            adActive: false, // 激活状态
                            beginning: {
                                timeLength: 29, //广告总时长
                                source: ['http://192.168.1.22/mp4/1513751254948171/87a281b8bd41678c0bfd631a26b517b2/1_480_25_H264_501_4_3_1_0_2_1_3_0_1_0_2_0_0_0_N/6ef3b80f3039c31434fab38189eb2b4c.mp4', 'http://192.168.1.22/mp4/1513751254948171/9177a0cd7a39daca064a3452c1085f01/1_480_25_H264_501_4_3_1_0_2_1_3_0_1_0_2_0_0_0_N/8376ddb496e84125bbb85c85c41d8a7c.mp4'], // 一般为短视频 10~60秒
                                link: ['https://www.lincoln.com.cn/?searchid=CPC_290716_PCKW_bd_AMC_BN_baojia_ID2332', 'http://www.adzop.com/']
                            },
                            pause: {
                                source: ['http://127.0.0.1:8080/testFile/images/ad.jpg'], // 一般为图片
                                link: ['http://www.baidu.com']
                            },
                            ending: {
                                timeLength: 29, //广告总时长
                                source: ['http://192.168.1.22/mp4/1513751254948171/9177a0cd7a39daca064a3452c1085f01/1_480_25_H264_501_4_3_1_0_2_1_3_0_1_0_2_0_0_0_N/8376ddb496e84125bbb85c85c41d8a7c.mp4', 'http://192.168.1.22/mp4/1513751254948171/87a281b8bd41678c0bfd631a26b517b2/1_480_25_H264_501_4_3_1_0_2_1_3_0_1_0_2_0_0_0_N/6ef3b80f3039c31434fab38189eb2b4c.mp4'], // 一般为短视频 10~60秒
                                link: ['http://www.adzop.com/', 'https://www.lincoln.com.cn/?searchid=CPC_290716_PCKW_bd_AMC_BN_baojia_ID2332']
                            }
                        },
                        // 清晰度设置
                        definitionSetting: {
                            firstRate: {
                                text: '超清',
                                //url: 'http://192.168.1.22/mp4/1513751254948171/59de1b7672fa8a90feaba0649daf1131/1_720_25_H264_1001_4_3_1_0_2_1_3_0_1_0_2_0_0_0_N/a28ecbdaffa819dfa0747362002be70e.mp4'
                                url: 'http://127.0.0.1:8080/videoTest/flv/720-flv.flv'
                            },
                            allRate: [{
                                text: '超清',
                                //url: 'http://192.168.1.22/mp4/1513751254948171/59de1b7672fa8a90feaba0649daf1131/1_720_25_H264_1001_4_3_1_0_2_1_3_0_1_0_2_0_0_0_N/a28ecbdaffa819dfa0747362002be70e.mp4'
                                url: 'http://127.0.0.1:8080/videoTest/flv/720-flv.flv'
                            }, {
                                text: '高清',
                                //url: 'http://192.168.1.22/mp4/1513751254948171/59de1b7672fa8a90feaba0649daf1131/1_480_25_H264_501_4_3_1_0_2_1_3_0_1_0_2_0_0_0_N/e6b9698c18194b0b335528187e754701.mp4'
                                url: 'http://127.0.0.1:8080/videoTest/flv/480-flv.flv'
                            }, {
                                text: '标清',
                                //url: 'http://192.168.1.22/mp4/1513751254948171/59de1b7672fa8a90feaba0649daf1131/1_240_25_H264_251_4_3_1_0_2_1_3_0_1_0_2_0_0_0_N/236bee535e7b0e5d56e4f1f30c0ae721.mp4'
                                url: 'http://127.0.0.1:8080/videoTest/flv/240-flv.flv'
                            }, {
                                text: '1080P',
                                url: 'http://127.0.0.1:8080/videoTest/flv/1080-flv.flv'
                                //url: 'http://192.168.1.22/mp4/1513751254948171/59de1b7672fa8a90feaba0649daf1131/1_1080_30_H264_4001_4_9_1_0_2_1_3_0_1_0_2_0_0_0_N/68a5efa25c13f01591f6d61dc8a717d5.mp4'
                            }]
                        },
                        vrSetting: {
                            vrSwitch: false,
                            vrControl: true,
                            vrMode: 0
                        },
                        // 面板设置 - logo显示，开/关灯，分享到社交平台等
                        panelSetting: {
                            logo: {
                                isShow: true,
                                src: 'http://127.0.0.1:8080/testFile/images/logo.jpg',
                                position: 'top-right' // top-left / top-right / bottom-left / bottom-right
                            },
                            light: {
                                isShow: true
                            },
                            share: {
                                isShow: true, // true - false
                                options: '1|1|1|1|1|1', // 1 显示，0 不显示； 分享小插件图标新浪，腾讯微博，qq空间，微信，qq，人人网
                                copy: "http://112.49.34.6:11803/yzplayerAction!play2.action?autoPlay=false$#$userVideoID=181548|<iframe marginWidth=0 marginHeight=0 src=http://112.49.34.6:11803/yzplayerAction!play2.action?autoPlay=false$#$iframe=iframe$#$userVideoID=181548 frameBorder=0 width=900 scrolling=no height=600 allowTransparency><\/iframe>",
                                links: "http://service.weibo.com/share/share.php?url=http://112.49.34.6:11803/yzplayerAction!play2.action?autoPlay=false$#$userVideoID=181548$#$title=周华健感冒灵广告片9$#$pic=http://112.49.34.6:1880/img/admin/a429cb7b70bdfb5563cfc770ef3c7cad/thumbnail.jpg|http://share.v.t.qq.com/index.php?c=share$#$atx=index$#$url=http://112.49.34.6:11803/yzplayerAction!play2.action?autoPlay=false$#$userVideoID=181548$#$title=周华健感冒灵广告片9$#$pic=http://112.49.34.6:1880/img/admin/a429cb7b70bdfb5563cfc770ef3c7cad/thumbnail.jpg|http://sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzshare_onekey?url=http://112.49.34.6:11803/yzplayerAction!play2.action?autoPlay=false$#$userVideoID=181548$#$title=周华健感冒灵广告片9$#$pics=http://112.49.34.6:1880/img/admin/a429cb7b70bdfb5563cfc770ef3c7cad/thumbnail.jpg|http://s.jiathis.com/?webid=weixin$#$url=http://112.49.34.6:11803/yzplayerAction!play2.action?autoPlay=false$#$userVideoID=181548$#$title=周华健感冒灵广告片9$#$isexit=false|http://connect.qq.com/widget/shareqq/index.html?url=http://112.49.34.6:11803/yzplayerAction!play2.action?autoPlay=false$#$userVideoID=181548$#$title=周华健感冒灵广告片9$#$pics=http://112.49.34.6:1880/img/admin/a429cb7b70bdfb5563cfc770ef3c7cad/thumbnail.jpg|http://share.renren.com/share/buttonshare.do?link=http://112.49.34.6:11803/yzplayerAction!play2.action?autoPlay=false$#$userVideoID=181548$#$title=周华健感冒灵广告片9$#$pic=http://112.49.34.6:1880/img/admin/a429cb7b70bdfb5563cfc770ef3c7cad/thumbnail.jpg"
                            }
                        },
                        screenshotsSetting: {
                            displayState: false, // 显示状态 - true / false
                            serviceUrl: 'http://127.0.0.1:8080/videoTest/flv/Screenshots', // 截图存放服务器地址
                            suffix: '.jpg', // 默认后缀格式为 .jpg
                            prefix: 'myvideo', // 默认前缀名称为 myvideo
                            timeout: 300
                        }
                    });
                    playerNew = player;
                    $parentRenderItem.data('player', player);
                    break;
                case 'HlsJs':
                    var player = $parentRenderItem.videoPlayer({
                        videoUrl: oVideoUrl.hls
                    });
                    $parentRenderItem.data('player', player);
                    break;
                case 'Flash':
                    var player = $parentRenderItem.videoPlayer({
                        videoUrl: oVideoUrl.flash,
                        playerType: 'Flash'
                    });
                    $parentRenderItem.data('player', player);
                    break;
                default: break;
            }
        }
    } else {
        var curPlayer = $parentRenderItem.data('player');
        $parentRenderItem.removeData('player');
        curPlayer.destroy();
    }
    $this.toggleClass('ant-switch-checked');
}

function setStreamUrl() {

    var hostName = $('input[name="hostName"]').val(),
        appName = $('input[name="appName"]').val(),
        streamName = $('input[name="streamName"]').val(),
        palyerType = '', // 'Flash' - 'FlvJs' - 'HlsJs'
        flashPort = '1935',
        flvPort = '7001',
        hlsPort = '7002',
        onDemandPort = '8080',
        videoServerPath = 'videoTest',
        liveStreamUrl = {
            RTMP: 'rtmp://' + hostName + ':' + flashPort + '/' + appName + '/' + streamName,
            // RTMP: 'rtmp://live.hkstv.hk.lxdns.com/live/hks',
            HTTPFLV: 'http://' + hostName + ':' + flvPort + '/' + appName + '/' + streamName + '.flv',
            HLS: 'http://' + hostName + ':' + hlsPort + '/' + appName + '/' + streamName + '.m3u8'
            // HLS: 'http://ivi.bupt.edu.cn/hls/cctv6hd.m3u8'
            // HLS: 'http://27.152.181.77:490/22490906_22490906_22902_0_0_15013.m3u8?uuid=e27009d73ef642b0b71a1ff13eb28d21&org=yyweb&m=097797f12c8e52a1400fc1ce052efc48&r=331508567&v=1&t=1504764367&uid=0&ex_audio=0&ex_coderate=700&ex_spkuid=0'
        },
        oVideoUrl = {
            flash: 'https://cdn.memorieslab.com//video/mgn_brand_video.mp4',
            flv: 'http://' + hostName + ':' + onDemandPort + '/videoTest/flv/720-flv.flv',
            // flv: 'https://cdn.memorieslab.com//video/mgn_brand_video.mp4',
            // flv: 'http://' + hostName + ':' + onDemandPort + '/videoTest/神奇女侠.mp4',
            // hls: 'http://ivi.bupt.edu.cn/hls/cctv5hd.m3u8'
            //hls: 'http://' + hostName + ':' + onDemandPort + '/videoTest/m3u8/xmpolice.m3u8',
            hls: 'https://cdn.memorieslab.com//video/mgn_brand_video.mp4'
            //hls: 'http://' + hostName + ':' + onDemandPort + '/videotest/mgn_brand_video.mp4'
            //hls: 'http://cdn.simope.net/hls/1482227427575463/50a672b9edffa2b5ee6377d054557c3a/1_720_25_H264_1200_4_3_1_0_2_1_3_0_1_0_2_0_0_0_N/1bc4faadc6ca4e60b22b93d891386ea9.m3u8'
            //hls: "http://192.168.1.22/mp4/1513751254948171/59de1b7672fa8a90feaba0649daf1131/1_720_25_H264_1001_4_3_1_0_2_1_3_0_1_0_2_0_0_0_N/a28ecbdaffa819dfa0747362002be70e.mp4"
        };

    window.liveStreamUrl = liveStreamUrl;
    window.oVideoUrl = oVideoUrl;
}