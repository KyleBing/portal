import express from "express"
import {ResponseError, ResponseSuccess} from "../response/Response";
import configProject from "../../config/configProject.json"
import {
    dateFormatter,
    getDataFromDB, operate_db_and_return_added_id,
    updateUserLastLoginTime,
    verifyAuthorization,
} from "../utility";
const router = express.Router()

const DB_NAME = 'diary'
const DATA_NAME = '邀请码'
const CURRENT_TABLE = 'invitations'

import crypto from 'crypto'

router.get('/list', (req, res) => {
    verifyAuthorization(req)
        .then(userInfo => {
            let sqlArray = []
            if (userInfo.email === configProject.adminCount ) { //
                sqlArray.push(`SELECT * from ${CURRENT_TABLE} where binding_uid is null order by date_create desc ;`)
            } else {
                sqlArray.push(`SELECT * from ${CURRENT_TABLE} where binding_uid is null and is_shared = 0 order by date_create desc  ;`)
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
            sqlArray.push(`SELECT * from ${CURRENT_TABLE} where binding_uid is null and is_shared = 0 order by date_create desc ;`)
            getDataFromDB( 'diary', sqlArray)
                .then(data => {
                    res.send(new ResponseSuccess(data, '请求成功'))
                })
                .catch(err => {
                    res.send(new ResponseError(err, err.message))
                })
        })
})

router.post('/generate', (req, res) => {
    verifyAuthorization(req)
        .then(userInfo => {
            if (userInfo.email === configProject.adminCount){ // admin
                let timeNow = dateFormatter(new Date())
                let sqlArray = []
                crypto.randomBytes(12, (err, buffer) => {
                    let key = buffer.toString('base64')
                    sqlArray.push(`
                        insert into 
                            ${CURRENT_TABLE}(date_create, id) 
                            VALUES ('${timeNow}', '${key}')`)

                    operate_db_and_return_added_id(userInfo.uid, DB_NAME, DATA_NAME, sqlArray, '生成', res)
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
router.post('/mark-shared', (req, res) => {
    verifyAuthorization(req)
        .then(userInfo => {
            if (userInfo.email === configProject.adminCount){ // admin
                let sqlArray = []
                sqlArray.push(`
                        update ${CURRENT_TABLE} set is_shared = 1 where id = '${req.body.id}' `)

                operate_db_and_return_added_id(userInfo.uid, DB_NAME, DATA_NAME, sqlArray, '标记', res)
            } else {
                res.send(new ResponseError('', '无权限操作'))
            }
        })
        .catch(err => {
            res.send(new ResponseError(err, err))
        })
})

router.delete('/delete', (req, res) => {
    if (!req.query.id){
        res.send(new ResponseError('', '参数错误，缺少 id'))
        return
    }
    // 1. 验证用户信息是否正确
    verifyAuthorization(req)
        .then(userInfo => {
            if (userInfo.email === configProject.adminCount){
                let sqlArray = []
                sqlArray.push(` DELETE from ${CURRENT_TABLE} WHERE id='${req.query.id}' `)

                operate_db_and_return_added_id(userInfo.uid, DB_NAME, DATA_NAME, sqlArray, '添加', res)
            } else {
                res.send(new ResponseError('', '无权操作'))
            }
        })
        .catch(err => {
            res.send(new ResponseError(err, '无权操作'))
        })
})

export default router
