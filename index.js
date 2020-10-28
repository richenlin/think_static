/**
 *
 * @author     richen
 * @copyright  Copyright (c) 2017 - <richenlin(at)gmail.com>
 * @license    MIT
 * @version    17/5/2
 */
const path = require('path');
const lib = require('think_lib');
const LRU = require('lru-cache');
const static = require('koa-static-cache');

const files = new LRU({ max: 1000 });

/**
 * default options
 */
const defaultOptions = {
    dir: '/static', // resource path
    prefix: '', // the url prefix you wish to add, default to ''
    alias: {}, // object map of aliases. See below
    gzip: true, // when request's accept-encoding include gzip, files will compressed by gzip.
    usePrecompiledGzip: false, // try use gzip files, loaded from disk, like nginx gzip_static
    buffer: false, // store the files in memory instead of streaming from the filesystem on each request
    filter: [], // (function | array) - filter files at init dir, for example - skip non build (source) files. If array set - allow only listed files
    maxAge: 3600 * 24 * 7, // cache control max age for the files, 0 by default.
    preload: false, // caches the assets on initialization or not, default to true. always work together with options.dynamic.
    cache: false // dynamic load file which not cached on initialization.
};

module.exports = function (options, app) {
    options = options ? lib.extend(defaultOptions, options, true) : defaultOptions;

    // static path
    if (options.dir === '/' || options.dir === '') {
        options.dir = '/static';
    }
    /*eslint-disable consistent-return */
    return static({
        dir: path.join(app.rootPath || process.env.ROOT_PATH || '', options.dir),
        prefix: options.prefix,
        alias: options.alias,
        gzip: options.gzip,
        usePrecompiledGzip: options.usePrecompiledGzip,
        buffer: options.buffer,
        filter: options.filter,
        dynamic: options.cache,
        maxAge: options.maxAge,
        preload: options.preload,
        files: files
    });
};