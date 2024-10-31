import express from "express"
import {ResponseSuccess, ResponseError } from "@response/Response";
import configProject from "../../config/configProject";
import {
    dateFormatter,
    getDataFromDB,
    updateUserLastLoginTime,
    verifyAuthorization
} from "@config/utility";
const router = express.Router()

import qiniu from 'qiniu'

/**
 * 七牛云图片 处理
 */
const DB_NAME = 'diary' // 数据库名
const TABLE_NAME = 'image_qiniu' // 文件存储
const DATA_NAME = '七牛云图片'    // 操作的数据名

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
            sqlArray.push(`SELECT * from ${TABLE_NAME} `)

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
                                insert into ${TABLE_NAME}(id, description, date_create, type, bucket, base_url) 
                                values('${req.body.id}', '${req.body.description || ''}', '${timeNow}', '${req.body.type}', '${req.body.bucket}', '${req.body.base_url}')`
                )
                getDataFromDB( DB_NAME, sqlArray)
                    .then(data => {
                        if (data) { // 没有记录时会返回  undefined
                            updateUserLastLoginTime(userInfo.uid)
                            res.send(new ResponseSuccess({id: data.insertId}, '添加成功')) // 添加成功之后，返回添加后的文件 id
                        } else {
                            res.send(new ResponseError('', `${DATA_NAME}查询错误`))
                        }
                    })
                    .catch(err => {
                        res.send(new ResponseError(err, `${DATA_NAME}添加失败`))
                    })
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
                    delete from ${TABLE_NAME} 
                               where id = '${req.body.id}'
                    `)
                getDataFromDB( DB_NAME, sqlArray)
                    .then(data => {
                        if (data) { // 没有记录时会返回  undefined
                            updateUserLastLoginTime(userInfo.uid)
                            res.send(new ResponseSuccess({id: data.insertId}, '删除成功')) // 添加成功之后，返回添加后的文件类别 id
                        } else {
                            res.send(new ResponseError('', `${DATA_NAME}删除失败`))
                        }
                    })
                    .catch(err => {
                        res.send(new ResponseError(err, `${DATA_NAME}删除失败`))
                    })
            } else {
                res.send(new ResponseError('', '无权操作'))
            }

        })
        .catch(err => {
            res.send(new ResponseError('', err.message))
        })
})

export default router
