import express from "express"
import {ResponseError, ResponseSuccess} from "../response/Response";
import configProject from "../../config/configProject";
import {
    dateFormatter,
    getDataFromDB, operate_db_and_return_added_id, operate_db_without_return,
    verifyAuthorization,
} from "../utility";
const router = express.Router()

const DB_NAME = 'diary'
const DATA_NAME = '点赞'
const CURRENT_TABLE = 'thumbs_up'

/**
 * 获取点赞初始计数
 * req.query.key
 */
router.get('/', (req, res) => {
    if (req.query.key) {
        let sqlArray = [
            `SELECT *
             from ${CURRENT_TABLE}
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
             from ${CURRENT_TABLE}`
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
    sqlArray.push(` select * from ${CURRENT_TABLE} order by date_init asc`)
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
                                insert into ${CURRENT_TABLE}(name, count, description, link_address, date_init) 
                                values('${req.body.name}', ${req.body.count}, '${req.body.description || ''}', '${req.body.link_address}', '${timeNow}')`
                            )
                            operate_db_and_return_added_id(userInfo.uid, DB_NAME, DATA_NAME, sqlArray, '添加', res)

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
                    update ${CURRENT_TABLE} set 
                    name = '${req.body.name}',
                    count = ${req.body.count},
                    description = '${req.body.description}',
                    link_address = '${req.body.link_address}'
                    where name = '${req.body.name}'
                `)
                operate_db_without_return(userInfo.uid, DB_NAME, DATA_NAME, sqlArray, '编辑', res)

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
                               where name = '${req.body.name}'
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

// 检查类别是否存在
function checkThumbsUpExist(name: string){
    let sqlArray = []
    sqlArray.push(`select * from ${CURRENT_TABLE} where name='${name}'`)
    return getDataFromDB( 'diary', sqlArray)
}

export default router
