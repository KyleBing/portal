const express = require('express')
const mysql = require("mysql");
const configOfDatabase = require('../config/configDatabase')
const utility = require("../config/utility");
const ResponseSuccess = require("../response/ResponseSuccess");
const ResponseError = require("../response/ResponseError");
const router = express.Router()

/* GET users listing. */
router.post('/register', (req, res, next) => {
    // 判断邀请码是否正确
    if (req.body.invitation && req.body.invitation === configOfDatabase.invitation){
        checkEmailExist(req.body.email)
            .then(dataEmailExistArray => {
                if (dataEmailExistArray.length > 0){
                    return res.send(new ResponseError('', '该 Email 已被注册'))
                } else {
                    let sqlArray = []
                    let timeNow = utility.dateFormatter(new Date())
                    sqlArray.push(`insert into users(email, password, register_time, username) VALUES ('${req.body.email}','${req.body.password}','${timeNow}','${req.body.username}')`)

                    utility.getDataFromDB(sqlArray)
                        .then(data => {
                            res.send(new ResponseSuccess('', '注册成功'))
                        })
                        .catch(err => {
                            res.send(new ResponseError(err, '注册失败'))
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
            if (req.body.password === data.password){
                res.send(new ResponseSuccess('','登录成功'))
            } else {
                res.send(new ResponseSuccess('','用户名或密码错误'))
            }
        })
        .catch(err => {
            res.send(new ResponseError(err))
        })
})

router.post('/changePassword', (req, res, next) => {
    let sqlArray = []
    sqlArray.push(`select * from users where email = '${req.body.email}'`)

    utility.getDataFromDB(sqlArray, true)
        .then(data => {
            if (req.body.password === data.password){
                // 执行修改密码的操作
                let changePasswordSqlArray = [`update users set password = '${req.body.passwordNew}' where email='${req.body.email}'`]
                utility.getDataFromDB(changePasswordSqlArray)
                    .then(dataChangePassword => {
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
            res.send(new ResponseError(err))
        })
})


module.exports = router
