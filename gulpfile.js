var gulp = require('gulp');
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
    return gulp.src('dist/xwingcodex/**/*.js')
      .pipe($.debug({title: 'Bundling JS:', showFiles: true}))
      .pipe($.rename(function (path) {
        path.dirname = 'scripts'
      }))
      .pipe(gulp.dest('dist'));
    //return del(['dist/xwingcodex/scripts'])
});

gulp.task('bundleCSS', function() {
    return gulp.src('dist/xwingcodex/**/*.css')
      .pipe($.debug({title: 'Bundling CSS:', showFiles: true}))
      .pipe($.rename(function (path) {
        path.dirname = 'styles'
      }))
      .pipe(gulp.dest('dist'));
    //return del(['dist/xwingcodex/styles'])
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
    gulp.src(['app/styles/*.styl'])
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
    gulp.src(['app/scripts/*.js'])
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
    gulp.src(['app/*.pug', 'app/**/*.pug', '!app/layouts', '!app/layouts/*.pug'])
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
    gulp.src(['app/images/*'])
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
        //server: "dist"
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
        runSequence('clean', 'pug', 'image', 'js', 'stylus', 'minify', 'bundleCSS', 'bundleJavaScript', resolve);
    });
});

gulp.task('deploy', () => {
  return gulp.src('dist/**/*')
    .pipe($.debug({title: 'Deploying:', showFiles: true}))
    .pipe($.ghPages());
});