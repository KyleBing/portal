# 《标题日记》 后台 - nodejs


## 一、项目说明
服务对象： [标题日记](https://github.com/KyleBing/diary-vue) 

该后台使用 javascript 作为唯一语言，运行于 [nodejs](https://github.com/nodejs/node) 环境中，使用 [express](https://github.com/expressjs/express) 框架作为 web 服务框架。
> 前一版的后台是使用 php 写的，只是简单的能用，由于对 php 不熟悉，稍微做一些复杂的操作就感觉改动吃力，现在好了，感觉天下都是我的，哈哈哈

> 线上已运行的例子：
> http [http://kylebing.cn:3000/diary/detail?diaryId=5312](http://kylebing.cn:3000/diary/detail?diaryId=5312)
> https [https://kylebing.cn/diary-portal/diary/detail?diaryId=5312](https://kylebing.cn/diary-portal/diary/detail?diaryId=5312)



### 
```bash
# 1. 统计信息
- /statistics # 统计信息 `2022-05-12`

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
- /diary-category/delete
- /diary-category/modify
- /diary-category/list


# 5. 码表项目 `2022-04-24`
- /dict/pull
- /dict/push

# 6. 二维码项目 `2022-05-18`
- /qr-manager/list
- /qr-manager/detail
- /qr-manager/add
- /qr-manager/modify
- /qr-manager/delete
- /qr-manager/clear-visit-count

# 7. 二维码前端信息
- /qr/ # 码的信息 `2022-05-18`

# 8. VPS主机信息接口
- /vps/ # vps 信息

```



## 二、安装说明

**服务器需要的条件：**
- 已安装 `nodejs 16+`
- 已安装 `npm` 或 `yarn`
- 已安装 `nginx`，需要用它进行路径映射，以供前端非跨域式访问后台
- 已安装 `mysql` 或 `mariaDB`

### 1. clone 或 下载该项目文件
下载到项目文件后，执行 `npm i` 或者 `yarn` 安装项目依赖

### 2. 修改数据库配置文件
修改 `/config/configDatabase.js` 文件内容，改成你的配置
```js
module.exports = {
    host:       'localhost',
    user:       'root',
    password:   '----',
    port:       '3306',
    database:   'diary',
    invitation: '----', // 邀请码，用于注册时使用
    multipleStatements: true,
    adminCount: 'kylebing@163.com' // 管理员账户，该用户可以在统计页面中查看所有用户统计数据
}
```
### 3. 启动程序
这里推荐使用 pm2 管理程序，创建名为 `diary` 的 pm2 项目，并启动
> pm2 的使用方法： [https://blog.csdn.net/KimBing/article/details/124249590](https://blog.csdn.net/KimBing/article/details/124249590)

```bash
pm2 start bin/www --name diary
```

如果你实在不用 pm2，也可以直接使用 `npm` 原始方法启动

```bash
npm run start
```

项目启动后会运行在 `localhost:3000`，直接访问这个地址应该能看到：

<img width="539" alt="Screen Shot 2022-04-19 at 21 47 25" src="https://user-images.githubusercontent.com/12215982/164018379-bb497ec3-53e4-46c5-969a-c5b3ca4c0c31.png">


### 4. 初始化数据库

直接访问 `你服务器的域名或IP:3000/init` 这个路径即可将数据库初始化。

初始化后，会自动在项目目录中新建一个名为 `DATABASE_LOCK` 的文件，之后将不能再执行这个接口，如果想要重新初始化，需要先将这个文件删除。

> 注意：初始化会清空 diary 数据库中的所有内容


### 5. 配置 nginx，映射 `localhost:3000` 路径到  `/diary-portal` 路径

1. 打开 nginx 的配置文件，linux 系统的配置文件默认在 `/etc/nginx/conf.d/` 目录下，比如我 CentOS 上的 `nginx/1.19.7` 的配置文件是在这个位置。


2. 打开 `default.conf` 文件
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
location /diary-portal/ {
    proxy_pass http://diary_server/; # 这里对应上面的 upsteam 名字
    proxy_set_header Host $host:$server_port; # 这里照搬就可以
}
```
5. 这样，就会将 `localhost:3000` 这个接口映射到 `localhost/diary-portal/` 这个路径下
6. 重启 nginx 服务
  ```bash
  systemctl restart nginx
  ```

### 6. 配置前端项目
1. 下载 [https://github.com/KyleBing/diary-vue](https://github.com/KyleBing/diary-vue)
2. 安装依赖，执行 `npm i` 或者 `yarn`
3. 如果你需要修改前端请求后台的路径，修改 `/src/request.js` 中的 `BASE_URL` 即可
4. 执行 `npm build` 生成最终项目文件
5. 放置于服务器 nginx 主目录下的 `/diary/` 下
6. 此时后台项目在 `/diary-portal/` 目录下，前端项目在 `/dairy/` 下，这样就能直接使用了


## 三、开发说明


### 1. 接口记录

- [x] 数据库初始化 `/diary/init`

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

- [x] 统计信息
  - [x] 根据日记类别统计 `/statistic/category`
  - [x] 根据年月统计 `/statistic/year`

- [x] 银行卡信息 `/bank-card`

- [x] 数据库相关操作
  - [x] 转义 emoji

### 2. 密码说明
密码使用 [bcrypt](https://github.com/kelektiv/node.bcrypt.js) 加密，登录后的所有传输都会用加密后的密码作为请求 token

### 3. 返回数据格式

```json
{
  "success": true,
  "message": "提示信息",
  "data": {}
}
```

## 四、其它
> 始于： 2022-04-14
> 完成： 2022-04-17
