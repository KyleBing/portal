interface User {
    uid: number             // key: uid*
    email: string           // Email*
    nickname: string        // 昵称*
    password: string
    date_register: string   // 注册时间*
    date_last_visit: string // 最后登录时间
    comment: string         // 注释

    // PERSONAL INFO
    wx: string              // 微信号*
    phone: string           // 手机号*
    homepage: string        // 个人主页
    gaode: string           // 高德组队码
    group_id: number        // 用户组别*

    // COUNT
    count_diary: number     // 统计 - 日记
    count_dict: number      // 统计 - 码表
    count_qr: number        // 统计 - 二维码
}

export {
    User
}
