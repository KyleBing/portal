import express from "express"
import {ResponseSuccess, ResponseError } from "@response/Response";
import {
    unicodeEncode,
    unicodeDecode,
    dateFormatter,
    getDataFromDB,
    updateUserLastLoginTime,
    verifyAuthorization,
} from "@config/utility";
import {User} from "@entity/User";
import { Request, Response } from "express-serve-static-core";

const router = express.Router()

const CURRENT_TABLE = 'map_pointer'

router.post('/list', (req, res) => {
    verifyAuthorization(req)
        // 已经登录
        .then(userInfo => {
            getPointerList(userInfo, req, res)
        })
        // 未登录
        .catch(_ => {
            getPointerList(null, req, res)
            // res.send(new ResponseError(verified, '无权查看路线列表：用户信息错误'))
        })
})

function getPointerList(userInfo: User, req: Request<{}>, res: Response){
    let sqlBase = `select  
                        ${CURRENT_TABLE}.id, 
                        ${CURRENT_TABLE}.name, 
                        ${CURRENT_TABLE}.pointers, 
                        ${CURRENT_TABLE}.note, 
                        ${CURRENT_TABLE}.area, 
                        ${CURRENT_TABLE}.date_create, 
                        ${CURRENT_TABLE}.date_modify, 
                        ${CURRENT_TABLE}.thumb_up, 
                        ${CURRENT_TABLE}.is_public, 
                        ${CURRENT_TABLE}.uid,
                       users.wx,
                       users.uid,
                       users.nickname,
                       users.username
                            from ${CURRENT_TABLE}
                                left join users on ${CURRENT_TABLE}.uid = users.uid
                            `
    let filterArray = []

    // PUBLIC
    if (userInfo){ // 已登录
        filterArray.push(`is_public = 1 or ${CURRENT_TABLE}.uid = ${userInfo.uid}`)
    } else { // 未登录
        filterArray.push(`is_public = 1`)
    }

    // keywords
    if (req.body.keyword) {
        let keywords = req.body.keyword.split(' ').map((item: string) => unicodeEncode(item))
        if (keywords.length > 0) {
            let keywordStrArray = keywords.map((keyword: string) => `( ${CURRENT_TABLE}.name like '%${keyword}%' ESCAPE '/'  or  ${CURRENT_TABLE}.note like '%${keyword}%' ESCAPE '/') `)
            filterArray.push(keywordStrArray.join(' and ')) // 在每个 categoryString 中间添加 'or'
        }
    }
    // date range
    if (req.body.dateRange && req.body.dateRange.length === 2) {
        if (filterArray.length > 0) {
            filterArray.push(`and`)
        }
        filterArray.push(`date_init between '${req.body.dateRange[0]}' AND '${req.body.dateRange[1]}'`)
    }

    if (filterArray.length > 0) {
        filterArray.unshift('where')
    }

    let promisesAll = []
    let pointStart = (Number(req.body.pageNo) - 1) * Number(req.body.pageSize)
    let sql = `${sqlBase} ${filterArray.join(' ')}  limit ${pointStart} , ${req.body.pageSize}`
    console.log(sql)
    promisesAll.push(getDataFromDB(
        'diary',
        [sql])
    )
    promisesAll.push(getDataFromDB(
        'diary',
        [`select count(*) as sum from ${CURRENT_TABLE} ${filterArray.join(' ')}`], true)
    )

    Promise
        .all(promisesAll)
        .then(([dataList, dataSum]) => {
            dataList.forEach(item => {
                item.name = unicodeDecode(item.name)
                item.note = unicodeDecode(item.note)
                return item
            })
            res.send(new ResponseSuccess({
                list: dataList,
                pager: {
                    pageSize: Number(req.body.pageSize),
                    pageNo: Number(req.body.pageNo),
                    total: dataSum.sum
                }
            }, '请求成功'))

        })
        .catch(err => {
            res.send(new ResponseError(err, err.message))
        })
}

router.get('/detail', (req, res) => {
    let sql = `select  
                                ${CURRENT_TABLE}.id, 
                                ${CURRENT_TABLE}.name, 
                                ${CURRENT_TABLE}.pointers, 
                                ${CURRENT_TABLE}.note, 
                                ${CURRENT_TABLE}.area, 
                                ${CURRENT_TABLE}.date_create, 
                                ${CURRENT_TABLE}.date_modify, 
                                ${CURRENT_TABLE}.thumb_up, 
                                ${CURRENT_TABLE}.is_public, 
                                ${CURRENT_TABLE}.uid,
                               users.uid,
                               users.nickname,
                               users.username
                                    from ${CURRENT_TABLE}
                                        left join users on ${CURRENT_TABLE}.uid = users.uid where id = ${req.query.id}`
    getDataFromDB('diary', [sql], true)
        .then(lineInfoData => {
            if (lineInfoData.is_public === 1){
                res.send(new ResponseSuccess(lineInfoData))
            } else {
                verifyAuthorization(req)
                    .then(userInfo => {
                        if (lineInfoData.uid === userInfo.uid || userInfo.group_id === 1){
                            res.send(new ResponseSuccess(lineInfoData))
                        } else {
                            res.send(new ResponseError('', '该路线信息不属于您，无权操作'))
                        }
                    })
                    .catch(errInfo => {
                        res.send(new ResponseError('', errInfo))
                    })
            }
        })
        .catch(err => {
            res.send(new ResponseError(err, '查无此路线'))
        })
})

