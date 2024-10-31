import express from "express"
import {ResponseSuccess, ResponseError } from "@response/Response";
import {
    unicodeDecode,
    getDataFromDB,
} from "@config/utility";
const router = express.Router()


router.get('/', (req, res) => {
    // query.hash
    let sqlArray = []
    sqlArray.push(`
            select qrs.hash,
                   qrs.is_public,
                   qrs.is_show_phone,
                   qrs.message,
                   qrs.car_name,
                   qrs.car_plate,
                   qrs.car_desc,
                   qrs.is_show_car,
                   qrs.is_show_wx,
                   qrs.wx_code_img,
                   qrs.description,
                   qrs.is_show_homepage,
                   qrs.is_show_gaode,
                   qrs.date_init,
                   qrs.visit_count,
                   qrs.imgs,
                   qrs.car_type,
                   users.phone,
                   users.wx,
                   users.homepage,
                   users.uid,
                   users.nickname,
                   users.username
            from qrs
                     left join users on qrs.uid = users.uid
                        where qrs.hash = '${req.query.hash}' and is_public = 1`)
    // 1. 先查询出 QR 结果
    getDataFromDB( 'diary', sqlArray, true)
        .then(dataQr => {
            if (dataQr) { // 没有记录时会返回  undefined
                // decode unicode
                dataQr.message = unicodeDecode(dataQr.message)
                dataQr.description = unicodeDecode(dataQr.description)

                getDataFromDB(
                        'diary',
                        [`select hash, car_name, car_plate, imgs from qrs 
                                  where 
                                     uid = ${dataQr.uid} 
                                     and is_public = 1 
                                     and hash != '${req.query.hash}'` ],
                        false
                    )
                    .then(dataHasList => {
                        res.send(new ResponseSuccess({
                            dataQr: dataQr,
                            hashList: dataHasList
                        }, '获取成功'))
                        countPlusOne(String(req.query.hash))
                    })
                    .catch(err => {
                        console.log(err)
                        res.send(new ResponseError('', '获取同用户其它码失败'))
                    })
            } else {
                res.send(new ResponseError('', '查无此码'))
            }
        })
        .catch(err => {
            res.send(new ResponseError(err, err.message))
        })
})

function countPlusOne(hash: string){
    getDataFromDB( 'diary', [`update qrs set visit_count = visit_count + 1 where hash = '${hash}'`])
        .then()
}

export default router
