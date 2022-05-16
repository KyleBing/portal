class User{
    constructor(username, nickname, password, wx, phone, homepage, gaode, date_register, date_lastlogin, group_id) {
        this.username       = username       // key: 用户名*
        this.nickname       = nickname       // 昵称*
        this.password       = password
        this.wx             = wx             // 微信号*
        this.phone          = phone          // 手机号*
        this.homepage       = homepage       // 个人主页
        this.gaode          = gaode          // 高德组队码
        this.date_register  = date_register  // 注册时间*
        this.date_lastlogin = date_lastlogin // 最后登录时间
        this.group_id       = group_id       // 用户组别*
    }
}

module.exports = User
