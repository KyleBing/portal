const express = require('express')
const mysql = require("mysql");
const configOfDatabase = require('../config/configDatabase')
const utility = require("../config/utility");
const ResponseSuccess = require("../response/ResponseSuccess");
const ResponseError = require("../response/ResponseError");
const router = express.Router()

/* GET users listing. */
router.post('/register', (req, res, next) => {
    let sqlArray = []
    sqlArray.push(`select * from diaries where uid = ${req.query.uid}`)
    if (req.query.timeStart) sqlArray.push(`and date_modify BETWEEN '${req.query.timeStart}' and '${req.query.timeEnd}'`)
    sqlArray.push(`limit 200`)

    utility.getDataFromDB(sqlArray)
        .then(data => {
            res.send(new ResponseSuccess(data))
        })
        .catch(err => {
            res.send(new ResponseError(err))
        })

    res.send(req.params.username)
})

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
