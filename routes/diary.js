const express = require('express')
const router = express.Router()
const mysql = require('mysql')
const configOfDatabase = require('../config/configDatabase')


router.get('/list', (req, res, next) => {
    let sqlArray = []
    sqlArray.push(`select * from diaries where uid = ${req.query.uid}`)
    if (req.query.timeStart) sqlArray.push(`and date_modify BETWEEN '${req.query.timeStart}' and '${req.query.timeEnd}'`)
    sqlArray.push(`limit 200`)

    getDataFromDB(res, sqlArray)
})

router.get('/detail/:diaryId', (req, res, next) => {
    let sqlArray = []
    sqlArray.push(`select * from diaries where id = ${req.params.diaryId}`)
    getDataFromDB(res, sqlArray)
})


router.put('/edit', (req, res, next) => {
    getDataFromDB(res)
})
router.post('/add', (req, res, next) => {
    getDataFromDB(res)
})


// 运行 SQL 并返回 DB 结果
function getDataFromDB(res, sqlArray) {
    let connection = mysql.createConnection(configOfDatabase)
    connection.connect()

    connection.query(sqlArray.join(' '), [], function (err, result) {
        if (err) {
            console.log('数据库请求错误', err.message)
            return err
        }
        console.log('result count：',result.length)
        res.send(result)
    })
    connection.end()
}


module.exports = router
