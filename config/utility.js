const mysql = require("mysql");
const configDatabase = require('./configDatabase')
const configProject = require('./configProject')

// 运行 SQL 并返回 DB 结果
function getDataFromDB(dbName, sqlArray, isSingleValue) {
    return new Promise((resolve, reject) => {
        let connection = mysql.createConnection({
            host:       configDatabase.host,
            user:       configDatabase.user,
            password:   configDatabase.password,
            port:       configDatabase.port,
            multipleStatements: configDatabase.multipleStatements, // 允许同时请求多条 sql 语句
            timezone: configDatabase.timezone,
            database: dbName
        })
        connection.connect()
        // console.log('---- SQL', sqlArray.join(' '))

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
function verifyAuthorization(req){
    let token = req.get(configProject.TOKEN_NAME) || req.query.token
    return new Promise((resolve, reject) => {
        if (!token){
            reject ('无 token')
        } else {
            let sqlArray = []
            sqlArray.push(`select * from users where password = '${token}'`)
            getDataFromDB( 'diary', sqlArray, true)
                .then(userInfo => {
                    resolve(userInfo) // 如果查询成功，返回 用户id
                })
                .catch(err => {
                    console.log('验证权限失败', err, err.message)
                    reject(false)
                })
        }
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

function updateUserLastLoginTime(uid){
    let timeNow = dateFormatter(new Date())
    getDataFromDB( 'diary', [`update users set last_visit_time='${timeNow}' where uid='${uid}'`])
        .then(data => {
            console.log('--- 成功：记录用户最后操作时间')
        })
        .catch(err => {
            console.log('--- 失败：记录用户最后操作时间')
        })
}


// 处理账单文本内容，转成格式化的账单数据
function processBillOfDay(billContent, date){
    let str = billContent.replace(/ +/g, ' ') // 替换掉所有多个空格的间隔，改为一个空格
    let strArray = str.split('\n').filter(item => item.trim().length > 0)

    let response = {
        date: date,
        items: [],
        sum: 0,
        sumIncome: 0,
        sumOutput: 0
    }
    strArray.forEach(item => {
        let itemInfos = item.split(' ')
        let price = Number(itemInfos[1]) || 0 // 避免账单填写出错的情况
        if (price < 0) {
            response.sumOutput = formatMoney(response.sumOutput + price)
        } else {
            response.sumIncome = formatMoney(response.sumIncome + price)
        }
        response.sum = formatMoney(response.sum + price)

        response.items.push({
            item: itemInfos[0],
            price: price
        })
    })

    return response
}

function formatMoney(number){
    return Number(number.toFixed(2))
}


module.exports = {
    getDataFromDB, dateFormatter, updateUserLastLoginTime,
    unicodeEncode, unicodeDecode,
    verifyAuthorization,
    // Bill
    processBillOfDay, formatMoney
}
