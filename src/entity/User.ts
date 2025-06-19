enum EnumUserGroup {
    USER = 2,
    ADMIN = 1
}

interface EntityUser {
    uid: number             // key: uid* - int(11) NOT NULL AUTO_INCREMENT
    email: string           // Email* - varchar(50) NOT NULL
    nickname: string        // 昵称* - varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_bin NOT NULL
    username: string        // 用户名 - varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_bin NOT NULL
    password: string        // 密码 - varchar(100) NOT NULL
    register_time: string   // 注册时间 - datetime DEFAULT NULL
    last_visit_time: string // 最后访问时间 - datetime DEFAULT NULL
    comment: string         // 注释 - varchar(255) DEFAULT NULL
    wx: string              // 微信二维码 - varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_bin DEFAULT ''
    phone: string           // 手机号 - varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_bin DEFAULT NULL
    homepage: string        // 个人主页 - varchar(100) CHARACTER SET utf8mb3 COLLATE utf8mb3_bin DEFAULT NULL
    gaode: string           // 高德组队邀请码 - varchar(250) CHARACTER SET utf8mb3 COLLATE utf8mb3_bin DEFAULT NULL
    group_id: EnumUserGroup // 用户组别ID - int(11) NOT NULL DEFAULT 2
    count_diary: number     // 数量 - 日记 - int(8) DEFAULT 0
    count_dict: number      // 数量 - 码表 - int(8) DEFAULT 0
    count_qr: number        // 数量 - 二维码 - int(8) DEFAULT 0
    count_words: number     // 数量 - 词条 - int(8) DEFAULT 0
    count_map_route: number // 数量 - 路线规划 - int(8) DEFAULT 0
    count_map_pointer: number // 数量 - 地图点图 - int(8) DEFAULT NULL
    sync_count: number      // 同步次数 - int(6) DEFAULT 0
    avatar: string          // avatar图片地址 - varchar(255) DEFAULT NULL
    city: string            // 城市 - varchar(255) DEFAULT NULL
    geolocation: string     // 经纬度 - varchar(255) DEFAULT NULL
}



export {
    type EntityUser,
    EnumUserGroup
}
