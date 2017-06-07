# 介绍
-----

[![npm version](https://badge.fury.io/js/think_static.svg)](https://badge.fury.io/js/think_static)
[![Dependency Status](https://david-dm.org/richenlin/think_static.svg)](https://david-dm.org/richenlin/think_static)

Static cache for ThinkKoa

# 安装
-----

```
npm i think_static
```

# 使用
-----

1、项目中增加中间件 middleware/static.js
```
module.exports = require('think_static');
```

2、项目中间件配置 config/middleware.js:
```
list: [...,'static'], //加载的中间件列表
config: { //中间件配置
    ...,
    static: {//静态资源,如果配置了Nginx代理,请设置为 static: false
        prefix: '/static', //resource prefix 
        gzip: true, //enable gzip
        filter: null, //function or array['jpg', 'gif']
        maxAge: 3600 * 24, //cache maxAge seconds
        buffer: false, //enable buffer
        alias: {},  //alias files {key: path}
        preload: false //preload files
    }
}
```