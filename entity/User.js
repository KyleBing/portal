class User{
    constructor(uid, username, nickname, password,
                wx, phone, homepage, gaode, date_register, date_last_visit,
                group_id, comment,
                count_diary, count_dict, count_qr) {
        this.uid             = uid             // key: uid*
        this.email           = email           // Email*
        this.nickname        = nickname        // 昵称*
        this.password        = password
        this.date_register   = date_register   // 注册时间*
        this.date_last_visit = date_last_visit // 最后登录时间
        this.comment         = comment         // 注释

        // PERSONAL INFO
        this.wx              = wx              // 微信号*
        this.phone           = phone           // 手机号*
        this.homepage        = homepage        // 个人主页
        this.gaode           = gaode           // 高德组队码
        this.group_id        = group_id        // 用户组别*

        // COUNT
        this.count_diary     = count_diary     // 统计 - 日记
        this.count_dict      = count_dict      // 统计 - 码表
        this.count_qr        = count_qr        // 统计 - 二维码

    }
}

module.exports = User
