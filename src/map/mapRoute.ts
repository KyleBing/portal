import express from "express"
import {ResponseError, ResponseSuccess} from "../response/Response";
import configProject from "../../config/configProject";
import {
    unicodeEncode,
    unicodeDecode,
    dateFormatter,
    getDataFromDB,
    verifyAuthorization, operate_db_and_return_added_id, operate_db_without_return
} from "../utility";
import {User} from "entity/User";
const router = express.Router()

const DB_NAME = 'diary'
const DATA_NAME = '路书路径'
const CURRENT_TABLE = 'map_route'


router.post('/list', (req, res) => {
    verifyAuthorization(req)
        // 已经登录
        .then(userInfo => {
            getRouteLineList(userInfo, req, res)
        })
        // 未登录
        .catch(() => {
            getRouteLineList(null, req, res)
            // res.send(new ResponseError(verified, '无权查看路线列表：用户信息错误'))
        })
})

function getRouteLineList(userInfo: User, req, res){
    let sqlBase = `select  
                                ${CURRENT_TABLE}.id, 
                                ${CURRENT_TABLE}.name, 
                                ${CURRENT_TABLE}.area, 
                                ${CURRENT_TABLE}.road_type, 
                                ${CURRENT_TABLE}.seasons, 
                                ${CURRENT_TABLE}.video_link, 
                                ${CURRENT_TABLE}.paths, 
                                ${CURRENT_TABLE}.note, 
                                ${CURRENT_TABLE}.date_init, 
                                ${CURRENT_TABLE}.date_modify, 
                                ${CURRENT_TABLE}.thumb_up, 
                                ${CURRENT_TABLE}.is_public, 
                                ${CURRENT_TABLE}.policy, 
                                ${CURRENT_TABLE}.uid,
                               users.phone,
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
        if (req.body.isMine === "1"){
            filterArray.push(`${CURRENT_TABLE}.uid = ${userInfo.uid}`)
        } else {
            if (userInfo.email === configProject.adminCount){
                filterArray.push(`${CURRENT_TABLE}.uid != ${userInfo.uid}`)
            } else {
                filterArray.push(`is_public = 1 and ${CURRENT_TABLE}.uid != ${userInfo.uid}`)
            }
        }

    } else { // 未登录
        filterArray.push(`is_public = 1`)
    }

    // keywords
    if (req.body.keyword) {
        let keywords = req.body.keyword.split(' ').map((item: string) => unicodeEncode(item))
        if (keywords.length > 0) {
            let keywordStrArray = keywords.map((keyword: string) => ` (${CURRENT_TABLE}.name like '%${keyword}%' ESCAPE '/')`)
            filterArray.push(keywordStrArray.join(' and ')) // 在每个 categoryString 中间添加 'or'
        }
    }
    // date range
    if (req.body.dateRange && req.body.dateRange.length === 2) {
        filterArray.push(`date_init between '${req.body.dateRange[0]}' AND '${req.body.dateRange[1]}'`)
    }

    let filterSql = ''
    if (filterArray.length > 0) {
        filterSql = `where ${filterArray.join(' and ')}`
    }

    let promisesAll = []
    let pointStart = (Number(req.body.pageNo) - 1) * Number(req.body.pageSize)
    let sql = `${sqlBase} ${filterSql}  limit ${pointStart} , ${req.body.pageSize}`
    promisesAll.push(getDataFromDB(
        'diary',
        [sql])
    )
    promisesAll.push(getDataFromDB(
        'diary',
        [`select count(*) as sum from ${CURRENT_TABLE} ${filterSql}`], true)
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
                                ${CURRENT_TABLE}.area, 
                                ${CURRENT_TABLE}.road_type, 
                                ${CURRENT_TABLE}.seasons, 
                                ${CURRENT_TABLE}.video_link, 
                                ${CURRENT_TABLE}.paths, 
                                ${CURRENT_TABLE}.note, 
                                ${CURRENT_TABLE}.date_init, 
                                ${CURRENT_TABLE}.date_modify, 
                                ${CURRENT_TABLE}.thumb_up, 
                                ${CURRENT_TABLE}.is_public, 
                                ${CURRENT_TABLE}.policy, 
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
            checkRouteExist(encodedName)
                .then(existLogs => {
                    console.log(existLogs)
                    if (existLogs.length > 0) {
                        // 2.1 已存在名为 hash 的记录
                        res.send(new ResponseError('', `已存在名为 ${req.body.name} 的路线`))
                    } else {
                        // 2.2 不存在名为 hash 的记录
                        let sqlArray = []
                        let parsedName = unicodeEncode(req.body.name) // !
                        let parsedNote = unicodeEncode(req.body.note) || ''
                        let timeNow = dateFormatter(new Date())
                        sqlArray.push(`
                           insert into ${CURRENT_TABLE}(
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

                        operate_db_and_return_added_id(userInfo.uid, DB_NAME, DATA_NAME, sqlArray, '添加', res,)
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
function checkRouteExist(routeName: string) {
    let sqlArray = []
    sqlArray.push(`select * from map_route where name='${routeName}'`)
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
                operate_db_and_return_added_id(userInfo.uid, DB_NAME, DATA_NAME, sqlArray, '修改', res,)
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
                operate_db_without_return(userInfo.uid, DB_NAME, DATA_NAME, sqlArray, '删除', res)
            } else {
                res.send(new ResponseError('', '该路线不属于您，无权操作'))
            }
        })
        .catch(err => {
            res.send(new ResponseError(err, '查无此路线'))
        })
})

export default router
