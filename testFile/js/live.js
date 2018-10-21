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
                        barrageSetting: {
                            isShow: true,
                            videoInfo: {
                                videoName: 'liveTest',
                                videoId: 999
                            },
                            serverUrl: 'http://47.75.107.96:3001'
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
                        videoUrl: oVideoUrl.flv,
                        skinSetting: {
                            skinName: 'default', // 优雅(elegant)、科技(technology)、简洁(concise)
                            skinColor: 'default' // (#1289f7)  /   (#30D2FA) /    (#10CA56)
                        },
                        // 全景相关配置
                        vrSetting: {
                            vrSwitch: false,  // vr开关 - 默认关闭
                            vrControl: true, // vrControl切换条是否展示
                            vrMode: 0  // vrMode(全景类型--0：全景,1：半景,2：小行星,3：鱼眼);
                        }
                    });
                    playerNew = player;
                    $parentRenderItem.data('player', player);
                    break;
                case 'HlsJs':
                    var player = $parentRenderItem.videoPlayer({
                        videoUrl: oVideoUrl.hls,
                        skinSetting: {
                            skinName: 'default', // 优雅(elegant)、科技(technology)、简洁(concise)
                            skinColor: 'default' // (#1289f7)  /   (#30D2FA) /    (#10CA56)
                        }
                    });
                    playerNew = player;
                    $parentRenderItem.data('player', player);
                    break;
                case 'Flash':
                    var player = $parentRenderItem.videoPlayer({
                        videoUrl: oVideoUrl.flash,
                        playerType: 'Flash'
                    });
                    playerNew = player;
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
            // hls: 'https://cdn.memorieslab.com/video/mgn_brand_video.mp4'
            hls: 'http://' + hostName + ':' + onDemandPort + '/videoTest/m3u8/xmpolice.m3u8'
            // hls: 'http://' + hostName + ':' + onDemandPort + '/videoTest/mp4/265809.mp4'
            // hls: 'http://127.0.0.1:8080/videoTest/mp4/265809.mp4'
            //hls: 'http://cdn.simope.net/hls/1482227427575463/50a672b9edffa2b5ee6377d054557c3a/1_720_25_H264_1200_4_3_1_0_2_1_3_0_1_0_2_0_0_0_N/1bc4faadc6ca4e60b22b93d891386ea9.m3u8'
            //hls: "http://192.168.1.22/mp4/1513751254948171/59de1b7672fa8a90feaba0649daf1131/1_720_25_H264_1001_4_3_1_0_2_1_3_0_1_0_2_0_0_0_N/a28ecbdaffa819dfa0747362002be70e.mp4"
        };

    window.liveStreamUrl = liveStreamUrl;
    window.oVideoUrl = oVideoUrl;
}