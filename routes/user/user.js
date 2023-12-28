const express = require('express')
const configProject = require('../../config/configProject')
const utility = require("../../config/utility");
const ResponseSuccess = require("../../response/ResponseSuccess");
const ResponseError = require("../../response/ResponseError");
const router = express.Router()
const bcrypt = require('bcrypt')




/* GET users listing. */
router.post('/register', (req, res, next) => {
    // TODO: 验证传过来的数据库必填项
    if (req.body.invitationCode === configProject.invitation){ // 万能全局邀请码
        registerUser(req, res)
    } else {
        utility
            .getDataFromDB('diary', [`select * from invitations where id = '${req.body.invitationCode}'`], true)
            .then(result => {
                if (result){
                    if (result.binding_uid){
                        res.send(new ResponseError('', '邀请码已被使用'))
                    } else {
                        registerUser(req, res)
                    }
                } else {
                    res.send(new ResponseError('', '邀请码无效'))
                }
            })
            .catch(err => {
                res.send(new ResponseError(err, '数据库请求出错'))
            })
    }
})

function registerUser(req, res){
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
                        // 注册的用户默认为普通用户
                        `insert into users(email, nickname, username, password, register_time, last_visit_time, comment, 
                                                wx, phone, homepage, gaode, group_id)
                                    VALUES (
                                    '${req.body.email}', 
                                    '${req.body.nickname || ''}', 
                                    '${req.body.username || ''}', 
                                    '${encryptPassword}', 
                                    '${timeNow}',
                                    '${timeNow}',
                                    '${req.body.comment || ''}', 
                                    '${req.body.wx || ''}', 
                                    '${req.body.phone || ''}', 
                                    '${req.body.homepage || ''}', 
                                    '${req.body.gaode || ''}', 
                                    '2'
                                    )`
                    )
                    utility
                        .getDataFromDB( 'diary', sqlArray)
                        .then(data => {
                            let lastInsertedUid = data.insertId
                            utility.getDataFromDB('diary', [`update invitations set binding_uid = ${lastInsertedUid}, date_register = '${timeNow}' where id = '${req.body.invitationCode}'`])
                                .then(resInvitation => {
                                    res.send(new ResponseSuccess('', '注册成功'))
                                })
                                .catch(err => {
                                    res.send(new ResponseError('', '注册成功，邀请码信息更新失败'))
                                })
                        })
                        .catch(err => {
                            res.send(new ResponseError('', '注册失败'))
                        })
                })

            }
        })
        .catch(errEmailExist => {
            console.log(errEmailExist)
            res.send(new ResponseError(errEmailExist, '查询出错'))
        })
}

// 检查用户名或邮箱是否存在
function checkEmailOrUserNameExist(email, username){
    let sqlArray = []
    sqlArray.push(`select * from users where email='${email}' or username ='${username}'`)
    return utility.getDataFromDB( 'diary', sqlArray)
}

router.post('/list', (req, res, next) => {
    utility
        .verifyAuthorization(req)
        .then(userInfo => {
            let promisesAll = []

            if (userInfo.group_id === 1){
                // admin user
                let pointStart = (Number(req.body.pageNo) - 1) * Number(req.body.pageSize)
                promisesAll.push(utility.getDataFromDB(
                    'diary',
                    [`SELECT * from users limit ${pointStart} , ${req.body.pageSize}`])
                )
                promisesAll.push(utility.getDataFromDB(
                    'diary',
                    [`select count(*) as sum from users`], true)
                )
            } else {
                // normal user
                let pointStart = (Number(req.body.pageNo) - 1) * Number(req.body.pageSize)
                promisesAll.push(utility.getDataFromDB(
                    'diary',
                    [`SELECT * from users where uid = '${userInfo.uid}' limit ${pointStart} , ${req.body.pageSize}`])
                )
                promisesAll.push(utility.getDataFromDB(
                    'diary',
                    [`select count(*) as sum from users where uid = '${userInfo.uid}' `], true)
                )
            }


            Promise
                .all(promisesAll)
                .then(([userList, dataSum]) => {
                    utility.updateUserLastLoginTime(userInfo.uid)
                    userList.forEach(diary => {
                        // decode unicode
                        diary.title = utility.unicodeDecode(diary.title)
                        diary.content = utility.unicodeDecode(diary.content)
                    })
                    res.send(new ResponseSuccess({
                        list: userList,
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
        })
        .catch(errInfo => {
            res.send(new ResponseError('', errInfo))
        })
})

router.get('/detail', (req, res, next) => {
    let sqlArray = []
    sqlArray.push(`select * from qrs where hash = '${req.query.hash}'`)
    utility
        .getDataFromDB( 'diary', sqlArray, true)
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
                utility
                    .verifyAuthorization(req)
                    .then(userInfo => {
                        // 3. 判断 QR 是否属于当前请求用户
                        if (Number(userInfo.uid) === data.uid){
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
                            res.send(new ResponseSuccess(data))
                        } else {
                            res.send(new ResponseError('','当前用户无权查看该 QR ：请求用户 ID 与 QR 归属不匹配'))
                        }
                    })
                    .catch(errInfo => {
                        res.send(new ResponseError('', errInfo))
                    })
            }
        })
        .catch(err => {
            res.send(new ResponseError(err, err.message))
        })
})


router.get('/avatar', (req, res, next) => {
    let sqlArray = []
    sqlArray.push(`select avatar from users where email = '${req.query.email}'`)
    utility
        .getDataFromDB( 'diary', sqlArray, true)
        .then(data => {
            res.send(new ResponseSuccess(data))
        })
        .catch(err => {
            res.send(new ResponseError(err, err.message))
        })
})


router.post('/add', (req, res, next) => {
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
                    utility
                        .getDataFromDB( 'diary', sqlArray)
                        .then(data => {
                            res.send(new ResponseSuccess('', '用户添加成功'))
                        })
                        .catch(err => {
                            res.send(new ResponseError(err, '用户添加失败'))
                        })
                })

            }
        })
        .catch(errEmailExist => {
            console.log(errEmailExist)
            res.send(new ResponseError(errEmailExist, '查询出错'))
        })
})

