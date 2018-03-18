
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');

module.exports = {
    mode: 'development',
    entry: './src/js/yzH5player.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'videoPlayer.js',
        library: 'videoPlayer',
        libraryExport: 'default',
        libraryTarget: 'umd'
    },
    externals: {
        jquery: 'jQuery', // dom操作，dom事件
        flvjs: 'flvjs', // 提供对 .flv  格式视频点直播的支持
        hls: 'Hls',     // 提供对 .m3u8 格式视频的支持
        io: 'io',       // 提供与弹幕服务器的交互支持
        qrcode: 'QRCode'// qrcode
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                loader: "babel-loader"
            },
            {
                test: /\.scss$/,
                use: [{
                    loader: "style-loader" // 将 JS 字符串生成为 style 节点
                }, {
                    loader: "css-loader" // 将 CSS 转化成 CommonJS 模块
                }, {
                    loader: "sass-loader" // 将 Sass 编译成 CSS
                }]
            },
            {
                test: /\.(png|svg|gif|jpg)$/,
                use: [
                    'file-loader'
                ]
            }
        ]
    },
    plugins: [
        new CleanWebpackPlugin('dist'),
        new HtmlWebpackPlugin({
            title: 'yz-h5player'
        })
    ]
};