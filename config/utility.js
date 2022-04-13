const mysql = require("mysql");
const configOfDatabase = require('./configDatabase')
const e = require("express");

// 运行 SQL 并返回 DB 结果
function getDataFromDB(res, sqlArray, isSingleValue) {
    return new Promise((resolve, reject) => {
        let connection = mysql.createConnection(configOfDatabase)
        connection.connect()

        connection.query(sqlArray.join(' '), [], function (err, result) {
            if (err) {
                console.log('数据库请求错误', err.message)
                return reject(err)
            }
            console.log('result count：',result.length)
            if (isSingleValue){
                resolve(result[0])
            } else {
                resolve(result)
            }
        })
        connection.end()
    })
}


module.exports = {
    getDataFromDB
}
