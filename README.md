# 《标题日记》 后台 - nodejs


## 说明
服务对象： [标题日记](https://github.com/KyleBing/diary-vue) 

该后台使用 javascript 作为唯一语言，运行于 [nodejs](https://github.com/nodejs/node) 环境中作为后台，使用 [express](https://github.com/expressjs/express) 框架作为 web 服务框架。
> 前一版的后台是使用 php 写的，只是简单的能用，由于对 php 不熟悉，稍微做一些复杂的操作就感觉改动吃力，现在好了，感觉天下都是我的，哈哈哈


## 接口记录
> 线上接口文档： Postman 文档 []()

- [x] 日记操作
  - [x] 列表 / 搜索 `/diary/list`
  - [x] 新增 `/diary/add`
  - [x] 修改 `/diary/modify`
  - [x] 删除 `/diary/delete`
  - [x] 详情 `/diary/detail`

- [x] 用户操作
  - [x] 注册 `/user/register`
  - [x] 登录 `/user/login`
  - [x] 修改密码 `/user/change-password` 
  - [x] 记录最近一次操作时间

- [x] 数据库相关操作
  - [x] 转义 emoji
## 密码说明
密码使用 [bcrypt](https://github.com/kelektiv/node.bcrypt.js) 加密，登录后的所有传输都会用加密后的密码作为请求 token


## 返回数据格式

```json
{
  "success": true,
  "message": "提示信息",
  "data": {}
}
```


## 其它
> 始于： 2022-04-14
