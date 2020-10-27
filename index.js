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

// files cache list
const __files = Object.create(null);

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
    const obj = {};
    const pathname = path.normalize(path.join(option.prefix, name));
    const filename = obj.path = path.join(dir, name);

    const def = lib.getDefer();
    fs.stat(filename, function (err, stats) {
        if (err) {
            def.reject(err);
        } else {
            obj.maxAge = obj.maxAge ? obj.maxAge : option.maxAge || 0;
            obj.type = obj.mime = mime.lookup(pathname) || 'application/octet-stream';
            obj.mtime = stats.mtime;
            obj.length = stats.size;
            obj.md5 = crypto.createHash('md5').update(filename).digest('base64');
            if (option.cache) {
                files[pathname] = obj;
            }
            def.resolve(obj);
        }
    });

    return def.promise;
};

/**
 *
 *
 * @param {*} ctx
 * @param {*} options
 * @returns
 */
const preParse = async function (ctx, options) {
    // decode for `/%E4%B8%AD%E6%96%87`
    // normalize for `../../index`
    let filename = '';
    try {
        filename = path.normalize(decodeURIComponent(path.normalize(ctx.path)));
    } catch (e) {
        return undefined;
    }

    let file;
    if (options.cache) {
        file = __files[filename];
    }

    // try to load file
    if (!file) {
        if (path.basename(filename)[0] === '.') {
            return null;
        }
        // check prefix first to avoid calculate
        if (filename.indexOf(options.filePrefix) !== 0) {
            return undefined;
        }
        // trim prefix
        filename = filename.slice(options.filePrefix.length);

        try {
            // filter
            if ([filename].filter(options.fileFilter).length) {
                file = await loadFile(filename, options.dir, options, __files);
            } else {
                return null;
            }
        } catch (err) {
            if (filename === 'favicon.ico') {
                return null;
            } else {
                return undefined;
            }
        }
    }
    return file;
};

/**
 *
 *
 * @param {*} file
 * @param {*} ctx
 * @param {*} options
 * @returns
 */
const responseFile = function (file, ctx, options) {
    if (!file) {
        ctx.status = 404;
        return;
    }
    ctx.status = 200;
    if (options.gzip) {
        ctx.vary('Accept-Encoding');
    }

    // 304 
    ctx.response.lastModified = file.mtime;
    if (options.maxAge > 0) {
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

    const stream = fs.createReadStream(file.path);
    // enable gzip will remove content length
    if (options.gzip && ctx.acceptsEncodings('gzip') === 'gzip' && compressible(file.type)) {
        ctx.remove('content-length');
        ctx.set('content-encoding', 'gzip');
        ctx.body = stream.pipe(zlib.createGzip());
    } else {
        ctx.body = stream;
    }
    return;
};

/**
 * default options
 */
const defaultOptions = {
    dir: '/static', //resource path
    prefix: '/', //resource prefix 
    gzip: true, //enable gzip
    filter: [], //function or (not in)array['.exe', '.zip']
    maxAge: 3600 * 24 * 7, //cache-control maxAge seconds
    cache: false //cache-control
};


module.exports = function (options, app) {
    options = options ? lib.extend(defaultOptions, options, true) : defaultOptions;

    // static path
    if (options.dir === '/') {
        options.dir = '/static';
    }
    options.dir = options.dir ? path.normalize(`${app.root_path}${options.dir}`) : path.normalize(`${app.root_path}/static`);

    // prefix must be ASCII code
    options.prefix = (options.prefix || '').replace(/\/*$/, '/');
    options.filePrefix = path.normalize(options.prefix);

    // option.filter
    options.fileFilter = function () {
        return true;
    };
    if (typeof options.filter === 'function') {
        options.fileFilter = options.filter;
    } else if (Array.isArray(options.filter)) {
        options.fileFilter = function (file) {
            return options.filter.indexOf(path.extname(file)) === -1;
        };
    }

    /*eslint-disable consistent-return */
    return function (ctx, next) {
        // only accept HEAD and GET
        if (ctx.method !== 'HEAD' && ctx.method !== 'GET') {
            return next();
        }

        const pathname = ctx.path;
        // ctx.path must be defined
        if (!pathname || pathname === '/') {
            return next();
        }
        // regexp
        if (!/[^\/]+\.+\w+$/.test(pathname)) {
            return next();
        }

        // response
        return preParse(ctx, options).then(res => {
            if (res === undefined) {
                return next();
            } else if (res === null) {
                ctx.status = 404;
                return;
            } else {
                return responseFile(res, ctx, options);
            }
        });
    };
};
