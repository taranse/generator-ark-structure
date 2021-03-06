const gulp = require('gulp');
const data = require('gulp-data');
const fs = require('fs');

const through = require('through2')
const PluginError = require('plugin-error')
const replaceExt = require('replace-ext')
const edge = require('edge.js')
const {resolve, basename, extname} = require('path')
const {silent: resolveFrom} = require('resolve-from')
const importFresh = require('import-fresh')

function gulpEdge(data, opts = {}) {
  return through.obj((file, enc, cb) => {
    let dataObject = {};
    let appDataObject = {};
    if (file.isNull()) return cb(null, file)
    if (file.isStream()) return cb(new PluginError('gulp-edgejs', 'Streaming not supported!'))
    if (opts.globals) Object.entries(opts.globals).forEach(([key, val]) => edge.global(key, val))

    if (Array.isArray(opts.tags)) opts.tags.forEach((tag) => edge.tag(tag))

    if (typeof data === 'string') {
      const cwd = process.cwd()
      const load = opts.refresh ? importFresh : require
      try {
        appDataObject = load(resolveFrom(cwd, resolve(data, 'app_data')));
        dataObject = load(resolveFrom(cwd, resolve(data, basename(file.path, extname(file.path)))))

        dataObject = Object.assign(dataObject || {}, appDataObject || {});
      } catch (err) {
        dataObject = {}
      }
    } else {
      dataObject = Object.assign(Object(data), file.data)
    }

    if (file.path) {
      file.path = replaceExt(file.path, opts.ext === '' ? '' : '.' + (opts.ext || 'html'))
    }

    edge.registerViews(opts.views || opts.path || file.base)
    try {
      file.contents = Buffer.from(edge.renderString(String(file.contents), dataObject))
    } catch (err) {
      return cb(new PluginError('gulp-edgejs', err, {fileName: file.path}))
    }

    cb(null, file)
  })
}


gulp.task('edge', () => {
  return gulp.src('./front/templates/*.edge')
    .pipe(gulpEdge('./data/', {refresh: true}))
    .pipe(gulp.dest('./dist'));
});