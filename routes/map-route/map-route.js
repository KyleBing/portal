const express = require('express')
const router = express.Router()
const utility = require('../../config/utility')
const ResponseSuccess = require('../../response/ResponseSuccess')
const ResponseError = require('../../response/ResponseError')
const {get} = require("axios");
const CURRENT_DATABASE = 'map_route'


router.post('/list', (req, res, next) => {
    utility
        .verifyAuthorization(req)
        // 已经登录
        .then(userInfo => {
            getRouteLineList(userInfo, req, res)
        })
        // 未登录
        .catch(verified => {
            getRouteLineList(null, req, res)
            // res.send(new ResponseError(verified, '无权查看路线列表：用户信息错误'))
        })
})

function getRouteLineList(userInfo, req, res){
    let sqlBase = `select  
                                ${CURRENT_DATABASE}.id, 
                                ${CURRENT_DATABASE}.name, 
                                ${CURRENT_DATABASE}.area, 
                                ${CURRENT_DATABASE}.road_type, 
                                ${CURRENT_DATABASE}.seasons, 
                                ${CURRENT_DATABASE}.video_link, 
                                ${CURRENT_DATABASE}.paths, 
                                ${CURRENT_DATABASE}.note, 
                                ${CURRENT_DATABASE}.date_init, 
                                ${CURRENT_DATABASE}.date_modify, 
                                ${CURRENT_DATABASE}.thumb_up, 
                                ${CURRENT_DATABASE}.is_public, 
                                ${CURRENT_DATABASE}.policy, 
                                ${CURRENT_DATABASE}.uid,
                               users.phone,
                               users.wx,
                               users.uid,
                               users.nickname,
                               users.username
                                    from ${CURRENT_DATABASE}
                                        left join users on ${CURRENT_DATABASE}.uid = users.uid
                            `
    let filterArray = []

    // PUBLIC
    if (userInfo){ // 已登录
        filterArray.push(`is_public = 1 or ${CURRENT_DATABASE}.uid = ${userInfo.uid}`)
    } else { // 未登录
        filterArray.push(`is_public = 1`)
    }

    // keywords
    if (req.body.keyword) {
        let keywords = req.body.keyword.split(' ').map(item => utility.unicodeEncode(item))
        if (keywords.length > 0) {
            let keywordStrArray = keywords.map(keyword => `( ${CURRENT_DATABASE}.name like '%${keyword}%' ESCAPE '/'  or  ${CURRENT_DATABASE}.note like '%${keyword}%' ESCAPE '/') `)
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
    promisesAll.push(utility.getDataFromDB(
        'diary',
        [sql])
    )
    promisesAll.push(utility.getDataFromDB(
        'diary',
        [`select count(*) as sum from ${CURRENT_DATABASE} ${filterArray.join(' ')}`], true)
    )

    Promise
        .all(promisesAll)
        .then(([dataList, dataSum]) => {
            dataList.forEach(item => {
                item.name = utility.unicodeDecode(item.name)
                item.note = utility.unicodeDecode(item.note)
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

router.get('/detail', (req, res, next) => {
    utility.getDataFromDB('diary', [`select * from ${CURRENT_DATABASE} where id = ${req.query.id}`], true)
        .then(lineInfoData => {
            if (lineInfoData.is_public === 1){
                res.send(new ResponseSuccess(lineInfoData))
            } else {
                utility.verifyAuthorization(req)
                    .then(userInfo => {
                        if (lineInfoData.uid === userInfo.uid || userInfo.group_id === 1){
                            res.send(new ResponseSuccess(lineInfoData))
                        } else {
                            res.send(new ResponseError('', '该路线信息不属于您，无权操作'))
                        }
                    })
            }
        })
        .catch(err => {
            res.send(new ResponseError(err, '服务器错误'))
        })
})

router.post('/add', (req, res, next) => {



    // 1. 验证用户信息是否正确
    utility
        .verifyAuthorization(req)
        .then(userInfo => {
            // 2. 检查路线名是否已存在
            let encodedName = utility.unicodeEncode(req.body.name)
            checkRouteExist(encodedName)
                .then(existLogs => {
                    console.log(existLogs)
                    if (existLogs.length > 0) {
                        // 2.1 已存在名为 hash 的记录
                        res.send(new ResponseError('', `已存在名为 ${req.body.name} 的路线`))
                    } else {
                        // 2.2 不存在名为 hash 的记录
                        let sqlArray = []
                        let parsedName = utility.unicodeEncode(req.body.name) // !
                        let parsedNote = utility.unicodeEncode(req.body.note) || ''
                        let timeNow = utility.dateFormatter(new Date())
                        sqlArray.push(`
                           insert into ${CURRENT_DATABASE}(
                           name, area, road_type, policy, seasons, video_link, paths, note, date_init, date_modify, thumb_up, uid)
                            values(
                                '${parsedName}',
                                '${req.body.area || ""}',
                                '${req.body.road_type || ""}',
                                '${req.body.policy}',
                                '${req.body.seasons || ""}',
                                '${req.body.video_link || ""}',
                                '${req.body.paths}',
                                '${parsedNote|| ""}',
                                '${timeNow}',
                                '${timeNow}',
                                '${req.body.thumb_up || 0}',
                                '${userInfo.uid}'
                                )
                        `)
                        utility
                            .getDataFromDB('diary', sqlArray)
                            .then(data => {
                                utility.updateUserLastLoginTime(userInfo.uid)
                                res.send(new ResponseSuccess( // 添加成功之后，返回添加后的 路线  id
                                    {id: data.insertId},
                                    '添加成功'
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
        .catch(err => {
            res.send(new ResponseError(err, '无权操作'))
        })
})

// 检查用户名或邮箱是否存在
function checkRouteExist(routeName) {
    let sqlArray = []
    sqlArray.push(`select * from map_route where name='${routeName}'`)
    return utility.getDataFromDB('diary', sqlArray)
}


router.put('/modify', (req, res, next) => {

    Promise.all([
        utility.verifyAuthorization(req),
        utility.getDataFromDB('diary', [`select * from ${CURRENT_DATABASE} where id = ${req.body.id}`], true)
    ])
        .then(response => {
            let userInfo = response[0]
            let lineInfoData = response[1]
            if (lineInfoData.uid === userInfo.uid || userInfo.group_id === 1){
                let parsedName = utility.unicodeEncode(req.body.name) // !
                let parsedNote = utility.unicodeEncode(req.body.note) || ''
                let timeNow = utility.dateFormatter(new Date())
                let sqlArray = []
                sqlArray.push(`
                        update ${CURRENT_DATABASE}
                            set name = '${parsedName}',
                                area = '${req.body.area || ""}',
                                road_type = '${req.body.road_type || ""}',
                                policy = '${req.body.policy}',
                                seasons = '${req.body.seasons || ""}',
                                video_link = '${req.body.video_link || ""}',
                                paths = '${req.body.paths}',
                                note = '${parsedNote|| ""}',
                                date_modify = '${timeNow}',
                                is_public = ${Number(req.body.is_public)},
                                thumb_up = '${req.body.thumb_up || 0}'
                            WHERE id='${req.body.id}'
                    `)
                utility
                    .getDataFromDB('diary', sqlArray, true)
                    .then(data => {
                        utility.updateUserLastLoginTime(req.body.email)
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
            res.send(new ResponseError(err, '服务器错误'))
        })
})

router.delete('/delete', (req, res, next) => {
    Promise.all([
        utility.verifyAuthorization(req),
        utility.getDataFromDB('diary', [`select * from ${CURRENT_DATABASE} where id = ${req.body.id}`], true)
    ])
        .then(response => {
            let userInfo = response[0]
            let lineInfoData = response[1]
            if (lineInfoData.uid === userInfo.uid || userInfo.group_id === 1){
                let sqlArray = []
                sqlArray.push(`
                        DELETE from ${CURRENT_DATABASE}
                        WHERE id='${req.body.id}'
                    `)
                utility
                    .getDataFromDB('diary', sqlArray)
                    .then(data => {
                        if (data.affectedRows > 0) {
                            utility.updateUserLastLoginTime(userInfo.uid)
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
            res.send(new ResponseError(err, '服务器错误'))
        })
})


module.exports = router
