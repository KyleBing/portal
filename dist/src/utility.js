"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDataFromDB = getDataFromDB;
exports.verifyAuthorization = verifyAuthorization;
exports.getMysqlConnection = getMysqlConnection;
exports.dateFormatter = dateFormatter;
exports.unicodeEncode = unicodeEncode;
exports.unicodeDecode = unicodeDecode;
exports.updateUserLastLoginTime = updateUserLastLoginTime;
exports.operate_db_and_return_added_id = operate_db_and_return_added_id;
exports.operate_db_without_return = operate_db_without_return;
exports.processBillOfDay = processBillOfDay;
exports.formatMoney = formatMoney;
const mysql2_1 = __importDefault(require("mysql2"));
const configDatabase_json_1 = __importDefault(require("../config/configDatabase.json"));
const Response_1 = require("./response/Response");
// 检测是否在 Docker 环境中运行
function isDockerEnvironment() {
    return process.env.NODE_ENV === 'docker' || process.env.DOCKER_ENV === 'true';
}
// 获取数据库主机地址
function getDatabaseHost() {
    return isDockerEnvironment() ? 'mysql' : configDatabase_json_1.default.host;
}
// 运行 SQL 并返回 DB 结果
function getDataFromDB(dbName, sqlArray, isSingleValue) {
    return new Promise((resolve, reject) => {
        let connection = mysql2_1.default.createConnection({
            host: getDatabaseHost(),
            user: configDatabase_json_1.default.user,
            password: configDatabase_json_1.default.password,
            port: configDatabase_json_1.default.port,
            multipleStatements: configDatabase_json_1.default.multipleStatements, // 允许同时请求多条 sql 语句
            timezone: configDatabase_json_1.default.timezone,
            database: dbName
        });
        connection.connect();
        // console.log('---- SQL', sqlArray.join(' '))
        connection.query(sqlArray.join(' '), [], function (err, result) {
            // console.log('result: ', result)
            if (err) {
                console.log('数据库请求错误', err.message);
                reject(err);
                return;
            }
            if (isSingleValue) {
                resolve(result[0]);
            }
            else {
                resolve(result);
            }
        });
        connection.end();
    });
}
// 验证用户是否有权限
function verifyAuthorization(req) {
    let token = req.get('Diary-Token') || req.query.token;
    let uid = req.get('Diary-Uid');
    return new Promise((resolve, reject) => {
        if (!token) {
            reject('无 token');
        }
        else if (!uid) {
            reject('程序已升级，请关闭所有相关窗口，再重新访问该网站');
        }
        else {
            let sqlArray = [];
            sqlArray.push(`select * from users where password = '${token}' and uid = ${uid}`);
            getDataFromDB('diary', sqlArray, true)
                .then(userInfo => {
                if (userInfo) {
                    resolve(userInfo); // 如果查询成功，返回 用户id
                }
                else {
                    reject('身份验证失败：查无此人');
                }
            })
                .catch(() => {
                reject('mysql: 获取身份信息错误');
            });
        }
    });
}
function getMysqlConnection(dbName) {
    let connection = mysql2_1.default.createConnection({
        host: getDatabaseHost(),
        user: configDatabase_json_1.default.user,
        password: configDatabase_json_1.default.password,
        port: configDatabase_json_1.default.port,
        multipleStatements: configDatabase_json_1.default.multipleStatements, // 允许同时请求多条 sql 语句
        timezone: configDatabase_json_1.default.timezone,
        database: dbName
    });
    connection.connect();
    return connection;
}
// 格式化时间，输出字符串
function dateFormatter(date, formatString = 'yyyy-MM-dd hh:mm:ss') {
    let dateRegArray = {
        "M+": date.getMonth() + 1, // 月份
        "d+": date.getDate(), // 日
        "h+": date.getHours(), // 小时
        "m+": date.getMinutes(), // 分
        "s+": date.getSeconds(), // 秒
        "q+": Math.floor((date.getMonth() + 3) / 3), // 季度
        "S": date.getMilliseconds() // 毫秒
    };
    if (/(y+)/.test(formatString)) {
        formatString = formatString.replace(RegExp.$1, (date.getFullYear() + "").substr(4 - RegExp.$1.length));
    }
    for (let section in dateRegArray) {
        if (new RegExp("(" + section + ")").test(formatString)) {
            formatString = formatString.replace(RegExp.$1, (RegExp.$1.length === 1) ? (dateRegArray[section]) : (("00" + dateRegArray[section]).substr(("" + dateRegArray[section]).length)));
        }
    }
    return formatString;
}
// unicode -> text
function unicodeEncode(str) {
    if (!str)
        return '';
    if (typeof str !== 'string')
        return str;
    let text = escape(str);
    text = text.replace(/(%u[ed][0-9a-f]{3})/ig, (source, replacement) => {
        console.log('source: ', source);
        return source.replace('%', '\\\\');
    });
    return unescape(text);
}
// text -> unicode
function unicodeDecode(str) {
    let text = escape(str);
    text = text.replace(/(%5Cu[ed][0-9a-f]{3})/ig, source => {
        return source.replace('%5C', '%');
    });
    return unescape(text);
}
function updateUserLastLoginTime(uid) {
    let timeNow = dateFormatter(new Date());
    getDataFromDB('diary', [`update users set last_visit_time='${timeNow}' where uid='${uid}'`])
        .then(() => {
        console.log(`--- 成功：记录用户最后操作时间 ${timeNow} ${uid}`);
    })
        .catch(() => {
        console.log('--- 失败：记录用户最后操作时间 ${timeNow} ${uid}`');
    });
}
/**
 * 通用操作，数据库操作： 返回添加的记录 id
 * @param uid  用户id
 * @param dbId 数据库标识
 * @param dbTitle 数据库名
 * @param sqlArray 操作的 sql 语句数组
 * @param operationName 操作的名字：添加|删除|修改
 * @param res  express.Response
 */
