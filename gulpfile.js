var gulp = require('gulp');
var merge = require('merge-stream');
const $ = require('gulp-load-plugins')();
var browserSync = require('browser-sync').create();
const del = require('del');
const runSequence = require('run-sequence');
var reload = browserSync.reload;

//if node version is lower than v.0.1.2
require('es6-promise').polyfill();

gulp.task('minify', () => {
  return gulp.src(['dist/*.html', 'dist/**/*.html'])
    .pipe($.useref({searchPath: ['dist', '.']}))
    //.pipe($.if(/\.js$/, $.uglify({compress: {drop_console: true}})))
    //.pipe($.if(/\.css$/, $.cssnano({safe: true, autoprefixer: false})))
    .pipe($.if(/\.html$/, $.htmlmin({
      collapseWhitespace: true,
    //  minifyCSS: true,
    //  minifyJS: {compress: {drop_console: true}},
      processConditionalComments: true,
      removeComments: true,
      removeEmptyAttributes: true,
      removeScriptTypeAttributes: true,
      removeStyleLinkTypeAttributes: true
    })))
    .pipe(gulp.dest('dist'));
});

gulp.task('bundleJavaScript', function() {
    return gulp.src('dist/xwingcodex/scripts/**')
      .pipe($.debug({title: 'Bundling JS:', showFiles: true}))
      .pipe(gulp.dest('dist/scripts'));
    //var rmdir = del(['dist/xwingcodex/scripts']);
    //return merge(script, rmdir);
});

// we're not going to bundle flag-icon-css because
// a) it references a relative path not in the same folder and is a PITA
// b) it just works when used directly from cdnjs
gulp.task('bundleCSS', function() {
    var fourbythree = gulp.src('bower_components/flag-icon-css/flags/4x3/*.svg')
      .pipe($.debug({title: 'Copying flag: ', showFiles: true}))
      .pipe(gulp.dest('dist/styles/flags/4x3'));
    var onebyone = gulp.src('bower_components/flag-icon-css/flags/1x1/*.svg')
      .pipe($.debug({title: 'Copying flag: ', showFiles: true}))
      .pipe(gulp.dest('dist/styles/flags/1x1'));
    var othercss = gulp.src('dist/xwingcodex/styles/*.css')
      .pipe($.debug({title: 'Bundling CSS: ', showFiles: true}))
      .pipe(gulp.dest('dist/styles'));
    return merge(fourbythree, onebyone, othercss);
});

gulp.task('bundlejs', function() {
    return gulp.src(["bower_components/bootstrap-stylus/js/**/*.js"])
        .pipe($.plumber({
            handleError: function (err) {
                console.log(err);
                this.emit('end');
            }
        }))
        //.pipe($.uglify())
        .pipe($.concat('bootstrap.js'))
        .pipe($.browserify())
        .pipe(gulp.dest('dist/scripts/vendor'))
        .pipe(reload({stream: true}));
});

gulp.task('stylus', function() {
    return gulp.src(['app/styles/*.styl'])
        .pipe($.plumber({
            handleError: function (err) {
                console.log(err);
                this.emit('end');
            }
        }))
        .pipe($.sourcemaps.init())
        .pipe($.stylus({
            paths: ['.', './bower_components/bootstrap-stylus']
        }))
        .pipe($.autoprefixer())
        //.pipe($.csscomb())
        //.pipe($.mergeMediaQueries({log:true}))
        //.pipe($.concat('main.css'))
        .pipe($.sourcemaps.write())
        .pipe(gulp.dest('dist/styles'))
        .pipe(reload({stream:true}))
});

gulp.task('js', function() {
    return gulp.src(['app/scripts/*.js'])
        .pipe($.plumber({
            handleError: function (err) {
                console.log(err);
                this.emit('end');
            }
        }))
        .pipe($.browserify())
        .pipe(gulp.dest('dist/scripts'))
        .pipe($.rename({
            suffix: '.min'
        }))
        .pipe($.uglify())
        .pipe(gulp.dest('dist/scripts'))
        .pipe(reload({stream: true}));
});

gulp.task('pug', function() {
    return gulp.src(['app/*.pug', 'app/**/*.pug', '!app/layouts', '!app/layouts/*.pug'])
	    .pipe($.plumber())
        .pipe($.pug({pretty: true}))
        .pipe($.htmlI18n({
            createLangDirs: true,
            langDir: './lang',
            trace: true,
            defaultLang: 'en'
        }))
        .pipe(gulp.dest('dist'))
        .pipe(reload({stream: true}));
});

gulp.task('image', function() {
    return gulp.src(['app/images/*'])
        .pipe($.plumber({
            handleError: function (err) {
                console.log(err);
                this.emit('end');
            }
        }))
        .pipe($.cache($.imagemin()))
        .pipe(gulp.dest('dist/images'))
        .pipe(reload({stream: true}));
});

gulp.task('clean', del.bind(null, ['dist']));

gulp.task('serve', () => {
    browserSync.init({
        notify: false,
        port: 9000,
        server: {
            baseDir: ["dist"],
            routes: {
                '/bower_components': 'bower_components'
            }
        },
        serveStatic: [{
            route: "/xwingcodex",
            dir: 'dist'
        }]
    });
    gulp.watch('app/scripts/*.js',['js']);
    gulp.watch('app/styles/*.styl',['stylus']);
    gulp.watch('app/**/*.pug',['pug']);
    gulp.watch('app/*.pug',['pug']);
    gulp.watch('app/images/*',['image']);
});

gulp.task('default', () => {
    return new Promise(resolve => {
        dev = false;
        runSequence('clean', 'pug', 'image', 'js', 'stylus', 'minify', 'bundleJavaScript', resolve);
    });
});

gulp.task('deploy', () => {
  return gulp.src('dist/**')
    .pipe($.debug({title: 'Deploying:', showFiles: true}))
    .pipe($.ghPages());
});