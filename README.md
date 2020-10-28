# 介绍
-----

[![npm version](https://badge.fury.io/js/think_static.svg)](https://badge.fury.io/js/think_static)

Static server Middleware for ThinkKoa.

# 安装
-----

```
npm i think_static
```

# 使用
-----

1、static中间件为thinkkoa内置中间件,无需在项目中创建引用。该中间件默认开启

2、项目中间件配置 config/middleware.js:
```
config: { //中间件配置
    ...,
    //静态资源,如果配置了Nginx代理,请设置为 static: false
    static: {
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
    }
}
```