import express from "express"
import {ResponseError, ResponseSuccess} from "../response/Response";
import {
    unicodeEncode,
    unicodeDecode,
    dateFormatter,
    getDataFromDB,
    updateUserLastLoginTime,
    verifyAuthorization
} from "../utility";
const router = express.Router()

router.get('/list', (req, res) => {
    verifyAuthorization(req)
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
                                   qrs.car_type,
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
                let keywords = JSON.parse(String(req.query.keywords)).map(item => unicodeEncode(item))
                console.log(keywords)
                if (keywords.length > 0){
                    let keywordStrArray = keywords.map(keyword => `( message like '%${keyword}%' ESCAPE '/'  or description like '%${keyword}%' ESCAPE '/')` )
                    sqlArray.push(' and ' + keywordStrArray.join(' and ')) // 在每个 categoryString 中间添加 'or'
                }
            }

            let startPoint = (Number(req.query.pageNo) - 1) * Number(req.query.pageSize) //  QR 起点
            sqlArray.push(` order by date_init desc
                  limit ${startPoint}, ${req.query.pageSize}`)

            getDataFromDB( 'diary', sqlArray)
                .then(data => {
                    updateUserLastLoginTime(userInfo.uid)
                    data.forEach(diary => {
                        // decode unicode
                        diary.message = unicodeDecode(diary.message)
                        diary.description = unicodeDecode(diary.description)
                    })
                    res.send(new ResponseSuccess(data, '请求成功'))
                })
                .catch(err => {
                    res.send(new ResponseError(err, err.message))
                })
        })
        .catch(() => {
            res.send(new ResponseError('无权查看 QR 列表：用户信息错误'))
        })
})

router.get('/detail', (req, res) => {
    let sqlArray = []
    sqlArray.push(`select * from qrs where hash = '${req.query.hash}'`)
    getDataFromDB( 'diary', sqlArray, true)
        .then(dataQr => {
            // decode unicode
            dataQr.message = unicodeDecode(dataQr.message)
            dataQr.description = unicodeDecode(dataQr.description)

            // 2. 判断是否为共享 QR
            if (dataQr.is_public === 1){
                // 2.1 如果是，直接返回结果，不需要判断任何东西
                res.send(new ResponseSuccess(dataQr))
            } else {
                // 2.2 如果不是，需要判断：当前 email 和 token 是否吻合
                verifyAuthorization(req)
                    .then(userInfo => {
                        // 3. 判断 QR 是否属于当前请求用户
                        if (Number(userInfo.uid) === dataQr.uid){
                            // 记录最后访问时间
                            updateUserLastLoginTime(userInfo.uid)
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
                    .catch(() => {
                        res.send(new ResponseError('','当前用户无权查看该 QR ：用户信息错误'))
                    })
            }
        })
        .catch(err => {
            res.send(new ResponseError(err, err.message))
        })
})

router.post('/add', (req, res) => {
    // 1. 验证用户信息是否正确
    console.log(req.query)
    verifyAuthorization(req)
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
                        let parsedMessage = unicodeEncode(req.body.message) // !
                        let parsedDescription = unicodeEncode(req.body.description) || ''
                        let timeNow = dateFormatter(new Date())
                        sqlArray.push(`
                           insert into qrs(hash, is_public, is_show_phone, message, description, car_name, car_plate, car_desc, is_show_car, wx_code_img, is_show_wx,
                           is_show_homepage, is_show_gaode, date_modify, date_init, visit_count, uid, imgs, car_type)
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
                                '${req.body.imgs}',
                                '${req.body.car_type}'
                                )
                        `)
                        getDataFromDB( 'diary', sqlArray)
                            .then(data => {
                                updateUserLastLoginTime(userInfo.uid)
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
function checkHashExist(hash: string){
    let sqlArray = []
    sqlArray.push(`select * from qrs where hash='${hash.toLowerCase()}'`)
    return getDataFromDB( 'diary', sqlArray)
}


router.put('/modify', (req, res) => {

    // 1. 验证用户信息是否正确
    verifyAuthorization(req)
        .then(() => {
            let parsedMessage = unicodeEncode(req.body.message) // !
            let parsedDescription = unicodeEncode(req.body.description) || ''
            let timeNow = dateFormatter(new Date())

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
                                qrs.imgs = '${req.body.imgs}',
                                qrs.car_type = '${req.body.car_type}'
                            WHERE hash='${req.body.hash}'
                    `)

            getDataFromDB( 'diary', sqlArray, true)
                .then(data => {
                    updateUserLastLoginTime(req.body.email)
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

router.delete('/delete', (req, res) => {
    // 1. 验证用户信息是否正确
    verifyAuthorization(req)
        .then(userInfo => {

            let sqlArray = []
            sqlArray.push(`
                        DELETE from qrs
                        WHERE hash='${req.body.hash}'
                    `)
            if (userInfo.group_id !== 1){
                sqlArray.push(` and uid='${userInfo.uid}'`) // 当为1管理员时，可以随意操作任意对象
            }
            getDataFromDB( 'diary', sqlArray)
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

        })
        .catch(err => {
            res.send(new ResponseError(err, '无权操作'))
        })
})

router.post('/clear-visit-count', (req, res) => {
    // 1. 验证用户信息是否正确
    verifyAuthorization(req)
        .then(userInfo => {
            // 2. 是否为管理员
            if(userInfo.group_id === 1) {
                let sqlArray = []
                // let timeNow = dateFormatter(new Date())
                sqlArray.push(` update qrs set visit_count = 0 where hash = '${req.body.hash}' `)
                getDataFromDB( 'diary', sqlArray)
                    .then(() => {
                        updateUserLastLoginTime(userInfo.uid)
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

export default router

