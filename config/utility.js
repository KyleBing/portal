const mysql = require("mysql");
const configOfDatabase = require('./configDatabase')

// 运行 SQL 并返回 DB 结果
function getDataFromDB(sqlArray, isSingleValue) {
    return new Promise((resolve, reject) => {
        let connection = mysql.createConnection(configOfDatabase)
        connection.connect()
        console.log('---- SQL', sqlArray.join(' '))

        connection.query(sqlArray.join(' '), [], function (err, result) {
            // console.log('result: ', result)
            if (err) {
                console.log('数据库请求错误', err.message)
                reject(err)
                return
            }
            if (isSingleValue){
                resolve(result[0])
            } else {
                resolve(result)
            }
        })
        connection.end()
    })
}

// 验证用户是否有权限
function verifyAuthorization(uid, email, password){
    let sqlArray = []
    sqlArray.push(`select * from users where uid = ${uid}`)
    console.log('sqlArray: ',sqlArray)
    return new Promise((resolve, reject) => {
        getDataFromDB(sqlArray, true)
            .then(data => {
                console.log('sqlResult: ', data.password, password)
                if (data.password === password){
                    resolve(data) // 如果查询成功，返回查询结果
                } else {
                    reject (false)
                }
            })
            .catch(err => {
                console.log('验证权限失败', err, err.message)
                reject(false)
            })
    })
}

// 验证用户是否有权限
function verifyAuthorization(uid, email, password){
    let sqlArray = []
    sqlArray.push(`select * from users where uid = ${uid}`)
    console.log('sqlArray: ',sqlArray)
    return new Promise((resolve, reject) => {
        getDataFromDB(sqlArray, true)
            .then(data => {
                console.log('sqlResult: ', data.password, password)
                if (data.password === password){
                    resolve(data) // 如果查询成功，返回查询结果
                } else {
                    reject (false)
                }
            })
            .catch(err => {
                console.log('验证权限失败', err, err.message)
                reject(false)
            })
    })
}


// 格式化时间，输出字符串
function dateFormatter(date, formatString) {
    formatString = formatString || 'yyyy-MM-dd hh:mm:ss'
    let dateRegArray = {
        "M+": date.getMonth() + 1,                      // 月份
        "d+": date.getDate(),                           // 日
        "h+": date.getHours(),                          // 小时
        "m+": date.getMinutes(),                        // 分
        "s+": date.getSeconds(),                        // 秒
        "q+": Math.floor((date.getMonth() + 3) / 3), // 季度
        "S": date.getMilliseconds()                     // 毫秒
    }
    if (/(y+)/.test(formatString)) {
        formatString = formatString.replace(RegExp.$1, (date.getFullYear() + "").substr(4 - RegExp.$1.length))
    }
    for (let section in dateRegArray) {
        if (new RegExp("(" + section + ")").test(formatString)) {
            formatString = formatString.replace(RegExp.$1, (RegExp.$1.length === 1) ? (dateRegArray[section]) : (("00" + dateRegArray[section]).substr(("" + dateRegArray[section]).length)))
        }
    }
    return formatString
}

// unicode -> text
function unicodeEncode(str){
    if(!str)return '';
    if(typeof str !== 'string') return str
    let text = escape(str);
    text = text.replaceAll(/(%u[ed][0-9a-f]{3})/ig, (source, replacement) => {
        console.log('source: ',source)
        return source.replace('%', '\\\\')
    })
    return unescape(text);
}

// text -> unicode
function  unicodeDecode(str)
{
    let text = escape(str);
    text = text.replaceAll(/(%5Cu[ed][0-9a-f]{3})/ig, source=>{
        return source.replace('%5C', '%')
    })
    return unescape(text);
}

function updateUserLastLoginTime(email){
    let timeNow = dateFormatter(new Date())
    getDataFromDB([`update users set last_visit_time='${timeNow}' where email='${email}'`])
        .then(data => {
            console.log('--- 成功：记录用户最后操作时间')
        })
        .catch(err => {
            console.log('--- 失败：记录用户最后操作时间')
        })
}



module.exports = {
    getDataFromDB, dateFormatter, updateUserLastLoginTime,
    unicodeEncode, unicodeDecode,
    verifyAuthorization
}
