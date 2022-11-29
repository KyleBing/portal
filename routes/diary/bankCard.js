const express = require('express')
const router = express.Router()
const utility = require('../../config/utility')
const ResponseSuccess = require('../../response/ResponseSuccess')
const ResponseError = require('../../response/ResponseError')

router.get('/', (req, res, next) => {

    // 1. 验证 token
    utility
        .verifyAuthorization(req)
        .then(userInfo => {
            let sqlArray = []
            sqlArray.push(`select * from diaries where title = '我的银行卡列表' and uid = ${userInfo.uid}`) // 固定 '银行卡列表' 为标题的日记作为存储银行卡列表
            // 2. 查询出日记结果
            utility
                .getDataFromDB( 'diary', sqlArray, true)
                .then(dataDiary => {
                    if (dataDiary) {
                        // decode unicode
                        dataDiary.title = utility.unicodeDecode(dataDiary.title || '')
                        dataDiary.content = utility.unicodeDecode(dataDiary.content || '')

                        // 记录最后访问时间
                        utility.updateUserLastLoginTime(userInfo.uid)
                        res.send(new ResponseSuccess(dataDiary.content))
                    } else {
                        res.send(new ResponseSuccess('', '未保存任何银行卡信息'))
                    }
                })
                .catch(err => {
                    res.send(new ResponseError(err, err.message))
                })
        })
        .catch(unverified => {
            res.send(new ResponseError('','无权查看该日记：用户信息错误'))
        })


})


module.exports = router
