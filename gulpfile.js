var gulp = require('gulp');
var merge = require('merge-stream');
var fs = require('fs');
const $ = require('gulp-load-plugins')();
var browserSync = require('browser-sync').create();
const del = require('del');
const runSequence = require('run-sequence');
var reload = browserSync.reload;

gulp.task('minify', () => {
  return gulp.src(['dist/xwingcodex/*.html', 'dist/xwingcodex/**/*.html'])
    .pipe($.if(/\.js$/, $.uglify({compress: {drop_console: true}})))
    .pipe($.if(/\.css$/, $.cssnano({safe: true, autoprefixer: false})))
    .pipe($.if(/\.html$/, $.htmlmin({
      collapseWhitespace: true,
      minifyCSS: true,
      minifyJS: {compress: {drop_console: true}},
      processConditionalComments: true,
      removeComments: true,
      removeEmptyAttributes: true,
      removeScriptTypeAttributes: true,
      removeStyleLinkTypeAttributes: true
    })))
    .pipe(gulp.dest('dist/xwingcodex'));
});

//FIXME move to browserify
// we're not going to bundle flag-icon-css because
// a) it references a relative path not in the same folder and is a PITA
// b) it just works when used directly from cdnjs
gulp.task('bundleCSS', function() {
    var fourbythree = gulp.src('bower_components/flag-icon-css/flags/4x3/*.svg')
      .pipe($.debug({title: 'Copying flag: ', showFiles: true}))
      .pipe(gulp.dest('dist/xwingcodex/styles/flags/4x3'));
    var onebyone = gulp.src('bower_components/flag-icon-css/flags/1x1/*.svg')
      .pipe($.debug({title: 'Copying flag: ', showFiles: true}))
      .pipe(gulp.dest('dist/xwingcodex/styles/flags/1x1'));
    var othercss = gulp.src('dist/xwingcodex/styles/*.css')
      .pipe($.debug({title: 'Bundling CSS: ', showFiles: true}))
      .pipe(gulp.dest('dist/xwingcodex/styles'));
    return merge(fourbythree, onebyone, othercss);
});

gulp.task('assets:stylus', function() {
    return gulp.src(['app/styles/*.styl'])
        .pipe($.plumber({
            handleError: function (err) {
                console.log(err);
                this.emit('end');
            }
        }))
        .pipe($.sourcemaps.init())
        .pipe($.stylus({
            paths: ['.', './node_modules/bootstrap-styl']
        }))
        .pipe($.autoprefixer())
        //.pipe($.csscomb())
        //.pipe($.mergeMediaQueries({log:true}))
        .pipe($.concat('main.css'))
        .pipe($.sourcemaps.write())
        .pipe(gulp.dest('dist/xwingcodex/styles'))
        .pipe(reload({stream:true}))
});

gulp.task('assets:js', function() {
    return gulp.src(['app/scripts/*.js'])
        .pipe($.plumber({
            handleError: function (err) {
                console.log(err);
                this.emit('end');
            }
        }))
        //FIXME sourcemaps?
        //.pipe(sourcemaps.init({loadMaps: true}))
        .pipe($.browserify())
        .pipe(gulp.dest('dist/xwingcodex/scripts'))
        .pipe($.rename({
            suffix: '.min'
        }))
        .pipe($.uglify())
        //.pipe(sourcemaps.write('./'))
        .pipe(gulp.dest('dist/xwingcodex/scripts'))
        .pipe(reload({stream: true}));
});

var translate = function(index, filepattern, defaultLang, dest) {
    var defaultLang = gulp.src(index)
        .pipe($.international({
            delimiter: {
                prefix: '${',
                suffix: '}'
            },
            encodeEntities: false,
            filename: filepattern,
            locales: './.tmp/locales',
            whitelist: defaultLang
        }))
        .pipe(gulp.dest(dest));
    var allLangs = gulp.src(index)
        .pipe($.international({
            delimiter: {
                prefix: '${',
                suffix: '}'
            },
            encodeEntities: false,
            filename: '${lang}/' + filepattern,
            locales: './.tmp/locales',
        }))
        .pipe(gulp.dest(dest));
    return merge(defaultLang, allLangs);
};

gulp.task('translate:merge', function() {
    var en = gulp.src('lang/en/*.json')
        .pipe($.mergeJson({
            fileName: "en.json"
        }))
        .pipe(gulp.dest('./.tmp/locales'));
    var de = gulp.src('lang/de/*.json')
        .pipe($.mergeJson({
            fileName: "de.json"
        }))
        .pipe(gulp.dest('./.tmp/locales'));
    return merge(en, de);
});

gulp.task('translate:layouts', function() {
    return translate(['app/layouts/*.pug'], 'layouts/${name}.${ext}', 'en', './.tmp');
});

gulp.task('translate:official', function() {
    return translate(['app/official/*.pug'], 'official/${name}.${ext}', 'en', './.tmp');
});

gulp.task('translate:unofficial', function() {
    return translate(['app/unofficial/*.pug'], 'unofficial/${name}.${ext}', 'en', './.tmp');
});

gulp.task('translate:index', function() {
    return translate(['app/*.pug'], '${name}.${ext}', 'en', './.tmp');
});

gulp.task('translate', () => {
    return new Promise(resolve => {
        dev = false;
        runSequence('translate:merge', 'translate:layouts', 'translate:official', 'translate:unofficial', 'translate:index', resolve);
    });
});

gulp.task('pug', function() {
    return gulp.src(['.tmp/*.pug', '.tmp/**/*.pug', '!.tmp/layout.pug', '!.tmp/**/layout.pug'])
	    .pipe($.plumber())
        .pipe($.pug({pretty: true}))
        .pipe(gulp.dest('dist/xwingcodex/'))
        .pipe(reload({stream: true}));
});

gulp.task('assets:images', function() {
    return gulp.src(['app/images/*'])
        .pipe($.plumber({
            handleError: function (err) {
                console.log(err);
                this.emit('end');
            }
        }))
        .pipe($.cache($.imagemin()))
        .pipe(gulp.dest('dist/xwingcodex/images'))
        .pipe(reload({stream: true}));
});

gulp.task('clean', del.bind(null, ['dist', '.tmp']));

gulp.task('serve', () => {
    browserSync.init({
        notify: false,
        port: 9000,
        server: {
            baseDir: ["dist"],
            index: "xwingcodex/index.html"
        }
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
        runSequence('clean', 'translate', 'pug', 'assets:images', 'assets:js', 'assets:stylus', resolve);
    });
});

gulp.task('deploy', () => {
  return gulp.src('dist/xwingcodex/**')
    .pipe($.debug({title: 'Deploying:', showFiles: true}))
    .pipe($.ghPages());
});