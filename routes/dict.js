const express = require('express')
const router = express.Router()
const utility = require('../config/utility')
const ResponseSuccess = require('../response/ResponseSuccess')
const ResponseError = require('../response/ResponseError')

const DatabaseTableName = 'wubi_dict'

router.get('/pull', (req, res, next) => {
    // 1. 是否属于系统中的用户
    utility.verifyAuthorization(req)
        .then(verified => {
            let sqlArray = [`select * from ${DatabaseTableName} where title = '${req.query.title}' and  uid='${req.query.uid}'`]
            // 1. 先查询出码表结果
            utility.getDataFromDB(sqlArray)
                .then(result => {
                    if (result.length > 0){
                        let data = result[0]
                        data.title = utility.unicodeDecode(data.title)
                        // 记录最后访问时间
                        utility.updateUserLastLoginTime(req.query.email)
                        res.send(new ResponseSuccess(data))
                    } else {
                        res.send(new ResponseSuccess('','不存在词库'))
                    }
                })
                .catch(err => {
                    res.send(new ResponseError(err,))
                })
        })
        .catch(unverified => {
            res.send(new ResponseError('', '当前用户无权查看该码表：用户信息错误'))
        })
})


router.put('/push', (req, res, next) => {
    let timeNow = utility.dateFormatter(new Date())

    // 1. 是否属于系统中的用户
    utility.verifyAuthorization(req)
        .then(verified => {
            let encodedTitle = utility.unicodeEncode(req.body.title) // encode 是因为，文件名中可能包含 emoji

            // 2. 检测是否存在内容
            let sqlArray = [`select * from ${DatabaseTableName} where title='${encodedTitle}' and uid='${req.body.uid}'`]
            return utility.getDataFromDB(sqlArray)
                .then(existData => {
                    console.log(existData)
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
                                    WHERE title='${encodedTitle}' and uid='${req.body.uid}'
                            `)

                        utility.getDataFromDB(sqlArray, true)
                            .then(data => {
                                utility.updateUserLastLoginTime(req.body.email)
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
                            VALUES( '${encodedTitle}','${req.body.content}', '${req.body.contentSize}','${req.body.wordCount}','${timeNow}','${timeNow}','','${req.body.uid}')`
                        )

                        utility.getDataFromDB(sqlArray)
                            .then(data => {
                                utility.updateUserLastLoginTime(req.body.email)
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
        .catch(unverified => {
            res.send(new ResponseError('','当前用户无权查看该码表：用户信息错误'))
        })
})



module.exports = router
