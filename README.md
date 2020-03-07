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
    static: {//静态资源,如果配置了Nginx代理,请设置为 static: false
        dir: '/static', //resource path
        prefix: '/', //resource prefix 
        gzip: true, //enable gzip
        filter: [], //function or (not in)array['.exe', '.zip']
        maxAge: 3600 * 24 * 7, //cache maxAge seconds
        alias: {},  //resource path file alias {key: path}
        preload: true, //preload files
        cache: true //resource cache
    }
}
```