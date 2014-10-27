var gulp = require('gulp');
var browserify = require('browserify');
var source = require("vinyl-source-stream");
var watchify = require('watchify');

var watch = false;

function browserifyShare() {
  var b = browserify({
    cache: {},
    packageCache: {},
    fullPaths: false,
    standalone: 'glur'
  });

  if (watch) {
    // if watch is enable, wrap this bundle inside watchify
    b = watchify(b);
    b.on('update', function () {
      bundleShare(b);
    });
  }

  b.add('./index.js');
  bundleShare(b);
}

function bundleShare(b) {
  b.bundle()
    .pipe(source('glur.js'))
    .pipe(gulp.dest('./dist'));
}

gulp.task('browserify', function () {
  watch = false;
  browserifyShare();
});

gulp.task('browserify-watch', function () {
  watch = true;
  browserifyShare();
});

gulp.task('watch', ['browserify-watch']);