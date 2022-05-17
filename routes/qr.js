const express = require('express')
const router = express.Router()
const utility = require('../config/utility')
const ResponseSuccess = require('../response/ResponseSuccess')
const ResponseError = require('../response/ResponseError')


router.get('/list', (req, res, next) => {
    utility.verifyAuthorization(req)
        .then(userInfo => {
            let sqlArray = []
            sqlArray.push(`SELECT *
                  from qrs 
                  where uid='${req.query.uid}'`)

            if (userInfo.groupId === 1){

            } else {
                sqlArray.push([`and uid = ${req.query.uid}`])
            }


            // keywords
            if (req.query.keywords){
                let keywords = JSON.parse(req.query.keywords).map(item => utility.unicodeEncode(item))
                console.log(keywords)
                if (keywords.length > 0){
                    let keywordStrArray = keywords.map(keyword => `( message like '%${keyword}%' ESCAPE '/'  or description like '%${keyword}%' ESCAPE '/')` )
                    sqlArray.push(' and ' + keywordStrArray.join(' and ')) // 在每个 categoryString 中间添加 'or'
                }
            }

            let startPoint = (req.query.pageNo - 1) * req.query.pageCount //  QR 起点
            sqlArray.push(` order by date_init desc
                  limit ${startPoint}, ${req.query.pageCount}`)

            utility.getDataFromDB(sqlArray)
                .then(data => {
                    utility.updateUserLastLoginTime(req.query.email)
                    data.forEach(diary => {
                        // decode unicode
                        diary.title = utility.unicodeDecode(diary.title)
                        diary.content = utility.unicodeDecode(diary.content)
                    })
                    res.send(new ResponseSuccess(data, '请求成功'))
                })
                .catch(err => {
                    res.send(new ResponseError(err, err.message))
                })
        })
        .catch(verified => {
            res.send(new ResponseError('无权查看 QR 列表：用户信息错误'))
        })
})

router.get('/detail', (req, res, next) => {
    let sqlArray = []
    sqlArray.push(`select * from qrs where hash = '${req.query.hash}'`)
    // 1. 先查询出 QR 结果
    utility.getDataFromDB(sqlArray, true)
        .then(data => {
            // decode unicode
            data.message = utility.unicodeDecode(data.message)
            data.description = utility.unicodeDecode(data.description)

            // 2. 判断是否为共享 QR
            if (data.is_public === 1){
                // 2.1 如果是，直接返回结果，不需要判断任何东西
                res.send(new ResponseSuccess(data))
            } else {
                // 2.2 如果不是，需要判断：当前 email 和 token 是否吻合
                utility.verifyAuthorization(req)
                    .then(verified => {
                        // 3. 判断 QR 是否属于当前请求用户
                        if (Number(req.query.uid) === data.uid){
                            // 记录最后访问时间
                            utility.updateUserLastLoginTime(req.query.email)
/*                            // TODO:过滤可见信息 自己看，管理员看，其它用户看
                            if (data.switch_wx){
                                data.wx = ''
                            }
                            if (data.switch_car){
                                data.car = ''
                                data.car_desc = ''
                                data.car_plate = ''
                            }
                            if (data.switch_gaode){
                                data.gaode = ''
                            }
                            if (data.switch_homepage){
                                data.homepage = ''
                            }*/
                            res.send(new ResponseSuccess(data))
                        } else {
                            res.send(new ResponseError('','当前用户无权查看该 QR ：请求用户 ID 与 QR 归属不匹配'))
                        }
                    })
                    .catch(unverified => {
                        res.send(new ResponseError('','当前用户无权查看该 QR ：用户信息错误'))
                    })
            }
        })
        .catch(err => {
            res.send(new ResponseError(err, err.message))
        })
})