// 检查用户名或邮箱是否存在
function checkHashExist(username, email){
    let sqlArray = []
    sqlArray.push(`select * from users where username ='${username.toLowerCase()}' or email = '${email}'`)
    return utility.getDataFromDB( 'diary', sqlArray)
}


// 设置用户资料：昵称，avatar，手机号
router.put('/set-profile', (req, res, next) => {
    // 1. 验证用户信息是否正确
    utility
        .verifyAuthorization(req)
        .then(userInfo => {
            let avatar = req.body.avatar || ''
            let sqlArray = []
            sqlArray.push(`
                update users
                set users.nickname       = '${req.body.nickname}',
                    users.phone          = '${req.body.phone}',
                    users.avatar         = '${avatar}',
                    users.city           = '${req.body.city}',
                    users.geolocation    = '${req.body.geolocation}'
                    WHERE uid = '${userInfo.uid}'
            `)
            utility
                .getDataFromDB('diary', sqlArray, true)
                .then(data => {
                    utility.updateUserLastLoginTime(userInfo.uid)
                    utility
                        .verifyAuthorization(req)
                        .then(newUserInfo => {
                            res.send(new ResponseSuccess(newUserInfo, '修改成功'))
                        })
                })
                .catch(err => {
                    res.send(new ResponseError(err, '修改失败'))
                })
        })
        .catch(err => {
            res.send(new ResponseError(err, '无权操作'))
        })
})


router.put('/modify', (req, res, next) => {

    // 1. 验证用户信息是否正确
    utility
        .verifyAuthorization(req)
        .then(userInfo => {
            if (userInfo.group_id === 1) {
                operateUserInfo(req, res, userInfo)
            } else {
                if (userInfo.uid !== req.body.uid){
                    res.send(new ResponseError('', '你无权操作该用户信息'))
                } else {
                    operateUserInfo(req, res, userInfo)
                }
            }
        })
        .catch(err => {
            res.send(new ResponseError(err, '无权操作'))
        })
})

function operateUserInfo(req, res, userInfo){
    let sqlArray = []
    sqlArray.push(`
                update users
                    set
                            users.email = '${req.body.email}', 
                            users.nickname = '${req.body.nickname}', 
                            users.username = '${req.body.username}', 
                            users.comment = '${req.body.comment || ''}', 
                            users.wx = '${req.body.wx}', 
                            users.phone = '${req.body.phone}', 
                            users.homepage = '${req.body.homepage}', 
                            users.gaode = '${req.body.gaode}', 
                            users.group_id = '${req.body.group_id}'
                    WHERE uid='${req.body.uid}'
            `)

    utility
        .getDataFromDB( 'diary', sqlArray, true)
        .then(data => {
            utility.updateUserLastLoginTime(userInfo.uid)
            res.send(new ResponseSuccess(data, '修改成功'))
        })
        .catch(err => {
            res.send(new ResponseError(err, '修改失败'))
        })
}

