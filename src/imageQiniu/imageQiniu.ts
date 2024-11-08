import express from "express"
import {ResponseError, ResponseSuccess} from "../response/Response";
import configProject from "../../config/configProject.json"
import {
    dateFormatter,
    getDataFromDB, operate_db_and_return_added_id, operate_db_without_return,
    updateUserLastLoginTime,
    verifyAuthorization
} from "../utility";
const router = express.Router()

import qiniu from 'qiniu'

/**
 * 七牛云图片 处理
 */

const DB_NAME = 'diary'
const DATA_NAME = '七牛云图片'
const CURRENT_TABLE = 'image_qiniu'

// 生成 token 根据 bucket
router.get('/', (req, res) => {
    if (req.query.bucket){
        if (req.query.hahaha){
            res.send(new ResponseSuccess(getQiniuToken(String(req.query.bucket)), '凭证获取成功'))
        } else {
            verifyAuthorization(req)
                .then(() => {
                    res.send(new ResponseSuccess(getQiniuToken(String(req.query.bucket)), '凭证获取成功'))
                })
                .catch(() => {
                    res.send(new ResponseError('', '参数错误'))
                })
        }
    } else {
        res.send(new ResponseError('', '缺少 bucket 参数'))
    }
})

function getQiniuToken(bucket: string){
    let mac = new qiniu.auth.digest.Mac(configProject.qiniuAccessKey, configProject.qiniuSecretKey);
    const options = {
        scope: bucket
    };
    let putPolicy = new qiniu.rs.PutPolicy(options);
    return putPolicy.uploadToken(mac)
}

router.get('/list', (req, res) => {
    verifyAuthorization(req)
        .then(userInfo => {
            // let startPoint = 0
            // if (req.query.pageNo && req.query.pageSize){
            //     startPoint = (Number(req.query.pageNo) - 1) * Number(req.query.pageSize) // 文件起点
            // }
            //
            let sqlArray = []
            sqlArray.push(`SELECT * from ${CURRENT_TABLE} `)

            let tempQueryArray = []
            // keywords
            if (req.query.keywords){
                let keywords = JSON.parse(String(req.query.keywords))
                console.log(keywords)
                if (keywords.length > 0){
                    let keywordStrArray = keywords.map((keyword: string) => ` description like '%${keyword}%' ESCAPE '/' ` )
                    tempQueryArray.push(keywordStrArray.join(' or ')) // 在每个 keywords 中间添加 'or'
                }
            }

            // bucket
            if (req.query.bucket){
                tempQueryArray.push(` bucket = '${req.query.bucket}'`) // 在每个 categoryString 中间添加 'or'
            }

            if (tempQueryArray.length > 0){
                sqlArray.push(' where ')
                sqlArray.push(tempQueryArray.join(' and '))
            }

            sqlArray.push(`order by date_create desc`)

            getDataFromDB( DB_NAME, sqlArray)
                .then(data => {
                    updateUserLastLoginTime(userInfo.uid)
                    res.send(new ResponseSuccess(data, '请求成功'))
                })
                .catch(err => {
                    res.send(new ResponseError(err, err.message))
                })
        })
        .catch(verified => {
            res.send(new ResponseError(verified, '无权查看文件列表：用户信息错误'))
        })
})

router.post('/add', (req, res) => {
    verifyAuthorization(req)
        .then(userInfo => {
            if (userInfo.email === configProject.adminCount ){
                let timeNow = dateFormatter(new Date())
                // query.name_en
                let sqlArray = []
                sqlArray.push(`
                                insert into ${CURRENT_TABLE}(id, description, date_create, type, bucket, base_url) 
                                values('${req.body.id}', '${req.body.description || ''}', '${timeNow}', '${req.body.type}', '${req.body.bucket}', '${req.body.base_url}')`
                )
                operate_db_and_return_added_id(userInfo.uid, DB_NAME, DATA_NAME, sqlArray, '添加', res,)
            } else {
                res.send(new ResponseError('', '无权操作'))
            }

        })
        .catch(err => {
            res.send(new ResponseError('', err.message))
        })

})
router.delete('/delete', (req, res) => {
    verifyAuthorization(req)
        .then(userInfo => {
            if (userInfo.email === configProject.adminCount ){
                let sqlArray = []
                sqlArray.push(`
                    delete from ${CURRENT_TABLE} 
                               where id = '${req.body.id}'
                    `)
                operate_db_without_return(userInfo.uid, DB_NAME, DATA_NAME, sqlArray, '删除', res)
            } else {
                res.send(new ResponseError('', '无权操作'))
            }

        })
        .catch(err => {
            res.send(new ResponseError('', err.message))
        })
})

export default router
