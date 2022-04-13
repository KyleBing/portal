const mysql = require("mysql");
const configOfDatabase = require('./configDatabase')

// 运行 SQL 并返回 DB 结果
function getDataFromDB(res, sqlArray, isSingleValue) {
    let connection = mysql.createConnection(configOfDatabase)
    connection.connect()

    connection.query(sqlArray.join(' '), [], function (err, result) {
        if (err) {
            console.log('数据库请求错误', err.message)
            return err
        }
        console.log('result count：',result.length)
        if (isSingleValue){
            res.send(result[0])
        } else {
            res.send(result)
        }
    })
    connection.end()
}


module.exports = {
    getDataFromDB
}
