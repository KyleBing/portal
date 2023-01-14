const express = require('express')
const configProject = require('../../config/configProject')
const utility = require("../../config/utility");
const ResponseSuccess = require("../../response/ResponseSuccess");
const ResponseError = require("../../response/ResponseError");
const router = express.Router()
const crypto = require('crypto')


const TABLE_NAME = 'invitations'
router.get('/list', (req, res, next) => {
    utility
        .verifyAuthorization(req)
        .then(userInfo => {
            let sqlArray = []
            sqlArray.push(`SELECT * from ${TABLE_NAME} where binding_uid is null order by date_create desc ;`)
            utility
                .getDataFromDB( 'diary', sqlArray)
                .then(data => {
                    utility.updateUserLastLoginTime(userInfo.uid)
                    res.send(new ResponseSuccess(data, '请求成功'))
                })
                .catch(err => {
                    res.send(new ResponseError(err, err.message))
                })
        })
        .catch(verified => {
            res.send(new ResponseError(verified, '无权查看'))
        })
})

router.post('/generate', (req, res, next) => {
    utility.verifyAuthorization(req)
        .then(userInfo => {
            if (userInfo.email === configProject.adminCount){ // admin
                let timeNow = utility.dateFormatter(new Date())
                let sqlArray = []
                crypto.randomBytes(12, (err, buffer) => {
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

// 标记邀请码为已分享状态
router.post('/mark-shared', (req, res, next) => {
    utility.verifyAuthorization(req)
        .then(userInfo => {
            if (userInfo.email === configProject.adminCount){ // admin
                let sqlArray = []
                sqlArray.push(`
                        update ${TABLE_NAME} set is_shared = 1 where id = '${req.body.id}' `)
                utility
                    .getDataFromDB( 'diary', sqlArray)
                    .then(data => {
                        res.send(new ResponseSuccess('', '邀请码标记成功'))
                    })
                    .catch(err => {
                        res.send(new ResponseError(err, '邀请码标记失败'))
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
    if (!req.query.id){
        res.send(new ResponseError('', '参数错误，缺少 id'))
        return
    }
    // 1. 验证用户信息是否正确
    utility
        .verifyAuthorization(req)
        .then(userInfo => {
            if (userInfo.email === configProject.adminCount){
                let sqlArray = []
                sqlArray.push(` DELETE from ${TABLE_NAME} WHERE id='${req.query.id}' `)
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
