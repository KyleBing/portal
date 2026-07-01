# 我的后台 Portal `nodejs` `ts`

该后台服务的前端项目：

- [《标题日记》](https://github.com/KyleBing/diary-vue) `v9.20`
- [《路书》](https://github.com/KyleBing/map)
- 《五笔相关》
- 《二维码》
- 《文件管理》


## 一、接口列表

### 
```bash
# 1. 统计信息
- /statistic # 统计信息 `2022-05-12`

# 2. 日记管理
- /diary/list
- /diary/add
- /diary/modify
- /diary/delete
- /diary/detail

    # 2.1 银行卡列表信息
    - /bank-card/ # 银行卡列表 `2022-05-12`
    
    # 2.2 账单统计信息
    - /bill/ # 日记中的账单类别统计信息 `2022-05-24`
    - /bill/keys # 所有账单条目列表 `2023-12-20`
    - /bill/sorted # 所有账单展示

# 3. 用户管理
- /user/
- /user/add
- /user/delete
- /user/modify
- /user/detail
- /user/list
- /user/login
- /user/change-password

# 4. 日记类别管理
- /diary-category/ # 类别管理 `2022-05-24`
- /diary-category/add # 类别管理 `2022-05-24`
- /diary-category/modify # 类别修改 `2022-07-22`
- /diary-category/list # 类别管理 `2022-05-24`
- /diary-category/delete

# 5. 邀请码管理
- /invitation/generate # 生成新的
- /invitation/mark-shared # 标记邀请码为已用
- /invitation/list # 可用的邀请码列表
- /invitation/delete # 删除邀请码

# 6. 统计
- /statistic/ # 统计日记、用户数据
- /statistic/category # 类别日记数量统计
- /statistic/year # 年份日记统计
- /statistic/users # 用户的日记、码表、qr 等数量
- /statistic/weather # 所有日记的气温信息


# 7. 码表项目 `2022-04-24`
- /dict/pull
- /dict/push

# 8. 二维码项目 `2022-05-18`
- /qr-manager/list
- /qr-manager/detail
- /qr-manager/add
- /qr-manager/modify
- /qr-manager/delete
- /qr-manager/clear-visit-count

# 9. 二维码前端信息
- /qr-front/ # 码的信息 `2022-05-18`

# 10. 饥荒数据
- /dont-starve/{tablename}/list # 列表数据
- /dont-starve/{tablename}/info # 详情数据

# 11. 路书数据
## 地图路线
- /map-route/list
- /map-route/detail
- /map-route/add
- /map-route/modify
- /map-route/delete

## 地图信息
- /map-pointer/list
- /map-pointer/detail
- /map-pointer/add
- /map-pointer/modify
- /map-pointer/delete

```


## 二、部署说明

[部署后台服务](https://kylebing.github.io/readme/diary/%E9%83%A8%E7%BD%B2%E8%AF%B4%E6%98%8E.html#%E5%9B%9B%E3%80%81%E9%83%A8%E7%BD%B2%E5%90%8E%E5%8F%B0%E6%9C%8D%E5%8A%A1)

## 三、建议定期自行备份数据库

添加 cron 定时任务
用户数据里有对用户的日记和其它信息的统计，这个统计过程耗时稍长，所以将其设成定时任务，每小时执行一次。
以 Ubuntu 为例，执行
```bash
crontab -e
```
然后添加以下内容到打开的窗口中，意思是每小时的第 17 分钟统计并更新用户数据，下面的 js 路径改成自己系统中的 JS 路径。
```bash
17 * * * * node /var/www/html/portal/dist/cron/updateUserInfo.js
```
然后重启 cron 服务：
```bash
systemctl restart cron
```


## 四、开发说明

### 1. 密码说明
密码使用 [bcrypt](https://github.com/kelektiv/node.bcrypt.js) 加密
### 2. 返回数据格式

```json
{
  "success": true,
  "message": "提示信息",
  "data": {}
}
```

## 四、历程
- 始于 `2022-04-14`
- 改成 ts 版本 `2024-10-31` - `2024-11-09`
