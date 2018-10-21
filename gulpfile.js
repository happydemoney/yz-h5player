const gulp = require('gulp');
//加载gulp-load-plugins插件，并马上运行它
const plugins = require('gulp-load-plugins')();


// 任务 - js文件合并压缩
gulp.task("jsLibUglify", function () {
    // 把src下js文件合并压缩为videoPlayer.js，输出到dist/js目录下
    gulp.src('src/js/lib/*.js')
        .pipe(plugins.uglify()) // 压缩
        .pipe(gulp.dest('dist/lib/'));
});