router.post('/add', (req, res, next) => {
    // 1. 验证用户信息是否正确
    utility.verifyAuthorization(req.body.uid, req.body.email, req.body.token)
        .then(userInfo => {
            // 2. 检查 Hash 是否存在
            checkHashExist(req.body.hash)
                .then(existLogs => {
                    console.log(existLogs)
                    if (existLogs.length > 0) {
                        // 2.1 已存在名为 hash 的记录
                        res.send(new ResponseError('', `已存在名为 ${req.body.hash} 的记录`))
                    } else {
                        // 2.2 不存在名为 hash 的记录
                        let sqlArray = []
                        let parsedMessage = utility.unicodeEncode(req.body.message) // !
                        let parsedDescription = utility.unicodeEncode(req.body.description) || ''
                        let timeNow = utility.dateFormatter(new Date())
                        sqlArray.push(`
                           insert into qrs(hash, is_public, switch_phone, message, description, car, car_plate, car_desc, switch_car, switch_wx,
                           switch_homepage, switch_gaode, date_modify, date_init, visit_count, uid)
                            values(
                                '${req.body.hash.toLowerCase()}',
                                '${req.body.is_public}',
                                '${req.body.switch_phone}',
                                '${parsedMessage}',
                                '${parsedDescription}',
                                '${req.body.car}',
                                '${req.body.car_plate}',
                                '${req.body.car_desc}',
                                '${req.body.switch_car}',
                                '${req.body.switch_wx}',
                                '${req.body.switch_homepage}',
                                '${req.body.switch_gaode}',
                                '${timeNow}',
                                '${timeNow}',
                                '${req.body.visit_count}',
                                '${req.body.uid}')
                        `)
                        utility.getDataFromDB(sqlArray)
                            .then(data => {
                                utility.updateUserLastLoginTime(req.body.email)
                                res.send(new ResponseSuccess({id: data.insertId}, '添加成功')) // 添加成功之后，返回添加后的 QR  id
                            })
                            .catch(err => {
                                console.log(err)
                                res.send(new ResponseError(err.message, '添加失败'))
                            })
                    }
                })
                .catch(err => {
                    res.send(new ResponseError(err, '查询 hash 记录出错'))
            })

        })
        .catch(err => {
            res.send(new ResponseError(err.message, '无权操作'))
        })
})

// 检查用户名或邮箱是否存在
function checkHashExist(hash){
    let sqlArray = []
    sqlArray.push(`select * from qrs where hash='${hash.toLowerCase()}'`)
    return utility.getDataFromDB(sqlArray)
}


router.put('/modify', (req, res, next) => {

    // 1. 验证用户信息是否正确
    utility.verifyAuthorization(req.body.uid, req.body.email, req.body.token)
        .then(userInfo => {
            let parsedMessage = utility.unicodeEncode(req.body.message) // !
            let parsedDescription = utility.unicodeEncode(req.body.description) || ''
            let timeNow = utility.dateFormatter(new Date())

            let sqlArray = []
            sqlArray.push(`
                        update qrs
                            set
                                qrs.is_public = '${req.body.is_public}',
                                qrs.switch_phone = '${req.body.switch_phone}',
                                qrs.message = '${parsedMessage}',
                                qrs.description = '${parsedDescription}',
                                qrs.car = '${req.body.car}',
                                qrs.car_plate = '${req.body.car_plate}',
                                qrs.car_desc = '${req.body.car_desc}',
                                qrs.switch_car = '${req.body.switch_car}',
                                qrs.switch_wx = '${req.body.switch_wx}',
                                qrs.switch_homepage = '${req.body.switch_homepage}',
                                qrs.switch_gaode = '${req.body.switch_gaode}',
                                qrs.date_modify = '${timeNow}',
                                qrs.visit_count = '${req.body.visit_count}'
                            WHERE hash='${req.body.hash}' and uid='${req.body.uid}'
                    `)

            utility.getDataFromDB(sqlArray, true)
                .then(data => {
                    utility.updateUserLastLoginTime(req.body.email)
                    res.send(new ResponseSuccess(data, '修改成功'))
                })
                .catch(err => {
                    res.send(new ResponseError(err.message, '修改失败'))
                })
        })
        .catch(err => {
            res.send(new ResponseError(err.message, '无权操作'))
        })
})

router.delete('/delete', (req, res, next) => {
    // 1. 验证用户信息是否正确
    utility.verifyAuthorization(req)
        .then(userInfo => {

            let sqlArray = []
            sqlArray.push(`
                        DELETE from qrs
                        WHERE hash='${req.query.hash}'
                    `)
            if (userInfo.group_id !== 1){
                sqlArray.push(` and uid='${req.query.uid}'`) // 当为1管理员时，可以随意操作任意对象
            }
            utility.getDataFromDB(sqlArray)
                .then(data => {
                    if (data.affectedRows > 0) {
                        utility.updateUserLastLoginTime(req.body.email)
                        res.send(new ResponseSuccess('', '删除成功'))
                    } else {
                        res.send(new ResponseError('', '删除失败'))
                    }
                })
                .catch(err => {
                    res.send(new ResponseError(err.message))
                })

        })
        .catch(err => {
            res.send(new ResponseError(err.message, '无权操作'))
        })
})


module.exports = router
