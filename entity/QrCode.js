class QrCode{
    constructor(hash, is_public, switch_phone, message, car, car_plate, car_desc, switch_car, switch_wx, description, switch_homepage, switch_gaode, date_modify, date_init, visit_count, owner) {
        this.hash            = hash                         // key: hash*
        this.is_public       = Number(is_public) || 0       // 是否启用
        this.switch_phone    = Number(switch_phone) || 0    // 手机号 - 显示开关
        this.message         = message || ''                // 挪车说明
        this.car             = car || ''                    // 车辆标题
        this.car_plate       = car_plate || ''              // 车牌号
        this.car_desc        = car_desc                     // 车辆描述
        this.switch_car      = Number(switch_car) || 0      // 车辆显示开关
        this.switch_wx       = Number(switch_wx) || 0       // 微信显示开关
        this.description     = description                  // 简介
        this.switch_homepage = Number(switch_homepage) || 0 // 个人主机 - 显示开关
        this.switch_gaode    = Number(switch_gaode) || 0    // 高德组队码 - 显示开关
        this.date_modify     = date_modify                  // 编辑时间
        this.date_init       = date_init                    // 初始时间
        this.visit_count     = Number(visit_count) || 0     // 被访问次数
        this.owner           = owner                        // 所属用户的 uid
    }
}

module.exports = QrCode
