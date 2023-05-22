const express = require('express')
const router = express.Router()
const configProject = require('../../config/configProject')
const utility = require('../../config/utility')
const ResponseSuccess = require('../../response/ResponseSuccess')
const ResponseError = require('../../response/ResponseError')

const qiniu = require("qiniu")

/**
 * 七牛云 图片处理
 */

const TABLE_NAME = 'files' // 文件存储
const DATA_NAME = '文件'          // 操作的数据名

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
            sqlArray.push(`SELECT *
                  from ${TABLE_NAME} 
                 `)

            // keywords
            if (req.query.keywords){
                let keywords = JSON.parse(req.query.keywords).map(item => utility.unicodeEncode(item))
                console.log(keywords)
                if (keywords.length > 0){
                    let keywordStrArray = keywords.map(keyword => `( title like '%${keyword}%' ESCAPE '/'  or content like '%${keyword}%' ESCAPE '/')` )
                    sqlArray.push(' and ' + keywordStrArray.join(' and ')) // 在每个 categoryString 中间添加 'or'
                }
            }

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
                                insert into ${TABLE_NAME}(id, description, date_create, type) 
                                values('${req.body.id}', '${req.body.description || ''}', '${timeNow}', '${req.body.type}')`
                )
                utility
                    .getDataFromDB( 'diary', sqlArray)
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
                    .getDataFromDB( 'diary', sqlArray)
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
