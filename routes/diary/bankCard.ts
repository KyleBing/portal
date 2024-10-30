import express from "express"
import {ResponseSuccess, ResponseError } from "../../response/Response";
import mysql from "mysql"
import configDatabase from "../../config/configDatabase";
import configProject from "../../config/configProject";
import {
    unicodeEncode,
    unicodeDecode,
    dateFormatter,
    getDataFromDB,
    getMysqlConnection,
    updateUserLastLoginTime,
    verifyAuthorization, processBillOfDay, formatMoney
} from "../../config/utility";
import Diary from "./diary";
const router = express.Router()

router.get('/', (req, res) => {

    // 1. 验证 token
    verifyAuthorization(req)
        .then(userInfo => {
            let sqlArray = []
            sqlArray.push(`select * from diaries where title = '我的银行卡列表' and uid = ${userInfo.uid}`) // 固定 '银行卡列表' 为标题的日记作为存储银行卡列表
            // 2. 查询出日记结果
            getDataFromDB( 'diary', sqlArray, true)
                .then(dataDiary => {
                    if (dataDiary) {
                        // decode unicode
                        dataDiary.title = unicodeDecode(dataDiary.title || '')
                        dataDiary.content = unicodeDecode(dataDiary.content || '')

                        // 记录最后访问时间
                        updateUserLastLoginTime(userInfo.uid)
                        res.send(new ResponseSuccess(dataDiary.content))
                    } else {
                        res.send(new ResponseSuccess('', '未保存任何银行卡信息'))
                    }
                })
                .catch(err => {
                    res.send(new ResponseError(err, err.message))
                })
        })
        .catch(errInfo => {
            res.send(new ResponseError('', errInfo))
        })
})

export default router