function operate_db_and_return_added_id(uid, dbId, dbTitle, sqlArray, operationName, res) {
    getDataFromDB(dbId, sqlArray)
        .then(data => {
        console.log(data);
        if (data) { // 没有记录时会返回  undefined
            updateUserLastLoginTime(uid);
            // 添加成功之后，返回添加后的日记类别 id
            res.send(new Response_1.ResponseSuccess({ id: data.insertId }, `${operationName}成功`));
        }
        else {
            res.send(new Response_1.ResponseError('', `${dbTitle}操作错误`));
        }
    })
        .catch(err => {
        res.send(new Response_1.ResponseError(err, `${dbTitle}${operationName}失败`));
    });
}
/**
 * 通用操作，数据库操作 不返回结果
 * @param uid  用户id
 * @param dbId 数据库标识
 * @param dbTitle 数据库名
 * @param sqlArray 操作的 sql 语句数组
 * @param operationName 操作的名字：添加|删除|修改
 * @param res  express.Response
 */
function operate_db_without_return(uid, dbId, dbTitle, sqlArray, operationName, res) {
    getDataFromDB(dbId, sqlArray)
        .then(data => {
        updateUserLastLoginTime(uid);
        // 编辑成功之后，返回添加后的日记类别 id
        res.send(new Response_1.ResponseSuccess(null, `${operationName}成功`));
    })
        .catch(err => {
        res.send(new Response_1.ResponseError(err, `${dbTitle}${operationName}失败`));
    });
}
// 处理账单文本内容，转成格式化的账单数据
function processBillOfDay(diaryObj, filterKeywords = []) {
    let str = diaryObj.content.replace(/ +/g, ' '); // 替换掉所有多个空格的间隔，改为一个空格
    let strArray = str
        .split('\n')
        .filter(item => item.trim().length > 0)
        .filter(item => {
        let reg = new RegExp(`.*(${filterKeywords.join('|')}).*`, 'ig');
        return reg.test(item);
    });
    let response = {
        id: diaryObj.id,
        month_id: diaryObj.month_id,
        date: diaryObj.date,
        items: [],
        sum: 0,
        sumIncome: 0,
        sumOutput: 0
    };
    strArray.forEach(item => {
        let itemInfos = item.split(' ');
        let price = Number(itemInfos[1]) || 0; // 避免账单填写出错的情况
        if (price < 0) {
            response.sumOutput = formatMoney(response.sumOutput + price);
        }
        else {
            response.sumIncome = formatMoney(response.sumIncome + price);
        }
        response.sum = formatMoney(response.sum + price);
        response.items.push({
            item: itemInfos[0],
            price: price
        });
    });
    return response;
}
function formatMoney(number) {
    return Number(number.toFixed(2));
}