router.post('/add', (req, res) => {
    // 1. 验证用户信息是否正确
    verifyAuthorization(req)
        .then(userInfo => {
            // 2. 检查路线名是否已存在
            let encodedName = unicodeEncode(req.body.name)
            checkPointerExist(encodedName)
                .then(existLogs => {
                    console.log(existLogs)
                    if (existLogs.length > 0) {
                        // 2.1 已存在名为 hash 的记录
                        res.send(new ResponseError('', `已存在名为 ${req.body.name} 的地域信息`))
                    } else {
                        // 2.2 不存在名为 hash 的记录
                        let sqlArray = []
                        let parsedName = unicodeEncode(req.body.name) // !
                        let parsedNote = unicodeEncode(req.body.note) || ''
                        let timeNow = dateFormatter(new Date())
                        sqlArray.push(`
                           insert into ${CURRENT_TABLE}(
                           name, pointers, note, uid, date_create, date_modify, area, thumb_up, is_public)
                            values(
                                '${parsedName}',
                                '${req.body.pointers}',
                                '${parsedNote || ""}',
                                '${userInfo.uid}',
                                '${timeNow}',
                                '${timeNow}',
                                '${req.body.area || ''}',
                                '${req.body.thumb_up || 0}',
                                '${Number(req.body.is_public)}'
                                )
                        `)
                        getDataFromDB('diary', sqlArray)
                            .then(data => {
                                updateUserLastLoginTime(userInfo.uid)
                                res.send(new ResponseSuccess( // 添加成功之后，返回添加后的 路线  id
                                    {id: data.insertId},
                                    '信息添加成功',
                                ))
                            })
                            .catch(err => {
                                console.log(err)
                                res.send(new ResponseError(err, '添加失败'))
                            })
                    }
                })
                .catch(err => {
                    res.send(new ResponseError(err, '查询路径记录出错'))
                })

        })
        .catch(errInfo => {
            res.send(new ResponseError('', errInfo))
        })
})

// 检查用户名或邮箱是否存在
function checkPointerExist(pointerName) {
    let sqlArray = []
    sqlArray.push(`select * from map_route where name='${pointerName}'`)
    return getDataFromDB('diary', sqlArray)
}


router.put('/modify', (req, res) => {

    Promise.all([
        verifyAuthorization(req),
        getDataFromDB('diary', [`select * from ${CURRENT_TABLE} where id = ${req.body.id}`], true)
    ])
        .then(response => {
            let userInfo = response[0]
            let lineInfoData = response[1]
            if (lineInfoData.uid === userInfo.uid || userInfo.group_id === 1){
                let parsedName = unicodeEncode(req.body.name) // !
                let parsedNote = unicodeEncode(req.body.note) || ''
                let timeNow = dateFormatter(new Date())
                let sqlArray = []
                sqlArray.push(`
                        update ${CURRENT_TABLE}
                            set name = '${parsedName}',
                                pointers = '${req.body.pointers}',
                                note = '${parsedNote|| ""}',
                                date_modify = '${timeNow}',
                                area = '${req.body.area || ""}',
                                is_public = ${Number(req.body.is_public)}
                               
                            WHERE id='${req.body.id}'
                    `)
                getDataFromDB('diary', sqlArray, true)
                    .then(data => {
                        updateUserLastLoginTime(req.body.email)
                        res.send(new ResponseSuccess(data, '修改成功'))
                    })
                    .catch(err => {
                        res.send(new ResponseError(err, '修改失败'))
                    })

            } else {
                res.send(new ResponseError('', '该路线信息不属于您，无权操作'))
            }
        })
        .catch(err => {
            res.send(new ResponseError(err, '查无此路线'))
        })
})

router.delete('/delete', (req, res) => {
    Promise.all([
        verifyAuthorization(req),
        getDataFromDB('diary', [`select * from ${CURRENT_TABLE} where id = ${req.body.id}`], true)
    ])
        .then(response => {
            let userInfo = response[0]
            let lineInfoData = response[1]
            if (lineInfoData.uid === userInfo.uid || userInfo.group_id === 1){
                let sqlArray = []
                sqlArray.push(`
                        DELETE from ${CURRENT_TABLE}
                        WHERE id='${req.body.id}'
                    `)
                getDataFromDB('diary', sqlArray)
                    .then(data => {
                        if (data.affectedRows > 0) {
                            updateUserLastLoginTime(userInfo.uid)
                            res.send(new ResponseSuccess('', '删除成功'))
                        } else {
                            res.send(new ResponseError('', '删除失败'))
                        }
                    })
                    .catch(err => {
                        res.send(new ResponseError(err,))
                    })

            } else {
                res.send(new ResponseError('', '该路线不属于您，无权操作'))
            }
        })
        .catch(err => {
            res.send(new ResponseError(err, '查无此路线'))
        })
})

export default router
