const express = require('express')
const router = express.Router()
const utility = require('../../config/utility')
const ResponseSuccess = require('../../response/ResponseSuccess')
const ResponseError = require('../../response/ResponseError')


router.get('/list', (req, res, next) => {
    utility
        .verifyAuthorization(req)
        .then(userInfo => {
            let sqlArray = []
            sqlArray.push(`select  qrs.hash,
                                   qrs.is_public,
                                   qrs.is_show_phone,
                                   qrs.message,
                                   qrs.car_name,
                                   qrs.car_plate,
                                   qrs.car_desc,
                                   qrs.is_show_car,
                                   qrs.is_show_wx,
                                   qrs.wx_code_img,
                                   qrs.description,
                                   qrs.is_show_homepage,
                                   qrs.is_show_gaode,
                                   qrs.date_init,
                                   qrs.visit_count,
                                   qrs.imgs,
                                   users.phone,
                                   users.wx,
                                   users.uid,
                                   users.nickname,
                                   users.username
                                        from qrs
                                            left join users on qrs.uid = users.uid
                            `)



            if (userInfo.group_id === 1){

            } else {
                sqlArray.push([`where qrs.uid = ${userInfo.uid}`])
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

            let startPoint = (req.query.pageNo - 1) * req.query.pageSize //  QR 起点
            sqlArray.push(` order by date_init desc
                  limit ${startPoint}, ${req.query.pageSize}`)

            utility
                .getDataFromDB( 'diary', sqlArray)
                .then(data => {
                    utility.updateUserLastLoginTime(userInfo.uid)
                    data.forEach(diary => {
                        // decode unicode
                        diary.message = utility.unicodeDecode(diary.message)
                        diary.description = utility.unicodeDecode(diary.description)
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
    utility
        .getDataFromDB( 'diary', sqlArray, true)
        .then(dataQr => {
            // decode unicode
            dataQr.message = utility.unicodeDecode(dataQr.message)
            dataQr.description = utility.unicodeDecode(dataQr.description)

            // 2. 判断是否为共享 QR
            if (dataQr.is_public === 1){
                // 2.1 如果是，直接返回结果，不需要判断任何东西
                res.send(new ResponseSuccess(dataQr))
            } else {
                // 2.2 如果不是，需要判断：当前 email 和 token 是否吻合
                utility
                    .verifyAuthorization(req)
                    .then(userInfo => {
                        // 3. 判断 QR 是否属于当前请求用户
                        if (Number(userInfo.uid) === dataQr.uid){
                            // 记录最后访问时间
                            utility.updateUserLastLoginTime(userInfo.uid)
/*                            // TODO:过滤可见信息 自己看，管理员看，其它用户看
                            if (data.is_show_wx){
                                data.wx = ''
                            }
                            if (data.is_show_car){
                                data.car = ''
                                data.car_desc = ''
                                data.car_plate = ''
                            }
                            if (data.is_show_gaode){
                                data.gaode = ''
                            }
                            if (data.is_show_homepage){
                                data.homepage = ''
                            }*/
                            res.send(new ResponseSuccess(dataQr))
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
    console.log(req.query)
    utility
        .verifyAuthorization(req)
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
                           insert into qrs(hash, is_public, is_show_phone, message, description, car_name, car_plate, car_desc, is_show_car, wx_code_img, is_show_wx,
                           is_show_homepage, is_show_gaode, date_modify, date_init, visit_count, uid, imgs)
                            values(
                                '${req.body.hash.toLowerCase()}',
                                '${req.body.is_public}',
                                '${req.body.is_show_phone}',
                                '${parsedMessage}',
                                '${parsedDescription}',
                                '${req.body.car_name}',
                                '${req.body.car_plate}',
                                '${req.body.car_desc}',
                                '${req.body.is_show_car}',
                                '${req.body.wx_code_img}',
                                '${req.body.is_show_wx}',
                                '${req.body.is_show_homepage}',
                                '${req.body.is_show_gaode}',
                                '${timeNow}',
                                '${timeNow}',
                                '${req.body.visit_count || 0}',
                                '${userInfo.uid}',
                                '${req.body.imgs}'
                                )
                        `)
                        utility
                            .getDataFromDB( 'diary', sqlArray)
                            .then(data => {
                                utility.updateUserLastLoginTime(userInfo.uid)
                                res.send(new ResponseSuccess({id: data.insertId}, '添加成功')) // 添加成功之后，返回添加后的 QR  id
                            })
                            .catch(err => {
                                console.log(err)
                                res.send(new ResponseError(err, '添加失败'))
                            })
                    }
                })
                .catch(err => {
                    res.send(new ResponseError(err, '查询 hash 记录出错'))
            })

        })
        .catch(err => {
            res.send(new ResponseError(err, '无权操作'))
        })
})

// 检查用户名或邮箱是否存在
function checkHashExist(hash){
    let sqlArray = []
    sqlArray.push(`select * from qrs where hash='${hash.toLowerCase()}'`)
    return utility.getDataFromDB( 'diary', sqlArray)
}


router.put('/modify', (req, res, next) => {

    // 1. 验证用户信息是否正确
    utility
        .verifyAuthorization(req)
        .then(userInfo => {
            let parsedMessage = utility.unicodeEncode(req.body.message) // !
            let parsedDescription = utility.unicodeEncode(req.body.description) || ''
            let timeNow = utility.dateFormatter(new Date())

            let sqlArray = []
            sqlArray.push(`
                        update qrs
                            set
                                qrs.is_public = '${req.body.is_public}',
                                qrs.is_show_phone = '${req.body.is_show_phone}',
                                qrs.message = '${parsedMessage}',
                                qrs.description = '${parsedDescription}',
                                qrs.car_name = '${req.body.car_name}',
                                qrs.car_plate = '${req.body.car_plate}',
                                qrs.car_desc = '${req.body.car_desc}',
                                qrs.is_show_car = '${req.body.is_show_car}',
                                qrs.is_show_wx = '${req.body.is_show_wx}',
                                qrs.wx_code_img = '${req.body.wx_code_img}',
                                qrs.is_show_homepage = '${req.body.is_show_homepage}',
                                qrs.is_show_gaode = '${req.body.is_show_gaode}',
                                qrs.date_modify = '${timeNow}',
                                qrs.visit_count = '${req.body.visit_count}',
                                qrs.uid = '${req.body.uid}',
                                qrs.imgs = '${req.body.imgs}'
                            WHERE hash='${req.body.hash}'
                    `)

            utility
                .getDataFromDB( 'diary', sqlArray, true)
                .then(data => {
                    utility.updateUserLastLoginTime(req.body.email)
                    res.send(new ResponseSuccess(data, '修改成功'))
                })
                .catch(err => {
                    res.send(new ResponseError(err, '修改失败'))
                })
        })
        .catch(err => {
            res.send(new ResponseError(err, '无权操作'))
        })
})

router.delete('/delete', (req, res, next) => {
    // 1. 验证用户信息是否正确
    utility
        .verifyAuthorization(req)
        .then(userInfo => {

            let sqlArray = []
            sqlArray.push(`
                        DELETE from qrs
                        WHERE hash='${req.body.hash}'
                    `)
            if (userInfo.group_id !== 1){
                sqlArray.push(` and uid='${userInfo.uid}'`) // 当为1管理员时，可以随意操作任意对象
            }
            utility
                .getDataFromDB( 'diary', sqlArray)
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

        })
        .catch(err => {
            res.send(new ResponseError(err, '无权操作'))
        })
})

router.post('/clear-visit-count', (req, res, next) => {
    // 1. 验证用户信息是否正确
    utility
        .verifyAuthorization(req)
        .then(userInfo => {
            // 2. 是否为管理员
            if(userInfo.group_id === 1) {
                let sqlArray = []
                let timeNow = utility.dateFormatter(new Date())
                sqlArray.push(` update qrs set visit_count = 0 where hash = '${req.body.hash}' `)
                utility
                    .getDataFromDB( 'diary', sqlArray)
                    .then(data => {
                        utility.updateUserLastLoginTime(userInfo.uid)
                        res.send(new ResponseSuccess('', '计数已清零')) // 添加成功之后，返回添加后的 QR  id
                    })
                    .catch(err => {
                        console.log(err)
                        res.send(new ResponseError(err, '计数清零失败'))
                    })
            } else {
                res.send(new ResponseError('', '无权操作'))
            }

        })
        .catch(err => {
            res.send(new ResponseError(err, '无权操作'))
        })
})



module.exports = router