router.delete('/delete', (req, res, next) => {
    // 1. 验证用户信息是否正确
    utility
        .verifyAuthorization(req)
        .then(userInfo => {
            if (userInfo.group_id === 1){
                let sqlArray = []
                sqlArray.push(`
                        DELETE from users
                        WHERE uid='${req.body.uid}'
                    `)
                utility
                    .getDataFromDB( 'diary', sqlArray)
                    .then(data => {
                        if (data.affectedRows > 0) {
                            utility.updateUserLastLoginTime(req.body.email)
                            res.send(new ResponseSuccess('', '删除成功'))
                        } else {
                            res.send(new ResponseError('', '删除失败'))
                        }
                    })
                    .catch(err => {
                        res.send(new ResponseError(err,))
                    })
            } else {
                res.send(new ResponseError('', '无权操作'))
            }
        })
        .catch(err => {
            res.send(new ResponseError(err, '无权操作'))
        })
})

router.post('/login', (req, res, next) => {
    let sqlArray = []
    sqlArray.push(`select * from users where email = '${req.body.email}'`)

    utility
        .getDataFromDB( 'diary', sqlArray, true)
        .then(data => {
            if (data) {
                bcrypt.compare(req.body.password, data.password, function(err, isPasswordMatch) {
                    if (isPasswordMatch){
                        utility.updateUserLastLoginTime(req.body.email)
                        res.send(new ResponseSuccess(data,'登录成功'))
                    } else {
                        res.send(new ResponseError('','用户名或密码错误'))
                    }
                })
            } else {
                res.send(new ResponseError('', '无此用户'))
            }

        })
        .catch(err => {
            res.send(new ResponseError('', err.message))
        })
})

// 修改密码
router.put('/change-password', (req, res, next) => {
    if (!req.body.password){
        res.send(new ResponseError('', '参数错误：password 未定义'))
        return
    }

    utility
        .verifyAuthorization(req)
        .then(userInfo => {
            if (userInfo.email === 'test@163.com'){
                res.send(new ResponseError('', '演示帐户密码不允许修改'))
                return
            }
            bcrypt.hash(req.body.password, 10, (err, encryptPasswordNew) => {
                let changePasswordSqlArray = [`update users set password = '${encryptPasswordNew}' where email='${userInfo.email}'`]
                utility
                    .getDataFromDB( 'diary', changePasswordSqlArray)
                    .then(dataChangePassword => {
                        utility.updateUserLastLoginTime(userInfo.uid)
                        res.send(new ResponseSuccess('', '修改密码成功'))
                    })
                    .catch(errChangePassword => {
                        res.send(new ResponseError('', '修改密码失败'))
                    })
            })
        })
        .catch(err => {
            res.send(new ResponseError(err, '无权操作'))
        })

})

// 注销帐号
router.delete('/destroy-account', (req, res, next) => {
    utility
        .verifyAuthorization(req)
        .then(userInfo => {
            // 演示帐户时不允许执行注销操作
            if (userInfo.email === 'test@163.com'){
                res.send(new ResponseError('', '演示帐户不允许执行此操作'))
                return
            }
            let connection = utility.getMysqlConnection('diary')
            connection.beginTransaction(transactionError => {
                if (transactionError){
                    connection.rollback(err => {
                        res.send(new ResponseError('', 'beginTransaction: 事务执行失败，已回滚'))
                    })
                    connection.end()
                } else {
                    let sql = `
                                delete from diaries where uid = ${userInfo.uid}; 
                                delete from invitations where binding_uid = ${userInfo.uid}; 
                                delete from map_pointer where uid = ${userInfo.uid}; 
                                delete from map_route where uid = ${userInfo.uid}; 
                                delete from map_route where uid = ${userInfo.uid}; 
                                delete from qrs where uid = ${userInfo.uid}; 
                                delete from users where uid = ${userInfo.uid}; 
                                `
                    connection.query(sql, [], (queryErr,result) => {
                        if (queryErr){
                            connection.rollback(err => {
                                res.send(new ResponseError(queryErr, 'query: 事务执行失败，已回滚'))
                            })
                            // res.send(new ResponseError(err, '数据库请求错误'))
                        } else {
                            connection.commit(commitError => {
                                if (commitError){
                                    connection.rollback(err => {
                                        res.send(new ResponseError(err, 'transaction.commit: 事务执行失败，已回滚'))
                                    })
                                } else {
                                    res.send(new ResponseSuccess(result, '事务执行成功'))
                                }
                            })
                        }
                        connection.end()
                    })
                }

            })
        })
        .catch(errInfo => {
            res.send(new ResponseError('null', errInfo))
        })
})


module.exports = router
