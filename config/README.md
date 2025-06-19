# 配置文件说明

### `configProject.json`
```bash
invitation: '----',         # 万能注册邀请码，用这个不需要使用系统生成的邀请码

# 七牛云密钥
qiniuAccessKey: '',
qiniuSecretKey: '',


# 以下信息未启用
# 微信小程序开发者信息
wxMiniAppId: '',
wxMiniSecret: '',

# 微信公众号
wxToken: '',
wxPublicAppId: '',
wxPublicSecret: '',
```

### `configDatabase.json`

```bash
host:       'localhost',  # 数据库地址
user:       '----',       # 数据库用户名
password:   '----',       # 数据库密码
port:       3306,         # 数据库端口号
multipleStatements: true, # 允许同时请求多条 sql 语句
timezone: ''

```
