const express = require('express')
const mysql = require("mysql");
const configOfDatabase = require('../config/configDatabase')
const router = express.Router()

/* GET users listing. */
router.post('/register', (req, res, next) => {
    res.send(req.params.username)
})

router.post('/login', (req, res, next) => {
    let connection = mysql.createConnection(configOfDatabase)
    connection.connect()
    let sql = 'select * from users where email = ?'
    connection.query(sql, [req.body.email], function (err, result) {
        if (err) {
            console.log('数据库请求错误', err.message)
            return err
        } else {
            if (result.length > 0){
                let match = result[0]
                if (req.body.password === match.password){
                    res.send('登录成功')
                } else {
                    res.send('用户名或密码错误')
                }
            }
        }
    })
    connection.end()
})

router.put('/changepassword', (req, res, next) => {
    let connection = mysql.createConnection(configOfDatabase)
    connection.connect()
    let sql = 'select * from users where email = ?'
    connection.query(sql, [req.body.email], function (err, result) {
        if (err) {
            console.log('数据库请求错误', err.message)
            return err
        } else {
            if (result.length > 0){
                let match = result[0]
                if (req.body.password === match.password){
                    res.send('登录成功')
                } else {
                    res.send('用户名或密码错误')
                }
            }
        }
    })
    connection.end()
})


module.exports = router
