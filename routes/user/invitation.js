const express = require('express')
const configProject = require('../../config/configProject')
const utility = require("../../config/utility");
const ResponseSuccess = require("../../response/ResponseSuccess");
const ResponseError = require("../../response/ResponseError");
const router = express.Router()
const bcrypt = require('bcrypt')
const crypto = require('crypto')


const TABLE_NAME = 'invitations'
router.get('/list', (req, res, next) => {
    utility
        .verifyAuthorization(req)
        .then(userInfo => {

            let sqlArray = []
            sqlArray.push(`SELECT * from ${TABLE_NAME} 
                  where uid='${userInfo.uid}'`)
            utility
                .getDataFromDB( 'diary', sqlArray)
                .then(data => {
                    utility.updateUserLastLoginTime(userInfo.uid)
                    data.forEach(diary => {
                        // decode unicode
                        diary.title = utility.unicodeDecode(diary.title)
                        diary.content = utility.unicodeDecode(diary.content)
                        // 处理账单数据
                        if (diary.category === 'bill'){
                            diary.billData = utility.processBillOfDay(diary, [])
                        }
                    })
                    res.send(new ResponseSuccess(data, '请求成功'))
                })
                .catch(err => {
                    res.send(new ResponseError(err, err.message))
                })
        })
        .catch(verified => {
            res.send(new ResponseError(verified, '无权查看日记列表：用户信息错误'))
        })
})

router.post('/generate', (req, res, next) => {
    utility.verifyAuthorization(req)
        .then(userInfo => {
            if (userInfo.email === configProject.adminCount){ // admin
                let timeNow = utility.dateFormatter(new Date())
                let sqlArray = []
                crypto.randomBytes(14, (err, buffer) => {
                    let key = buffer.toString('base64')
                    sqlArray.push(`
                        insert into 
                            ${TABLE_NAME}(date_create, id) 
                            VALUES ('${timeNow}', '${key}')`)
                    utility
                        .getDataFromDB( 'diary', sqlArray)
                        .then(data => {
                            res.send(new ResponseSuccess(key, '邀请码生成成功'))
                        })
                        .catch(err => {
                            res.send(new ResponseError(err, '邀请码生成失败'))
                        })
                })
            } else {
                res.send(new ResponseError('', '无权限操作'))
            }
        })
        .catch(err => {
            res.send(new ResponseError(err, err))
        })
})

router.delete('/delete', (req, res, next) => {
    // 1. 验证用户信息是否正确
    utility
        .verifyAuthorization(req)
        .then(userInfo => {
            if (userInfo.group_id === 1){
                let sqlArray = []
                sqlArray.push(`
                        DELETE from users
                        WHERE uid='${req.body.uid}'
                    `)
                utility
                    .getDataFromDB( 'diary', sqlArray)
                    .then(data => {
                        if (data.affectedRows > 0) {
                            utility.updateUserLastLoginTime(req.body.email)
                            res.send(new ResponseSuccess('', '删除成功'))
                        } else {
                            res.send(new ResponseError('', '删除失败'))
                        }
                    })
                    .catch(err => {
                        res.send(new ResponseError(err,))
                    })
            } else {
                res.send(new ResponseError('', '无权操作'))
            }
        })
        .catch(err => {
            res.send(new ResponseError(err, '无权操作'))
        })
})


module.exports = router
