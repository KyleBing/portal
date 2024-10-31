import express from "express"
import {ResponseSuccess, ResponseError } from "@response/Response";
import configProject from "../../config/configProject";
import {
    dateFormatter,
    getDataFromDB,
    updateUserLastLoginTime,
    verifyAuthorization,
} from "@config/utility";
const router = express.Router()

/**
 * 获取点赞初始计数
 * req.query.key
 */

router.get('/', (req, res) => {
    if (req.query.key) {
        let sqlArray = [
            `SELECT *
             from thumbs_up
             where name = '${req.query.key}'`
        ]
        getDataFromDB( 'diary', sqlArray, true)
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

router.get('/all', (_, res) => {
    let sqlArray = [
        `SELECT *
             from thumbs_up`
    ]
    getDataFromDB( 'diary', sqlArray)
        .then(thumbsUpResult => {
            res.send(new ResponseSuccess(thumbsUpResult, '请求成功'))
        })
        .catch(err => {
            res.send(new ResponseError(err, err.message))
        })
})

router.get('/list', (_, res) => {
    let sqlArray = []
    sqlArray.push(` select * from thumbs_up order by date_init asc`)
    getDataFromDB( 'diary', sqlArray)
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

router.post('/add', (req, res) => {
    checkThumbsUpExist(req.body.name)
        .then(dataThumbsUpExistenceArray => {
            // email 记录是否已经存在
            if (dataThumbsUpExistenceArray.length > 0){
                return res.send(new ResponseError('', '点赞信息名已存在'))
            } else {
                verifyAuthorization(req)
                    .then(userInfo => {
                        if (userInfo.email === configProject.adminCount ){
                            let timeNow = dateFormatter(new Date())
                            let sqlArray = []
                            sqlArray.push(`
                                insert into thumbs_up(name, count, description, link_address, date_init) 
                                values('${req.body.name}', ${req.body.count}, '${req.body.description || ''}', '${req.body.link_address}', '${timeNow}')`
                            )
                            getDataFromDB( 'diary', sqlArray)
                                .then(data => {
                                    if (data) { // 没有记录时会返回  undefined
                                        updateUserLastLoginTime(userInfo.uid)
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

router.put('/modify', (req, res) => {
    verifyAuthorization(req)
        .then(userInfo => {
            if (userInfo.email === configProject.adminCount ){
                // let timeNow = dateFormatter(new Date())
                let sqlArray = []
                sqlArray.push(`
                    update thumbs_up set 
                    name = '${req.body.name}',
                    count = ${req.body.count},
                    description = '${req.body.description}',
                    link_address = '${req.body.link_address}'
                    where name = '${req.body.name}'
                `)
                getDataFromDB( 'diary', sqlArray)
                    .then(data => {
                        if (data) { // 没有记录时会返回  undefined
                            updateUserLastLoginTime(userInfo.uid)
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

router.delete('/delete', (req, res) => {
    verifyAuthorization(req)
        .then(userInfo => {
            if (userInfo.email === configProject.adminCount ){
                let sqlArray = []
                sqlArray.push(`
                    delete from thumbs_up 
                               where name = '${req.body.name}'
                    `)
                getDataFromDB( 'diary', sqlArray)
                    .then(data => {
                        if (data) { // 没有记录时会返回  undefined
                            updateUserLastLoginTime(userInfo.uid)
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
function checkThumbsUpExist(name: string){
    let sqlArray = []
    sqlArray.push(`select * from thumbs_up where name='${name}'`)
    return getDataFromDB( 'diary', sqlArray)
}

export default router
