/* eslint-env node */

'use strict';

var _ = require('lodash');
var gulp = require('gulp');
var gutil = require('gulp-util');
var runSequence = require('run-sequence');


// Task sequences
//------------------------------------------------------------------------------

gulp.task('default', function(done) {
  runSequence('lint', 'test', done);
});


// Config
//------------------------------------------------------------------------------

var config = {};

// Paths
config.path = {};
config.path.root = require('path').resolve(__dirname) + '/';
config.path.lib = config.path.root + 'lib/';
config.path.test = config.path.root + 'test/';
config.path.spec = config.path.test + 'spec/';

// Package
config.pkg = require(config.path.root + 'package.json');


// Logging
//------------------------------------------------------------------------------

var notify = require('gulp-notify');

var logger = {
  'error': function(error) {
    notify.onError({
      'title': '❌  ' + error.plugin,
      'message': logger.format(error.message)
    }).call(this, error);
  },
  'format': function() {
    return [].slice.call(arguments).join(' ').replace(config.path.root, '', 'g');
  },
  'log': function() {
    gutil.log.call(null, logger.format.apply(null, arguments));
  },
  'success': function(plugin, message) {
    gulp.src('').pipe(notify({ // gulp.src is a hack to get pipes working w/out a real stream
      'title': '✅  ' + plugin,
      'message': 'OK: ' + logger.format(message)
    }));
  }
};


// Lint
//------------------------------------------------------------------------------

var eslint = require('gulp-eslint');

gulp.task('lint', function() {
  return gulp.src([
    config.path.root + config.pkg.main,
    config.path.lib + '**/*.js',
    config.path.spec + '**/*.js',
    config.path.root + 'gulpfile.js'
  ])
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.format(function(files) {
      var error = false;

      _.forEach(files, function(file) {
        error = file.messages.length > 0;

        if (error) {
          logger.error.call(this, new gutil.PluginError('lint', {
            'message': file.filePath + ':' + file.messages[0].line + ' - ' + file.messages[0].message
          }));

          return false; // (break)
        }
      }.bind(this));

      if (!error) {
        logger.success('lint', 'ESLint passed');
      }
    }.bind(this)))
    .pipe(eslint.failOnError());
});


// Test
//------------------------------------------------------------------------------

var mocha = require('gulp-spawn-mocha');

gulp.task('test', function() {
  return gulp.src([config.path.spec + '**/*.js'], {'read': false})
    .pipe(mocha({
      'R': 'spec',
      'istanbul': {'dir': config.path.test + 'coverage/'}
    }));
});


// Watch
//------------------------------------------------------------------------------

var chokidar = require('chokidar');

gulp.task('watch', function() {
  runSequence('lint', 'test');

  chokidar.watch([
    config.path.root + config.pkg.main,
    config.path.lib + '**/*.js',
    config.path.spec + '**/*.js'
  ], {'ignoreInitial': true}).on('all', function(event, path) {
    logger.log(event, gutil.colors.magenta(path));
    runSequence('lint', 'test');
  });
});
