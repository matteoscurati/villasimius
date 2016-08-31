'use strict';

const gulp = require('gulp');

const $ = require('gulp-load-plugins')();
const argv = require('yargs').argv;
const autoprefixer = require('autoprefixer');
const babelify = require('babelify');
const browserify = require('browserify');
const browserSync = require('browser-sync');
const buffer = require('vinyl-buffer');
const del = require('del');
const exec = require('child_process').exec;
const fs = require('fs');
const gulpif = require('gulp-if');
const gulpsync = require('gulp-sync')(gulp);
const gutil = require('gulp-util');
const imagemin = require('gulp-imagemin');
const jshint = require('gulp-jshint');
const lodash = require('lodash');
const lwip = require('gulp-lwip');
const notify = require('gulp-notify');
const postcss = require('gulp-postcss');
const sass = require('gulp-sass');
const source = require('vinyl-source-stream');
const sourcemaps = require('gulp-sourcemaps');
const spritesmith = require('gulp.spritesmith');
const stylish = require('jshint-stylish');
const uglify = require('gulp-uglify');
const watchify = require('watchify');

const production = !!argv.production;

const build = argv._.length ? argv._[0] === 'build' : false;
const watch = argv._.length ? argv._[0] === 'watch' : true;

const reload = browserSync.reload;

const handleError = function(task) {
  return (err) => {
    notify.onError({
      message: task + ' failed, check the logs..',
        sound: false
      })(err);
    gutil.log(gutil.colors.bgRed(task + ' error:'), gutil.colors.red(err));
  };
};

const src = 'source/assets';
const dist = 'source/dist';

const tasks = {
  clean: (callback) => {
    del([ dist, 'temp/' ]).then(() => {
      callback();
    });
  },
  sass: () => {
    return gulp.src( src + '/stylesheets/application.sass')
      .pipe(gulpif(!production, sourcemaps.init()))
      .pipe(sass({
        sourceComments: !production,
        outputStyle: production ? 'compressed' : 'nested'
      }))
      .on('error', handleError('sass'))
      .pipe(gulpif(!production, sourcemaps.write({
        'includeContent': false,
        'sourceRoot': '.'
      })))
      .pipe(gulpif(!production, sourcemaps.init({
        'loadMaps': true
      })))
      .pipe(postcss([autoprefixer({browsers: ['last 2 versions']})]))
      .pipe(sourcemaps.write({
        'includeContent': true
      }))
      .pipe(gulp.dest( dist + '/stylesheets'));
  },
  fonts: () => {
    return gulp.src( src + '/fonts/**/*')
      .on('error', handleError('fonts'))
      .pipe(gulp.dest( dist + '/fonts'));
  },
  images: () => {
    return gulp.src( src + '/images/**/*')
      .on('error', handleError('images'))
      .pipe(gulp.dest( dist + '/images'));
  },
  iconfont: () => {
    return gulp.src( src + '/fonts/svg/*.svg')
      .on('error', handleError('svg'))
      .pipe($.iconfont({
        fontName: 'icons',
        appendCodepoints: false,
        normalize: true
      }))
      .on('glyphs', (glyphs) => {
        gulp.src('.icon-glyphs-template')
        .pipe($.template({ glyphs: glyphs }))
        .pipe($.rename("_icon-glyphs.scss"))
        .pipe(gulp.dest( src + '/stylesheets/variables'))
      })
      .pipe(gulp.dest( dist + '/fonts'));
  },
  sprites: (cb) => {
    gulp.src( src + '/images/sprites/*.png')
      .on('error', handleError('sprites'))
      .pipe(spritesmith({
        imgName: src + '/images/sprites-2x.png',
        cssName: src + '/stylesheets/variables/_sprites.scss'
      }))
      .pipe(gulp.dest('.'))
      .on('end', () => {
        gulp.src( src + '/images/sprites/*.png')
          .on('error', handleError('sprites'))
          .pipe(lwip.scale(0.5))
          .pipe(gulp.dest('temp/sprites'))
          .on('end', () => {
            gulp.src('temp/sprites/*.png')
            .on('error', handleError('sprites'))
            .pipe(spritesmith({
              imgName: src + '/images/sprites-1x.png',
              cssName: src + '/stylesheets/variables/_sprites.scss',
              cssTemplate: function(context) {
                var template = lodash.template(fs.readFileSync('.sprites-template', 'utf8'));
                return template(context);
              }
            }))
            .pipe(gulp.dest('.'))
            .on('end', cb)
          });
      });
  },
  browserify: () => {
    var bundler = browserify( src + '/javascripts/application.js.es6', {
      debug: !production,
      cache: {}
    });
    bundler.transform('babelify', {presets: ["es2015"]});
    var build = argv._.length ? argv._[0] === 'build' : false;
    if (watch) {
      bundler = watchify(bundler);
      bundler = bundler
        .on('update', (time) => {
          $.util.log('Rebuilding scripts!');
        })
        .on('log', (msg) => {
          $.util.log(msg);
        });
    }
    var rebundle = () => {
      return bundler.bundle()
        .on('error', handleError('Browserify'))
        .pipe(source('application.js'))
        .pipe(gulpif(production, buffer()))
        .pipe(gulpif(production, uglify()))
        .pipe(gulp.dest( dist + '/javascripts'))
        .pipe(reload({stream:true}));
    };
    bundler.on('update', rebundle);
    return rebundle();
  },
  lintjs: () => {
    return gulp.src([
        'gulpfile.js',
        src + '/javascripts/application.js.es6',
        src + '/javascripts/**/*.js',
        src + '/javascripts/**/*.es6'
      ]).pipe(jshint({
        esversion: 6
      }))
      .pipe(jshint.reporter(stylish))
      .on('error', function() {
        beep();
      });
  },
  optimize: () => {
    return gulp.src( src + '/images/**/*.{gif,jpg,png,svg}')
    .pipe(imagemin({
      progressive: true,
      svgoPlugins: [{removeViewBox: false}],
      optimizationLevel: production ? 3 : 1
    }))
    .pipe(gulp.dest( dist + '/images'));
  }
};

