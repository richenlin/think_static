/**
 *
 * @author     richen
 * @copyright  Copyright (c) 2017 - <richenlin(at)gmail.com>
 * @license    MIT
 * @version    17/5/2
 */

const fs = require('fs');
const zlib = require('zlib');
const path = require('path');
const crypto = require('crypto');
const lib = require('think_lib');
const mime = require('mime-types');
const compressible = require('compressible');
/**
 * 
 * 
 * @param {any} text 
 * @returns 
 */
const safeDecodeURIComponent = function (text) {
    try {
        return decodeURIComponent(text);
    } catch (e) {
        return text;
    }
};

/**
 * load file and add file content to cache
 *
 * @param {String} name
 * @param {String} dir
 * @param {Object} option
 * @param {Object} files
 * @return {Object}
 * @api private
 */
const loadFile = function (name, dir, option, files) {
    let pathname = path.normalize(path.join(option.prefix, name));
    let obj = files[pathname] = files[pathname] ? files[pathname] : {};
    let filename = obj.path = path.join(dir, name);
    let stats = fs.statSync(filename);

    obj.maxAge = obj.maxAge ? obj.maxAge : option.maxAge || 0;
    obj.type = obj.mime = mime.lookup(pathname) || 'application/octet-stream';
    obj.mtime = stats.mtime;
    obj.length = stats.size;
    obj.md5 = crypto.createHash('md5').update(filename).digest('base64');
    return obj;
};

/**
 * default options
 */
const defaultOptions = {
    dir: '/static', //resource path
    prefix: '/', //resource prefix 
    gzip: true, //enable gzip
    filter: [], //function or (not in)array['.exe', '.zip']
    maxAge: 3600 * 24 * 7, //cache maxAge seconds
    alias: {},  //resource path file alias {key: path}
    preload: true, //preload files
    cache: true //resource cache
};
// custom files list
const __files = Object.create(null);

module.exports = function (options, app) {
    options = options ? lib.extend(defaultOptions, options, true) : defaultOptions;

    // static path
    if (options.dir === '/') {
        options.dir = '/static';
    }
    const dir = options.dir ? path.normalize(`${app.root_path}${options.dir}`) : path.normalize(`${app.root_path}/static`);

    // prefix must be ASCII code
    options.prefix = (options.prefix || '').replace(/\/*$/, '/');
    let filePrefix = path.normalize(options.prefix);

    // option.filter
    let fileFilter = function () {
        return true;
    };
    if (typeof options.filter === 'function') {
        fileFilter = options.filter;
    } else if (Array.isArray(options.filter)) {
        fileFilter = function (file) {
            return options.filter.indexOf(path.extname(file)) === -1;
        };
    }

    // preload files
    if (options.preload) {
        app.once('appReady', () => {
            lib.readDir(dir).filter(fileFilter).map(name => loadFile(name, dir, options, __files));
        });
    }
    // alias files
    if (options.alias) {
        Object.keys(options.alias).map(key => {
            let value = options.alias[key];
            if (__files[value]) {
                __files[key] = __files[value];
            }
        });
    }
    /*eslint-disable consistent-return */
    return function (ctx, next) {
        // only accept HEAD and GET
        if (ctx.method !== 'HEAD' && ctx.method !== 'GET') {
            return next();
        }

        let pathname = ctx.path;
        // ctx.path must be defined
        if (!pathname || pathname === '/') {
            return next();
        }
        // regexp
        if (!/[^\/]+\.+\w+$/.test(pathname)) {
            return next();
        }

        // decode for `/%E4%B8%AD%E6%96%87`
        // normalize for `//index`
        let filename = '';
        try {
            filename = path.normalize(safeDecodeURIComponent(path.normalize(ctx.path)));
        } catch (e) {
            return next();
        }

        let file;
        if (options.cache) {
            file = __files[filename];
        }

        // try to load file
        if (!file) {
            if (path.basename(filename)[0] === '.') {
                return next();
            }
            // check prefix first to avoid calculate
            if (filename.indexOf(filePrefix) !== 0) {
                return next();
            }
            // trim prefix
            filename = filename.slice(filePrefix.length);

            let s;
            try {
                s = fs.statSync(path.join(dir, filename));
            } catch (err) {
                return next();
            }
            if (!s.isFile()) {
                return next();
            }
            // filter
            if ([filename].filter(fileFilter).length) {
                file = loadFile(filename, dir, options, __files);
            } else {
                return next();
            }
        }

        ctx.status = 200;
        if (options.gzip) {
            ctx.vary('Accept-Encoding');
        }

        // 304 
        ctx.response.lastModified = file.mtime;
        if (options.cache) {
            if (file.md5) {
                ctx.response.etag = file.md5;
            }
            if (ctx.fresh) {
                ctx.status = 304;
                return;
            }
            ctx.set('cache-control', 'public, max-age=' + file.maxAge);
        } else {
            ctx.set('cache-control', 'no-cache');
        }

        ctx.set('content-type', file.type);
        ctx.length = file.zipBuffer ? file.zipBuffer.length : file.length;
        file.md5 && ctx.set('content-md5', file.md5);
        if (ctx.method === 'HEAD') {
            return;
        }

        let stream = fs.createReadStream(file.path);
        // enable gzip will remove content length
        if (options.gzip && file.length > 1024 && ctx.acceptsEncodings('gzip') === 'gzip' && compressible(file.type)) {
            ctx.remove('content-length');
            ctx.set('content-encoding', 'gzip');
            ctx.body = stream.pipe(zlib.createGzip());
        } else {
            ctx.body = stream;
        }
        return;
    };
};
