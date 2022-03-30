const express = require('express')
const router = express.Router()
const mysql = require('mysql')
const configOfDatabase = require('../config/configDB')


router.get('/', (req, res, next) => {
    getDiaryFromDB(res)
})
router.put('/edit', (req, res, next) => {
    getDiaryFromDB(res)
})
router.post('/add', (req, res, next) => {
    getDiaryFromDB(res)
})


function getDiaryFromDB(res) {
    let connection = mysql.createConnection(configOfDatabase)

    connection.connect()
    let sql = 'select * from diaries limit 200'
    connection.query(sql, [], function (err, result) {
        if (err) {
            console.log('[INSERT ERROR] - ', err.message)
            return err
        }
        res.send(result)
    })
    connection.end()
}


module.exports = router