gulp.task('browser-sync', () => {
  browserSync.init({
    proxy: 'localhost:4567',
    reloadDelay: 3500
  });
});

gulp.task('reload-sass', ['sass'], () => {
  browserSync.reload();
});
gulp.task('reload-js', ['browserify'], () => {
  browserSync.reload();
});
gulp.task('reload-fonts', ['fonts'], () => {
  browserSync.reload();
});
gulp.task('reload-images', gulpsync.sync(['optimize', 'images']), () => {
  browserSync.reload();
});
gulp.task('reload-icon', ['iconfont'], () => {
  browserSync.reload();
});
gulp.task('reload-sprites', ['sprites'], () => {
  browserSync.reload();
});
gulp.task('reload-template', () => {
  browserSync.reload();
});

gulp.task('clean', tasks.clean);
gulp.task('runserver', tasks.runserver);
gulp.task('sass', tasks.sass);
gulp.task('fonts', tasks.fonts);
gulp.task('images', tasks.images);
gulp.task('iconfont', tasks.iconfont);
gulp.task('sprites', tasks.sprites);
gulp.task('browserify', tasks.browserify);
gulp.task('lint:js', tasks.lintjs);
gulp.task('optimize', tasks.optimize);

gulp.task('watch',
  gulpsync.sync([
    'clean',
    'browser-sync',
    ['sprites', 'iconfont'],
    ['fonts', 'images'],
    ['sass', 'browserify'],
  ]), () => {
    gulp.watch( src + '/stylesheets/**/*.{sass,scss}', ['reload-sass']);
    gulp.watch( src + '/javascripts/**/*.{js,es6}', ['lint:js']);
    gulp.watch('source/**/*.{html,slim}', ['reload-template']);
    gulp.watch([src + '/fonts/**/*', '!source/assets/fonts/svg/**'], ['reload-fonts']);
    gulp.watch( src + '/fonts/svg/**/*', ['reload-icon']);
    gulp.watch([src + '/images/**/*', '!source/assets/images/sprites/**'], ['reload-images']);
    gulp.watch( src + '/images/sprites/*', ['reload-sprites']);
    gulp.watch( '**/*.{html,slim,rb,yml}', ['reload-template']);
    gutil.log(gutil.colors.bgGreen('Watching for changes...'));
});

gulp.task('default', ['watch'], () => {
  browserSync.reload();
});

gulp.task('build',
  gulpsync.sync([
    'clean',
    'optimize',
    ['sprites', 'iconfont'],
    ['fonts', 'images'],
    'sass',
    'browserify'
  ])
)
