class QrCode{
    hash             = '' // key: hash*
    is_public        =  0 // 是否启用*
    is_show_phone    =  0 // 手机号 - 显示开关*
    message          = '' // 挪车说明
    car              = '' // 车辆标题
    car_plate        = '' // 车牌号
    car_desc         = '' // 车辆描述
    is_show_car      =  0 // 车辆 - 显示开关*
    is_show_wx       =  0 // 微信 - 显示开关*
    description      = '' // 简介
    is_show_homepage =  0 // 个人主机 - 显示开关*
    is_show_gaode    =  0 // 高德组队码 - 显示开关*
    date_modify      = '' // 编辑时间*
    date_init        = '' // 初始时间*
    visit_count      =  0 // 被访问次数*
    uid              = '' // 所属用户的 uid*

    constructor(
        hash: string, is_public: number, is_show_phone: number, message: string,
        car: string, car_plate: string, car_desc: string, is_show_car: number,
        is_show_wx: number, description: string, is_show_homepage: number,
        is_show_gaode: number, date_modify: string, date_init: string,
        visit_count: number, uid: string) {
        this.hash             = hash                          // key: hash*
        this.is_public        = Number(is_public) || 0        // 是否启用*
        this.is_show_phone    = Number(is_show_phone) || 0    // 手机号 - 显示开关*
        this.message          = message || ''                 // 挪车说明
        this.car              = car || ''                     // 车辆标题
        this.car_plate        = car_plate || ''               // 车牌号
        this.car_desc         = car_desc                      // 车辆描述
        this.is_show_car      = Number(is_show_car) || 0      // 车辆 - 显示开关*
        this.is_show_wx       = Number(is_show_wx) || 0       // 微信 - 显示开关*
        this.description      = description                   // 简介
        this.is_show_homepage = Number(is_show_homepage) || 0 // 个人主机 - 显示开关*
        this.is_show_gaode    = Number(is_show_gaode) || 0    // 高德组队码 - 显示开关*
        this.date_modify      = date_modify                   // 编辑时间*
        this.date_init        = date_init                     // 初始时间*
        this.visit_count      = Number(visit_count) || 0      // 被访问次数*
        this.uid              = uid                           // 所属用户的 uid*
    }
}

export default QrCode
