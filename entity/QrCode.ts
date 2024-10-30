class QrCode{
    constructor(hash, is_public, is_show_phone, message, car, car_plate, car_desc, is_show_car, is_show_wx, description, is_show_homepage, is_show_gaode, date_modify, date_init, visit_count, uid) {
        this.hash            = hash                         // key: hash*
        this.is_public       = Number(is_public) || 0       // 是否启用*
        this.is_show_phone    = Number(is_show_phone) || 0    // 手机号 - 显示开关*
        this.message         = message || ''                // 挪车说明
        this.car             = car || ''                    // 车辆标题
        this.car_plate       = car_plate || ''              // 车牌号
        this.car_desc        = car_desc                     // 车辆描述
        this.is_show_car      = Number(is_show_car) || 0      // 车辆 - 显示开关*
        this.is_show_wx       = Number(is_show_wx) || 0       // 微信 - 显示开关*
        this.description     = description                  // 简介
        this.is_show_homepage = Number(is_show_homepage) || 0 // 个人主机 - 显示开关*
        this.is_show_gaode    = Number(is_show_gaode) || 0    // 高德组队码 - 显示开关*
        this.date_modify     = date_modify                  // 编辑时间*
        this.date_init       = date_init                    // 初始时间*
        this.visit_count     = Number(visit_count) || 0     // 被访问次数*
        this.uid           = uid                        // 所属用户的 uid*
    }
}

module.exports = QrCode
