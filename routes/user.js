const express = require('express')
const configOfDatabase = require('../config/configDatabase')
const utility = require("../config/utility");
const ResponseSuccess = require("../response/ResponseSuccess");
const ResponseError = require("../response/ResponseError");
const router = express.Router()
const bcrypt = require('bcrypt')

/* GET users listing. */
router.post('/register', (req, res, next) => {
    // 判断邀请码是否正确
    if (req.body.invitation && req.body.invitation === configOfDatabase.invitation){
        checkEmailExist(req.body.email)
            .then(dataEmailExistArray => {
                // email 记录是否已经存在
                if (dataEmailExistArray.length > 0){
                    return res.send(new ResponseError('', '该 Email 已被注册'))
                } else {
                    let sqlArray = []
                    let timeNow = utility.dateFormatter(new Date())
                    // 明文密码通过 bcrypt 加密，对比密码也是通过  bcrypt
                    bcrypt.hash(req.body.password, 10, (err, encryptPassword) => {
                        sqlArray.push(`insert into users(email, password, register_time, username) 
                        VALUES 
                        (
                        '${req.body.email}',
                        '${encryptPassword}',
                        '${timeNow}',
                        '${req.body.username}')`
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

function checkEmailExist(email){
    let sqlArray = []
    sqlArray.push(`select email from users where email='${email}'`)
    return utility.getDataFromDB(sqlArray)
}


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

router.put('/change-password', (req, res, next) => {
    let sqlArray = []
    sqlArray.push(`select * from users where email = '${req.body.email}'`)

    utility.getDataFromDB(sqlArray, true)
        .then(data => {
            if (req.body.passwordOld === data.password){
                // 执行修改密码的操作
                let changePasswordSqlArray = [`update users set password = '${req.body.passwordNew}' where email='${req.body.email}'`]
                utility.getDataFromDB(changePasswordSqlArray)
                    .then(dataChangePassword => {
                        utility.updateUserLastLoginTime(req.body.email)
                        res.send(new ResponseSuccess('', '修改密码成功'))
                    })
                    .catch(errChangePassword => {
                        res.send(new ResponseError('', '修改密码失败'))
                    })
            } else {
                res.send(new ResponseError('', '用户名或密码错误'))
            }
        })
        .catch(err => {
            res.send(new ResponseError(err.message))
        })
})


module.exports = router
