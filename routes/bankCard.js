const express = require('express')
const router = express.Router()
const utility = require('../config/utility')
const ResponseSuccess = require('../response/ResponseSuccess')
const ResponseError = require('../response/ResponseError')

router.get('/', (req, res, next) => {
    let sqlArray = []
    sqlArray.push(`select * from diaries where title = '银行卡列表' and uid = ${req.query.uid}`) // 固定 '银行卡列表' 为标题的日记作为存储银行卡列表
    // 1. 先查询出日记结果
    utility.getDataFromDB(sqlArray, true)
        .then(data => {
            if (data) {
                // decode unicode
                data.title = utility.unicodeDecode(data.title || '')
                data.content = utility.unicodeDecode(data.content || '')

                utility.verifyAuthorization(req.query.uid, req.query.email, req.query.token)
                    .then(verified => {
                        // 3. 判断日记是否属于当前请求用户
                        if (Number(req.query.uid) === data.uid){
                            // 记录最后访问时间
                            utility.updateUserLastLoginTime(req.query.email)
                            res.send(new ResponseSuccess(data.content))
                        } else {
                            res.send(new ResponseError('','当前用户无权查看该日记：请求用户 ID 与日记归属不匹配'))
                        }
                    })
                    .catch(unverified => {
                        res.send(new ResponseError('','当前用户无权查看该日记：用户信息错误'))
                    })
            } else {
                res.send(new ResponseSuccess('', '未保存任何银行卡信息'))
            }

        })
        .catch(err => {
            res.send(new ResponseError(err.message))
        })
})


module.exports = router
