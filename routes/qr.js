const express = require('express')
const router = express.Router()
const utility = require('../config/utility')
const ResponseSuccess = require('../response/ResponseSuccess')
const ResponseError = require('../response/ResponseError')


router.get('/', (req, res, next) => {
    // query.hash
    let sqlArray = []
    sqlArray.push(`
            select qrs.hash,
                   qrs.is_public,
                   qrs.switch_phone,
                   qrs.message,
                   qrs.car,
                   qrs.car_plate,
                   qrs.car_desc,
                   qrs.switch_car,
                   qrs.switch_wx,
                   qrs.description,
                   qrs.switch_homepage,
                   qrs.switch_gaode,
                   qrs.date_init,
                   qrs.visit_count,
                   users.phone,
                   users.wx,
                   users.homepage,
                   users.uid,
                   users.nickname,
                   users.username
            from qrs
                     left join users on qrs.uid = users.uid
                        where qrs.hash = '${req.query.hash}'`)
    // 1. 先查询出 QR 结果
    utility.getDataFromDB(sqlArray, true)
        .then(data => {
            if (data) { // 没有记录时会返回  undefined
                // decode unicode
                data.message = utility.unicodeDecode(data.message)
                data.description = utility.unicodeDecode(data.description)

                // 2. 判断是否为共享 QR
                if (data.is_public === 1){
                    // 2.1 如果是，直接返回结果，不需要判断任何东西
                    res.send(new ResponseSuccess(data))
                    countPlusOne(req.query.hash)
                } else{
                    res.send(new ResponseError('', '该码未启用'))
                }
            } else {
                res.send(new ResponseError('', '查无此码'))
            }

        })
        .catch(err => {
            res.send(new ResponseError(err, err.message))
        })
})

function countPlusOne(hash){
    utility.getDataFromDB([`update qrs set visit_count = visit_count + 1 where hash = '${hash}'`])
}


module.exports = router
