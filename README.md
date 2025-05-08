# 我的后台 Portal `nodejs` `ts`

该后台服务的前端项目：

- [《标题日记》](https://github.com/KyleBing/diary-vue)
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


## 二、安装说明

**服务器需要的条件：**
- 已安装 `nodejs 18+`
- 已安装 `npm` 或 `yarn`
- 已安装 `nginx`，需要用它进行路径映射，以供前端非跨域式访问后台
- 已安装 `mysql` 或 `mariaDB`

最终运行文件在 `/dist` 文件夹下，外面的只是 ts 源文件

### 1. clone 或 下载该项目文件
下载到项目文件后，执行 `npm i` 或者 `yarn` 安装项目依赖

### 2. 修改数据库配置文件
修改 `/dist/config/configDatabase.json` 文件内容，改成你的配置

```json
{
   "host":       "localhost",
   "user":       "----",
   "password":   "----",
   "port":       3306,
   "multipleStatements": true,
   "timezone": ""
}
```

和项目配置文件 `/dist/config/configProject.json`

```json
{
  "invitation": "----",
  "adminCount": "xxxx@163.com",

  "wxMiniAppId": "",
  "wxMiniSecret": "",
  "wxToken": "",
  "wxPublicAppId": "",
  "wxPublicSecret": "",

  "qiniuAccessKey": "",
  "qiniuSecretKey": ""
}

```

### 3. 启动程序
这里推荐使用 pm2 管理程序，创建名为 `diary` 的 pm2 项目，并启动
> pm2 的使用方法： [https://blog.csdn.net/KimBing/article/details/124249590](https://blog.csdn.net/KimBing/article/details/124249590)

```bash
pm2 start ./dist/bin/portal.js --name portal
```

如果你实在不用 pm2，也可以直接使用 `npm` 原始方法启动

```bash
npm run serve
```

项目启动后会运行在 `localhost:3000`，直接访问这个地址应该能看到：

<img width="539" alt="Screen Shot 2022-04-19 at 21 47 25" src="https://user-images.githubusercontent.com/12215982/164018379-bb497ec3-53e4-46c5-969a-c5b3ca4c0c31.png">


### 4. 初始化数据库

> 注意：初始化会清空 `diary` 数据库中的所有内容


1. 删除后台目录中的 `DATABASE_LOCK` 这个文件。  
2. 直接访问 `你服务器的域名或IP:3000/init` 这个路径即可将数据库初始化，初始化数据库会自动创建一个为名 `diary` 的数据库。
3. 初始化后，会自动在项目目录中新建一个名为 `DATABASE_LOCK` 的文件，之后将不能再执行这个接口，如果想再次初始化，需要先删除这个文件。


> **建议自行定时备份数据库**


### 5. 配置 nginx，映射 `localhost:3000` 路径到  `/portal` 路径

1. 打开 nginx 的配置文件，
   - CentOS 的 nginx 配置文件在 `/etc/nginx/conf.d/` 目录下。
   - Ubuntu 的 nginx 配置文件在 `/etc/nginx/site-avilable/default` 中。

2. 打开 `default.conf` 或 `default` 文件
    ```bash
    vi default.conf
    ```

3. 在 http 内部， server 外部，添加以下内容

    ```bash
     upstream diary_server {
         server localhost:3000;
         keepalive 2000;
     }
    ```

4. 然后在 server 内部添加：

    ```bash
    location /portal/ {
        proxy_pass http://diary_server/; # 这里对应上面的 upstream 名字
        proxy_set_header Host $host:$server_port; # 这里照搬就可以
    }
    ```
5. 这样，就会将 `localhost:3000` 这个接口映射到 `localhost/portal/` 这个路径下
6. 重启 nginx 服务
    ```bash
    systemctl restart nginx
    ```
7. 添加 cron 定时任务
   用户数据里有对用户的日记和其它信息的统计，这个统计过程耗时稍长，所以将其设成定时任务，每小时执行一次。
   以 Ubuntu 为例
   执行
   ```bash
   crontab -e
   ```
   然后添加以下内容到打开的窗口中，意思就是说第小时的 17 分统计并更新用户数据，下面的 js 路径改成自己系统中的 JS 路径。
   ```bash
   17 * * * * node /var/www/html/portal/dist/cron/updateUserInfo.js
   ```
   然后重启 cron 服务
   ```bash
   systemctl restart cron
   ```

### 6. 设置管理员账户
1. 用上面设置的通用邀请码注册之后
2. 从数据库中直接修改对应用户的 `users.group_id`  改为 `1` (管理员)
3. 网页上重新登录该用户，就能看到 **邀请码** 菜单了。

### 7. 配置前端项目
1. 下载 [https://github.com/KyleBing/diary-vue](https://github.com/KyleBing/diary-vue)
2. 安装依赖，执行 `npm i` 或者 `yarn`
3. 如果你需要修改前端请求后台的路径，修改 `/src/request.js` 中的 `BASE_URL` 即可
4. 执行 `npm build` 会生成前端项目的生产环境的文件，就这个项目而言，它会在生成在 `./dist/` 目录，也会在 `./archive` 目录下生成一个名为 `diary-2023-06-xx.zip` 的压缩包，这个压缩包的内容就是 `../diary` 的内容，但不包含外层 `diary` 目录。
5. 将项目文件放置于服务器 nginx 主目录的 `/diary/` 下
6. 此时后台项目在 `/portal/` 目录下，前端项目在 `/dairy/` 下，这样就能直接使用了

最终的目录结构应该是这样的：

```bash
[ nginx 文档根目录 ]
      ├── diary-vue  # 日记前端源码，这个不需要放到服务器上，它的主要作用就是生成下方的 ./diary/ 目录下的前端项目文件
      │   ├── dist
      │   ├── archive
      │   ├── src
      │   ...
      │
      ├── diary      # 日记前端文件
      │   ├── appicon-apple.png
      │   ├── assets
      │   ├── favicon.png
      │   ├── images
      │   ├── index.html
      │   ├── logo.svg
      │   ├── manifest.webmanifest
      │   ├── preloading.css
      │   ├── registerSW.js
      │   ├── sw.js
      │   └── workbox-3e911b1d.js
      │
      └── portal     # 日记后台
          ├── app.js
          ├── dist  # 可执行项目文件
          ├── bin
          ├── CHANGELOG.md
          ├── config
          ├── DATABASE_LOCK
          ├── entity
          ├── node_modules
          ├── package.json
          ├── package-lock.json
          ├── public
          ├── README.md
          ├── response
          ├── routes
          ├── temp
          ├── upload
          ├── views
          └── yarn.lock

```

## 三、开发说明

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


# TODO
- [ ] 后台配置引导
- [ ] 去除 build 过程，脱离 node_modules 直接使用
- [ ] 单独分离出日记功能