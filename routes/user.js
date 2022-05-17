const express = require('express')
const configOfDatabase = require('../config/configDatabase')
const utility = require("../config/utility");
const ResponseSuccess = require("../response/ResponseSuccess");
const ResponseError = require("../response/ResponseError");
const router = express.Router()
const bcrypt = require('bcrypt')



/* GET users listing. */
router.post('/register', (req, res, next) => {
    // TODO: 验证传过来的数据库必填项
    // 判断邀请码是否正确
    if (req.body.invitation && req.body.invitation === configOfDatabase.invitation){
        checkEmailOrUserNameExist(req.body.email, req.body.username)
            .then(dataEmailExistArray => {
                // email 记录是否已经存在
                if (dataEmailExistArray.length > 0){
                    return res.send(new ResponseError('', '邮箱或用户名已被注册'))
                } else {
                    let sqlArray = []
                    let timeNow = utility.dateFormatter(new Date())
                    // 明文密码通过 bcrypt 加密，对比密码也是通过  bcrypt
                    bcrypt.hash(req.body.password, 10, (err, encryptPassword) => {
                        sqlArray.push(
                            `insert into users(email, nickname, username, password, register_time, last_visit_time, comment, 
                                                wx, phone, homepage, gaode, group_id)
                                    VALUES (
                                    '${req.body.email}', 
                                    '${req.body.nickname}', 
                                    '${req.body.username}', 
                                    '${encryptPassword}', 
                                    '${timeNow}',
                                    '${timeNow}',
                                    '${req.body.comment || ''}', 
                                    '${req.body.wx}', 
                                    '${req.body.phone}', 
                                    '${req.body.homepage}', 
                                    '${req.body.gaode}', 
                                    '${req.body.group_id}'
                                    )`
                        )
                        utility.getDataFromDB(sqlArray)
                            .then(data => {
                                res.send(new ResponseSuccess('', '注册成功'))
                            })
                            .catch(err => {
                                res.send(new ResponseError(err.message, '注册失败'))
                            })
                    })

                }
            })
            .catch(errEmailExist => {
                console.log(errEmailExist)
                res.send(new ResponseError(errEmailExist, '查询出错'))
            })

    } else {
        res.send(new ResponseError('', '邀请码错误'))
    }


})

// 检查用户名或邮箱是否存在
function checkEmailOrUserNameExist(email, username){
    let sqlArray = []
    sqlArray.push(`select * from users where email='${email}' or username ='${username}'`)
    return utility.getDataFromDB(sqlArray)
}


router.get('/list', (req, res, next) => {
    utility.verifyAuthorization(req)
        .then(userInfo => {
            let sqlArray = []
            sqlArray.push(`SELECT *
                  from users 
                 `)

            if (userInfo.groupId === 1){

            } else {
                sqlArray.push([`where uid = ${req.query.uid}`])
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
            sqlArray.push(`limit ${startPoint}, ${req.query.pageCount}`)

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
            res.send(new ResponseError(verified, '无权查看用户列表：用户信息错误'))
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




router.post('/login', (req, res, next) => {
    let sqlArray = []
    sqlArray.push(`select * from users where email = '${req.body.email}'`)

    utility.getDataFromDB(sqlArray, true)
        .then(data => {
            bcrypt.compare(req.body.password, data.password, function(err, isPasswordMatch) {
                if (isPasswordMatch){
                    utility.updateUserLastLoginTime(req.body.email)
                    res.send(new ResponseSuccess(data,'登录成功'))
                } else {
                    res.send(new ResponseError('','用户名或密码错误'))
                }
            })
        })
        .catch(err => {
            res.send(new ResponseError(err.message))
        })
})

// 修改密码
router.put('/change-password', (req, res, next) => {
    let sqlArray = []
    sqlArray.push(`select * from users where email = '${req.body.email}'`)

    utility.getDataFromDB(sqlArray, true)
        .then(data => {
            // 1. 如果存在该用户
            if (data){
                // 2. 判断加密后的密码是否跟数据库中的 token 一致
                bcrypt.compare(req.body.passwordOld, data.password, function(err, isPasswordMatch) {
                    if (isPasswordMatch){
                        // 3. 加密新密码，执行数据库密码更新操作
                        bcrypt.hash(req.body.passwordNew, 10, (err, encryptPasswordNew) => {
                            let changePasswordSqlArray = [`update users set password = '${encryptPasswordNew}' where email='${req.body.email}'`]
                            utility.getDataFromDB(changePasswordSqlArray)
                                .then(dataChangePassword => {
                                    utility.updateUserLastLoginTime(req.body.email)
                                    res.send(new ResponseSuccess('', '修改密码成功'))
                                })
                                .catch(errChangePassword => {
                                    res.send(new ResponseError('', '修改密码失败'))
                                })
                        })
                    } else {
                        res.send(new ResponseError('', '原密码错误'))
                    }
                })

            } else {
                res.send(new ResponseError('', '无此用户'))
            }

        })
        .catch(err => {
            res.send(new ResponseError(err, err.message))
        })
})


module.exports = router
