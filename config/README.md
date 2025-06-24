# 配置文件说明

### `configProject.json`
```bash
"invitation_code": "----",  // 万能注册邀请码

"year_data_start": 1991,    // 数据库数据开始时间

"qiniu_access_key": "",     // 七牛云 access_key
"qiniu_secret_key": ""      // 七牛云 secret_key
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
