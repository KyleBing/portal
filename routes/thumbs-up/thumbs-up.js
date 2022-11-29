const express = require('express')
const router = express.Router()
const utility = require('../../config/utility')
const ResponseSuccess = require('../../response/ResponseSuccess')
const ResponseError = require('../../response/ResponseError')
const configProject = require("../../config/configProject");


/**
 * 获取点赞初始计数
 * req.query.key
 */

router.get('/', (req, res, next) => {
    if (req.query.key) {
        let sqlArray = [
            `SELECT *
             from thumbs_up
             where name = '${req.query.key}'`
        ]
        utility
            .getDataFromDB( 'diary', sqlArray, true)
            .then(thumbsUpResult => {
                res.send(new ResponseSuccess(thumbsUpResult.count, '请求成功'))
            })
            .catch(err => {
                res.send(new ResponseError(err, err.message))
            })
    } else {
        res.send(new ResponseError('', 'key 值未定义'))
    }
})

router.get('/all', (req, res, next) => {
    let sqlArray = [
        `SELECT *
             from thumbs_up`
    ]
    utility
        .getDataFromDB( 'diary', sqlArray)
        .then(thumbsUpResult => {
            res.send(new ResponseSuccess(thumbsUpResult, '请求成功'))
        })
        .catch(err => {
            res.send(new ResponseError(err, err.message))
        })
})

router.get('/list', (req, res, next) => {
    let sqlArray = []
    sqlArray.push(` select * from thumbs_up order by date_init asc`)
    utility
        .getDataFromDB( 'diary', sqlArray)
        .then(data => {
            if (data) { // 没有记录时会返回  undefined
                res.send(new ResponseSuccess(data))
            } else {
                res.send(new ResponseError('', '点赞信息查询错误'))
            }
        })
        .catch(err => {
            res.send(new ResponseError(err, err.message))
        })
})

router.post('/add', (req, res, next) => {
    checkThumbsUpExist(req.body.name)
        .then(dataThumbsUpExistanceArray => {
            // email 记录是否已经存在
            if (dataThumbsUpExistanceArray.length > 0){
                return res.send(new ResponseError('', '点赞信息名已存在'))
            } else {
                utility
                    .verifyAuthorization(req)
                    .then(userInfo => {
                        if (userInfo.email === configProject.adminCount ){
                            let timeNow = utility.dateFormatter(new Date())
                            let sqlArray = []
                            sqlArray.push(`
                                insert into thumbs_up(name, count, description, link_address, date_init) 
                                values('${req.body.name}', ${req.body.count}, '${req.body.description || ''}', '${req.body.link_address}', '${timeNow}')`
                            )
                            utility
                                .getDataFromDB( 'diary', sqlArray)
                                .then(data => {
                                    if (data) { // 没有记录时会返回  undefined
                                        utility.updateUserLastLoginTime(userInfo.uid)
                                        res.send(new ResponseSuccess({id: data.insertId}, '添加成功')) // 添加成功之后，返回添加后的 id
                                    } else {
                                        res.send(new ResponseError('', '点赞信息查询错误'))
                                    }
                                })
                                .catch(err => {
                                    res.send(new ResponseError(err, '点赞信息添加失败'))
                                })
                        } else {
                            res.send(new ResponseError('', '无权操作'))
                        }

                    })
                    .catch(err => {
                        res.send(new ResponseError('', err.message))
                    })

            }
        })
})

router.put('/modify', (req, res, next) => {
    utility
        .verifyAuthorization(req)
        .then(userInfo => {
            if (userInfo.email === configProject.adminCount ){
                let timeNow = utility.dateFormatter(new Date())
                let sqlArray = []
                sqlArray.push(`
                    update thumbs_up set 
                    name = '${req.body.name}',
                    count = ${req.body.count},
                    description = '${req.body.description}',
                    link_address = '${req.body.link_address}'
                    where name = '${req.body.name}'
                `)
                utility
                    .getDataFromDB( 'diary', sqlArray)
                    .then(data => {
                        if (data) { // 没有记录时会返回  undefined
                            utility.updateUserLastLoginTime(userInfo.uid)
                            res.send(new ResponseSuccess({id: data.insertId}, '修改成功')) // 添加成功之后，返回添加后的点赞信息 id
                        } else {
                            res.send(new ResponseError('', '点赞信息操作错误'))
                        }
                    })
                    .catch(err => {
                        res.send(new ResponseError(err, '点赞信息修改失败'))
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
                    delete from thumbs_up 
                               where name = '${req.body.name}'
                    `)
                utility
                    .getDataFromDB( 'diary', sqlArray)
                    .then(data => {
                        if (data) { // 没有记录时会返回  undefined
                            utility.updateUserLastLoginTime(userInfo.uid)
                            res.send(new ResponseSuccess({id: data.insertId}, '删除成功')) // 添加成功之后，返回添加后的点赞信息 id
                        } else {
                            res.send(new ResponseError('', '点赞信息删除失败'))
                        }
                    })
                    .catch(err => {
                        res.send(new ResponseError(err, '点赞信息删除失败'))
                    })
            } else {
                res.send(new ResponseError('', '无权操作'))
            }

        })
        .catch(err => {
            res.send(new ResponseError('', err.message))
        })
})

// 检查类别是否存在
function checkThumbsUpExist(name){
    let sqlArray = []
    sqlArray.push(`select * from thumbs_up where name='${name}'`)
    return utility.getDataFromDB( 'diary', sqlArray)
}




module.exports = router
