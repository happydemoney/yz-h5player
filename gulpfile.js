const gulp = require('gulp');

// 加载gulp-load-plugins插件，并马上运行它
const plugins = require('gulp-load-plugins')();

// css雪碧图处理插件
const spritesmith = require('gulp.spritesmith');

// 任务 - js lib 文件合并压缩
gulp.task("jsLibUglify", function () {
    // 把src下js文件合并压缩为videoPlayer.js，输出到dist/js目录下
    gulp.src('src/js/lib/*.js')
        .pipe(plugins.uglify()) // 压缩
        .pipe(gulp.dest('dist/lib/'));
});

// 任务  - css文件压缩
gulp.task('cssMinify', function () {

    // css文件压缩 minifyCss
    gulp.src('src/css/*.css')   // 要压缩的css文件
        .pipe(plugins.minifyCss()) //使用minifyCss进行压缩
        .pipe(gulp.dest('dist/css')); // 压缩之后存放文件的路径
});

// 任务  -  js代码检查
gulp.task('jsLint', function () {
    gulp.src('src/js/**/*.js')
        .pipe(plugins.jshint())
        .pipe(plugins.jshint.reporter()); // 输出检查结果
});

/* 开发环境任务 */
// 皮肤雪碧图制作 - 优雅 - 科技 - 简洁
gulp.task('devBuild', ['cleanSrcSkin'], function () {
    gulp.start('spriteElegant', 'spriteTechnology', 'spriteConcise', 'sassCompile');
});

gulp.task('cleanSrcSkin', function () {
    return del([
        'src/css/skin/*'
    ]);
});

// 任务 - 皮肤雪碧图 - 优雅
gulp.task('spriteElegant', function () {
    return gulp.src('src/css/skinSrc/elegant/*')
        .pipe(spritesmith({
            'imgName': 'skinElegant.png',
            'cssName': 'skinElegant.css',
            'padding': 5 //合并时两张图片的距离
        }))
        .pipe(gulp.dest('src/css/skin'));
});
// 任务 - 皮肤雪碧图 - 科技
gulp.task('spriteTechnology', function () {
    return gulp.src('src/css/skinSrc/technology/*')
        .pipe(spritesmith({
            'imgName': 'skinTechnology.png',
            'cssName': 'skinTechnology.css',
            'padding': 5 //合并时两张图片的距离
        }))
        .pipe(gulp.dest('src/css/skin'));
});
// 任务 - 皮肤雪碧图 - 简洁
gulp.task('spriteConcise', function () {
    return gulp.src('src/css/skinSrc/concise/*')
        .pipe(spritesmith({
            'imgName': 'skinConcise.png',
            'cssName': 'skinConcise.css',
            'padding': 5 //合并时两张图片的距离
        }))
        .pipe(gulp.dest('src/css/skin'));
});
// 任务 - 分享图标合集
gulp.task('spriteShareIcon', function () {
    return gulp.src('src/css/skinSrc/shareIcon/*')
        .pipe(spritesmith({
            'imgName': 'shareIcon.png',
            'cssName': 'shareIcon.css',
            'padding': 5 //合并时两张图片的距离
        }))
        .pipe(gulp.dest('src/css/skin'));
});

// 任务 - sass编译
gulp.task('sassCompile', function () {
    return gulp.src('src/css/*.scss')
        .pipe(plugins.sass())
        .pipe(gulp.dest('src/css'));
});