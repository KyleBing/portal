const express = require('express')
const router = express.Router()
const utility = require('../../config/utility')
const ResponseSuccess = require('../../response/ResponseSuccess')
const ResponseError = require('../../response/ResponseError')

const DatabaseTableName = 'wubi_dict'

// 下载码表文件
router.get('/pull', (req, res, next) => {
    // 1. 是否属于系统中的用户
    utility
        .verifyAuthorization(req)
        .then(userInfo => {
            let sqlArray = [`select * from ${DatabaseTableName} where title = '${req.query.title}' and  uid='${userInfo.uid}'`]
            // 1. 先查询出码表结果
            utility
                .getDataFromDB( 'diary', sqlArray)
                .then(result => {
                    if (result.length > 0){
                        let data = result[0]
                        data.title = utility.unicodeDecode(data.title)
                        // 记录最后访问时间
                        utility.updateUserLastLoginTime(userInfo.uid)
                        res.send(new ResponseSuccess(data))
                    } else {
                        res.send(new ResponseSuccess('','不存在词库'))
                    }
                })
                .catch(err => {
                    res.send(new ResponseError(err,))
                })
        })
        .catch(errInfo => {
            res.send(new ResponseError('', errInfo))
        })
})

// 上传码表文件
router.put('/push', (req, res, next) => {
    let timeNow = utility.dateFormatter(new Date())

    // 1. 是否属于系统中的用户
    utility
        .verifyAuthorization(req)
        .then(userInfo => {
            let encodedTitle = utility.unicodeEncode(req.body.title) // encode 是因为，文件名中可能包含 emoji

            // 2. 检测是否存在内容
            let sqlArray = [`select * from ${DatabaseTableName} where title='${encodedTitle}' and uid='${userInfo.uid}'`]
            return utility.getDataFromDB( 'diary', sqlArray)
                .then(existData => {
                    // console.log(existData)
                    if (existData.length > 0) {
                        // update content
                        let sqlArray = []
                        sqlArray.push(`
                                update ${DatabaseTableName}
                                    set
                                       title='${encodedTitle}',
                                       content='${req.body.content}',
                                       content_size='${req.body.contentSize}',
                                       word_count='${req.body.wordCount}',
                                       date_update='${timeNow}'
                                    WHERE title='${encodedTitle}' and uid='${userInfo.uid}';
                            `)
                        sqlArray.push(`update users set sync_count=sync_count + 1 WHERE uid='${userInfo.uid}'`)

                        utility
                            .getDataFromDB( 'diary', sqlArray, true)
                            .then(data => {
                                utility.updateUserLastLoginTime(userInfo.uid)
                                res.send(new ResponseSuccess(data, '上传成功'))
                            })
                            .catch(err => {
                                res.send(new ResponseError(err, '上传失败'))
                            })

                    } else {
                        // insert content
                        let sqlArray = []
                        sqlArray.push(`
                            INSERT into ${DatabaseTableName}(title, content, content_size, word_count, date_init, date_update, comment, uid)
                            VALUES( '${encodedTitle}','${req.body.content}', '${req.body.contentSize}','${req.body.wordCount}','${timeNow}','${timeNow}','','${userInfo.uid}')`
                        )

                        utility
                            .getDataFromDB( 'diary', sqlArray)
                            .then(data => {
                                utility.updateUserLastLoginTime(userInfo.uid)
                                res.send(new ResponseSuccess({id: data.insertId}, '上传成功')) // 添加成功之后，返回添加后的码表 id
                            })
                            .catch(err => {
                                res.send(new ResponseError(err, '上传失败'))
                            })
                    }
                })
                .catch(err => {

                })
        })
        .catch(errInfo => {
            res.send(new ResponseError('', errInfo))
        })
})

// 检查对应的文件是否存在备份
router.post('/check-backup-exist', (req, res, next) => {
    // 1. 是否属于系统中的用户
    utility
        .verifyAuthorization(req)
        .then(userInfo => {
            let sqlArray = [`select id,title,content_size,word_count, date_init, date_update, comment, uid, sync_count from ${DatabaseTableName} where title = '${req.body.fileName}' and  uid='${userInfo.uid}'`]
            // 1. 先查询出码表结果
            utility
                .getDataFromDB( 'diary', sqlArray, true)
                .then(result => {
                    res.send(new ResponseSuccess(result, '信息获取成功'))
                })
                .catch(err => {
                    res.send(new ResponseError(err,))
                })
        })
        .catch(errInfo => {
            res.send(new ResponseError('', errInfo))
        })
})




module.exports = router
