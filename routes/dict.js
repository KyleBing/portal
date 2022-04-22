const express = require('express')
const router = express.Router()
const utility = require('../config/utility')
const ResponseSuccess = require('../response/ResponseSuccess')
const ResponseError = require('../response/ResponseError')

const DatabaseTableName = 'wubi_dict'

router.get('/pull', (req, res, next) => {
    // 1. 是否属于系统中的用户
    utility.verifyAuthorization(req.query.uid, req.query.email, req.query.password)
        .then(verified => {
            let sqlArray = [`select * from ${DatabaseTableName} where title = '${req.query.title}' and  uid='${req.query.uid}'`]
            // 1. 先查询出日记结果
            utility.getDataFromDB(sqlArray, true)
                .then(data => {
                    // decode unicode
                    data.title = utility.unicodeDecode(data.title)
                    data.content = utility.unicodeDecode(data.content)
                    // 记录最后访问时间
                    utility.updateUserLastLoginTime(req.query.email)
                    res.send(new ResponseSuccess(data))
                })
                .catch(err => {
                    res.send(new ResponseError(err.message))
                })
        })
        .catch(unverified => {
            res.send(new ResponseError('', '当前用户无权查看该日记：用户信息错误'))
        })
})


router.put('/push', (req, res, next) => {
    let sqlArray = []
    let parsedTitle = utility.unicodeEncode(req.body.title) // !
    let parsedContent = utility.unicodeEncode(req.body.content) || ''
    let timeNow = utility.dateFormatter(new Date())

    // 1. 是否属于系统中的用户
    utility.verifyAuthorization(req.body.uid, req.body.email, req.body.password)
        .then(verified => {

            // 2. 检测是否存在内容
            let sqlArray = [`select * from ${DatabaseTableName} where title='${parsedTitle}' and uid='${req.body.uid}'`]
            return utility.getDataFromDB(sqlArray)
                .then(existData => {
                    console.log(existData)
                    if (existData.length > 0) {
                        // update content
                        let sqlArray = []
                        sqlArray.push(`
                                update ${DatabaseTableName}
                                    set
                                       title='${parsedTitle}',
                                       content='${parsedContent}',
                                       date_update='${timeNow}'
                                    WHERE title='${parsedTitle}' and uid='${req.body.uid}'
                            `)

                        utility.getDataFromDB(sqlArray, true)
                            .then(data => {
                                utility.updateUserLastLoginTime(req.body.email)
                                res.send(new ResponseSuccess(data, '修改成功'))
                            })
                            .catch(err => {
                                res.send(new ResponseError(err.message, '修改失败'))
                            })

                    } else {
                        // insert content
                        let sqlArray = []
                        sqlArray.push(`
                            INSERT into ${DatabaseTableName}(title, content, date_init, date_update, comment, uid)
                            VALUES( '${parsedTitle}','${parsedContent}','${timeNow}','${timeNow}','','${req.body.uid}')`
                        )

                        utility.getDataFromDB(sqlArray)
                            .then(data => {
                                utility.updateUserLastLoginTime(req.body.email)
                                res.send(new ResponseSuccess({id: data.insertId}, '添加成功')) // 添加成功之后，返回添加后的日记 id
                            })
                            .catch(err => {
                                res.send(new ResponseError(err.message, '添加失败'))
                            })
                    }
                })
                .catch(err => {

                })
        })
        .catch(unverified => {
            res.send(new ResponseError('','当前用户无权查看该日记：用户信息错误'))
        })
})



module.exports = router
