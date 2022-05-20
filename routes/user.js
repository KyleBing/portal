const express = require('express')
const configProject = require('../config/configProject')
const utility = require("../config/utility");
const ResponseSuccess = require("../response/ResponseSuccess");
const ResponseError = require("../response/ResponseError");
const router = express.Router()
const bcrypt = require('bcrypt')



/* GET users listing. */
router.post('/register', (req, res, next) => {
    // TODO: 验证传过来的数据库必填项
    // 判断邀请码是否正确
    if (req.body.invitationCode && req.body.invitationCode === configProject.invitation){
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
                        utility.getDataFromDB(sqlArray)
                            .then(data => {
                                res.send(new ResponseSuccess('', '注册成功'))
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
            sqlArray.push(`SELECT * from users `)

            if (userInfo.group_id === 1){

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

            if (req.query.pageNo && req.query.pageCount){
                let startPoint = (req.query.pageNo - 1) * req.query.pageCount //  QR 起点
                sqlArray.push(`limit ${startPoint}, ${req.query.pageCount}`)
            }

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
    return utility.getDataFromDB(sqlArray)
}


router.put('/modify', (req, res, next) => {

    // 1. 验证用户信息是否正确
    utility.verifyAuthorization(req)
        .then(userInfo => {
            if (userInfo.group_id === 1) {
                operateUserInfo(req, res)
            } else {
                if (userInfo.uid !== req.body.uid){
                    res.send(new ResponseError('', '你无权操作该用户信息'))
                } else {
                    operateUserInfo(req, res)
                }
            }
        })
        .catch(err => {
            res.send(new ResponseError(err, '无权操作'))
        })
})

function operateUserInfo(req, res){
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

    utility.getDataFromDB(sqlArray, true)
        .then(data => {
            utility.updateUserLastLoginTime(req.query.email)
            res.send(new ResponseSuccess(data, '修改成功'))
        })
        .catch(err => {
            res.send(new ResponseError(err, '修改失败'))
        })
}

router.delete('/delete', (req, res, next) => {
    // 1. 验证用户信息是否正确
    utility.verifyAuthorization(req)
        .then(userInfo => {
            if (userInfo.group_id === 1){
                let sqlArray = []
                sqlArray.push(`
                        DELETE from users
                        WHERE uid='${req.body.uid}'
                    `)
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

    utility.getDataFromDB(sqlArray, true)
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
    utility.verifyAuthorization(req)
        .then(userInfo => {
            if (userInfo.password === req.query.token){
                bcrypt.hash(req.body.password, 10, (err, encryptPasswordNew) => {
                    let changePasswordSqlArray = [`update users set password = '${encryptPasswordNew}' where email='${req.query.email}'`]
                    utility.getDataFromDB(changePasswordSqlArray)
                        .then(dataChangePassword => {
                            utility.updateUserLastLoginTime(req.query.email)
                            res.send(new ResponseSuccess('', '修改密码成功'))
                        })
                        .catch(errChangePassword => {
                            res.send(new ResponseError('', '修改密码失败'))
                        })
                })
            }
        })
        .catch(err => {
            res.send(new ResponseError(err, '无权操作'))
        })

})


module.exports = router
