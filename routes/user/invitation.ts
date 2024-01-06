import {
    dateFormatter,
    formatMoney,
    getDataFromDB,
    processBillOfDay,
    unicodeDecode, unicodeEncode,
    updateUserLastLoginTime,
    verifyAuthorization
} from "../../config/utility";
import express = require("express")
const routerInvitation = express.Router()

import {Response, Request} from "express";
import {ResponseError} from "../../response/ResponseError";
import {ResponseSuccess} from "../../response/ResponseSuccess";
import {CONFIG_PROJECT} from "../../config/config";
import crypto from 'crypto'


const TABLE_NAME = 'invitations'
routerInvitation.get('/list', (req: Request, res: Response, next) => {
    verifyAuthorization(req)
        .then(userInfo => {
            let sqlArray = []
            if (userInfo.email === CONFIG_PROJECT.adminCount ) { //
                sqlArray.push(`SELECT * from ${TABLE_NAME} where binding_uid is null order by date_create desc ;`)
            } else {
                sqlArray.push(`SELECT * from ${TABLE_NAME} where binding_uid is null and is_shared = 0 order by date_create desc  ;`)
            }
            getDataFromDB( 'diary', sqlArray)
                .then(data => {
                    updateUserLastLoginTime(userInfo.uid)
                    res.send(new ResponseSuccess(data, '请求成功'))
                })
                .catch(err => {
                    res.send(new ResponseError(err, err.message))
                })
        })
        .catch(verified => {
            let sqlArray = []
            // 获取未分享的可用邀请码
            sqlArray.push(`SELECT * from ${TABLE_NAME} where binding_uid is null and is_shared = 0 order by date_create desc ;`)
            getDataFromDB( 'diary', sqlArray)
                .then(data => {
                    res.send(new ResponseSuccess(data, '请求成功'))
                })
                .catch(err => {
                    res.send(new ResponseError(err, err.message))
                })
        })
})

routerInvitation.post('/generate', (req: Request, res: Response, next) => {
    verifyAuthorization(req)
        .then(userInfo => {
            if (userInfo.email === CONFIG_PROJECT.adminCount){ // admin
                let timeNow = dateFormatter(new Date())
                let sqlArray = []
                crypto.randomBytes(12, (err, buffer) => {
                    let key = buffer.toString('base64')
                    sqlArray.push(`
                        insert into 
                            ${TABLE_NAME}(date_create, id) 
                            VALUES ('${timeNow}', '${key}')`)
                    getDataFromDB( 'diary', sqlArray)
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
routerInvitation.post('/mark-shared', (req: Request, res: Response, next) => {
    verifyAuthorization(req)
        .then(userInfo => {
            if (userInfo.email === CONFIG_PROJECT.adminCount){ // admin
                let sqlArray = []
                sqlArray.push(`
                        update ${TABLE_NAME} set is_shared = 1 where id = '${req.body.id}' `)
                getDataFromDB( 'diary', sqlArray)
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

routerInvitation.delete('/delete', (req: Request, res: Response, next) => {
    if (!req.query.id){
        res.send(new ResponseError('', '参数错误，缺少 id'))
        return
    }
    // 1. 验证用户信息是否正确
    verifyAuthorization(req)
        .then(userInfo => {
            if (userInfo.email === CONFIG_PROJECT.adminCount){
                let sqlArray = []
                sqlArray.push(` DELETE from ${TABLE_NAME} WHERE id='${req.query.id}' `)
                getDataFromDB( 'diary', sqlArray)
                    .then(data => {
                        if (data.affectedRows > 0) {
                            updateUserLastLoginTime(req.body.email)
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


export {routerInvitation}
