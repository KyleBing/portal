const express = require('express')
const router = express.Router()
const configProject = require('../../config/configProject')
const utility = require('../../config/utility')
const ResponseSuccess = require('../../response/ResponseSuccess')
const ResponseError = require('../../response/Response')

const qiniu = require("qiniu")

/**
 * 七牛云图片 处理
 */
const DB_NAME = 'diary' // 数据库名
const TABLE_NAME = 'image_qiniu' // 文件存储
const DATA_NAME = '七牛云图片'    // 操作的数据名

// 生成 token 根据 bucket
router.get('/', (req, res, next) => {
    if (req.query.bucket){
        if (req.query.hahaha){
            res.send(new ResponseSuccess(getQiniuToken(req.query.bucket), '凭证获取成功'))
        } else {
            utility
                .verifyAuthorization(req)
                .then(userInfo => {
                    res.send(new ResponseSuccess(getQiniuToken(req.query.bucket), '凭证获取成功'))
                })
                .catch(err => {
                    res.send(new ResponseError('', '参数错误'))
                })
        }
    } else {
        res.send(new ResponseError('', '缺少 bucket 参数'))
    }
})

function getQiniuToken(bucket){
    let mac = new qiniu.auth.digest.Mac(configProject.qiniuAccessKey, configProject.qiniuSecretKey);
    const options = {
        scope: bucket
    };
    let putPolicy = new qiniu.rs.PutPolicy(options);
    return putPolicy.uploadToken(mac)
}

router.get('/list', (req, res, next) => {
    utility
        .verifyAuthorization(req)
        .then(userInfo => {
            let startPoint = (req.query.pageNo - 1) * req.query.pageSize // 文件起点

            let sqlArray = []
            sqlArray.push(`SELECT * from ${TABLE_NAME} `)

            let tempQueryArray = []
            // keywords
            if (req.query.keywords){
                let keywords = JSON.parse(req.query.keywords)
                console.log(keywords)
                if (keywords.length > 0){
                    let keywordStrArray = keywords.map(keyword => ` description like '%${keyword}%' ESCAPE '/' ` )
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

            utility
                .getDataFromDB( DB_NAME, sqlArray)
                .then(data => {
                    utility.updateUserLastLoginTime(userInfo.uid)
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
router.post('/add', (req, res, next) => {
    utility
        .verifyAuthorization(req)
        .then(userInfo => {
            if (userInfo.email === configProject.adminCount ){
                let timeNow = utility.dateFormatter(new Date())
                // query.name_en
                let sqlArray = []
                sqlArray.push(`
                                insert into ${TABLE_NAME}(id, description, date_create, type, bucket, base_url) 
                                values('${req.body.id}', '${req.body.description || ''}', '${timeNow}', '${req.body.type}', '${req.body.bucket}', '${req.body.base_url}')`
                )
                utility
                    .getDataFromDB( DB_NAME, sqlArray)
                    .then(data => {
                        if (data) { // 没有记录时会返回  undefined
                            utility.updateUserLastLoginTime(userInfo.uid)
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
router.delete('/delete', (req, res, next) => {
    utility
        .verifyAuthorization(req)
        .then(userInfo => {
            if (userInfo.email === configProject.adminCount ){
                let sqlArray = []
                sqlArray.push(`
                    delete from ${TABLE_NAME} 
                               where id = '${req.body.id}'
                    `)
                utility
                    .getDataFromDB( DB_NAME, sqlArray)
                    .then(data => {
                        if (data) { // 没有记录时会返回  undefined
                            utility.updateUserLastLoginTime(userInfo.uid)
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




module.exports = router
