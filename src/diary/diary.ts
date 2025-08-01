import express from "express"
import {ResponseError, ResponseSuccess} from "../response/Response";
import {
    unicodeEncode,
    unicodeDecode,
    dateFormatter,
    getDataFromDB,
    updateUserLastLoginTime,
    verifyAuthorization, processBillOfDay, operate_db_and_return_added_id, operate_db_without_return
} from "../utility";
import {Diary} from "entity/Diary";
const router = express.Router()

// Function to escape MySQL special characters
function escapeMySQLString(str: string): string {
    if (!str) return '';
    return str
        .replace(/\\/g, '\\\\')  // Backslash
        .replace(/'/g, "\\'")    // Single quote
        .replace(/"/g, '\\"')    // Double quote
        .replace(/\n/g, '\\n')   // New line
        .replace(/\r/g, '\\r')   // Carriage return
        .replace(/\t/g, '\\t')   // Tab
        .replace(/\0/g, '\\0')   // Null character
        .replace(/\x1a/g, '\\Z'); // Ctrl+Z
}

// Function to unescape MySQL special characters
function unescapeMySQLString(str: string): string {
    if (!str) return '';
    return str
        .replace(/\\Z/g, '\x1a')  // Ctrl+Z
        .replace(/\\0/g, '\0')    // Null character
        .replace(/\\t/g, '\t')    // Tab
        .replace(/\\r/g, '\r')    // Carriage return
        .replace(/\\n/g, '\n')    // New line
        .replace(/\\"/g, '"')     // Double quote
        .replace(/\\'/g, "'")     // Single quote
        .replace(/\\\\/g, '\\');  // Backslash
}

const DB_NAME = 'diary'
const DATA_NAME = '日记'
const CURRENT_TABLE = 'diaries'

router.get('/list', (req, res) => {
    verifyAuthorization(req)
        .then(userInfo => {
            let startPoint = (Number(req.query.pageNo) - 1) * Number(req.query.pageSize) // 日记起点

            let sqlArray = []
            sqlArray.push(`SELECT *
                  from ${CURRENT_TABLE} 
                  where uid='${userInfo.uid}'`)

            // keywords
            if (req.query.keywords){
                let keywords = JSON.parse(String(req.query.keywords)).map((item: string) => unicodeEncode(item))
                console.log(keywords)
                if (keywords.length > 0){
                    let keywordStrArray = keywords
                        .map((keyword: string) => `( title like '%${keyword}%' ESCAPE '/'  or content like '%${keyword}%' ESCAPE '/')` )
                    sqlArray.push(' and ' + keywordStrArray.join(' and ')) // 在每个 categoryString 中间添加 'or'
                }
            }

            // categories
            if (req.query.categories){
                let categories = JSON.parse(String(req.query.categories))
                if (categories.length > 0) {
                    let categoryStrArray = categories.map((category: string) => `category='${category}'`)
                    let tempString = categoryStrArray.join(' or ')
                    sqlArray.push(` and (${tempString})`) // 在每个 categoryString 中间添加 'or'
                }
            }

            // share
            if (req.query.filterShared === '1'){
                sqlArray.push(' and is_public = 1')
            }

            // date range
            if (req.query.dateFilterString){
                let year = (req.query.dateFilterString as string).substring(0,4)
                let month = (req.query.dateFilterString as string).substring(4,6)
                sqlArray.push(` and  YEAR(date)='${year}' AND MONTH(date)='${month}'`)
            }

            sqlArray.push(` order by date desc
                  limit ${startPoint}, ${req.query.pageSize}`)

            getDataFromDB( DB_NAME, sqlArray)
                .then(data => {
                    updateUserLastLoginTime(userInfo.uid)
                    data.forEach((diary: Diary) => {
                        // decode unicode and unescape MySQL
                        diary.title = unescapeMySQLString(unicodeDecode(diary.title))
                        diary.content = unescapeMySQLString(unicodeDecode(diary.content))
                        // 处理账单数据
                        if (diary.category === 'bill'){
                            diary.billData = processBillOfDay(diary, [])
                        }
                    })
                    res.send(new ResponseSuccess(data, '请求成功'))
                })
                .catch(err => {
                    res.send(new ResponseError(err, err.message))
                })
        })
        .catch(errInfo => {
            res.send(new ResponseError('', errInfo))
        })
})


// 只获取日记的类别、日期、ID、标题
router.get('/list-title-only', (req, res) => {
    verifyAuthorization(req)
        .then(userInfo => {
            let sqlArray = []
            sqlArray.push(` SELECT id,date,title,category from ${CURRENT_TABLE} where uid='${userInfo.uid}' `)
            // keywords
            if (req.query.keywords){
                let keywords = JSON.parse(String(req.query.keywords)).map((item: string) => unicodeEncode(item))
                console.log(keywords)
                if (keywords.length > 0){
                    let keywordStrArray = keywords
                        .map((keyword: string) => `( title like '%${keyword}%' ESCAPE '/'  or content like '%${keyword}%' ESCAPE '/')` )
                    sqlArray.push(' and ' + keywordStrArray.join(' and ')) // 在每个 categoryString 中间添加 'or'
                }
            }

            // categories
            if (req.query.categories){
                let categories = JSON.parse(String(req.query.categories))
                if (categories.length > 0) {
                    let categoryStrArray = categories.map((category: string) => `category='${category}'`)
                    let tempString = categoryStrArray.join(' or ')
                    sqlArray.push(` and (${tempString})`) // 在每个 categoryString 中间添加 'or'
                }
            }

            // share
            if (req.query.filterShared === '1'){
                sqlArray.push(' and is_public = 1')
            }

            // date range
            if (req.query.dateFilterString){
                let year = (req.query.dateFilterString as string).substring(0,4)
                let month = (req.query.dateFilterString as string).substring(4,6)
                sqlArray.push(` and  YEAR(date)='${year}' AND MONTH(date)='${month}'`)
            }

            // filter date range
            if (req.query.dateStart){
                sqlArray.push(` and date >= '${req.query.dateStart} 00:00:00'`)
            }
            if (req.query.dateEnd){
                sqlArray.push(` and date <= '${req.query.dateEnd} 23:59:59'`)
            }

            sqlArray.push(` order by date desc`)

            console.log(sqlArray.join(''))

            getDataFromDB( DB_NAME, sqlArray)
                .then(data => {
                    updateUserLastLoginTime(userInfo.uid)
                    data.forEach((diary: Diary) => {
                        // decode unicode
                        diary.title = unicodeDecode(diary.title)
                    })
                    res.send(new ResponseSuccess(data, '请求成功'))
                })
                .catch(err => {
                    res.send(new ResponseError(err, err.message))
                })
        })
        .catch(errInfo => {
            res.send(new ResponseError('', errInfo))
        })
})

// 只获取日记的类别、日期、ID
router.get('/list-category-only', (req, res) => {
    // res as {
    //     dateStart: string, // date string, format: YYYYMMDD
    //     dateEnd: string, // date string, format: YYYYMMDD
    //     categories: string[],
    //     keywords: string[],
    //     filterShared: string,
    // }
    verifyAuthorization(req)
        .then(userInfo => {
            
            let sqlArray = []
            sqlArray.push(`SELECT id,DATE_FORMAT(date,'%Y-%m-%d') as date,category from ${CURRENT_TABLE} where uid='${userInfo.uid}' `)
            // filter keywords
            if (req.query.keywords){
                let keywords = JSON.parse(String(req.query.keywords)).map((item: string) => unicodeEncode(item))
                console.log(keywords)
                if (keywords.length > 0){
                    let keywordStrArray = keywords
                        .map((keyword: string) => `( title like '%${keyword}%' ESCAPE '/'  or content like '%${keyword}%' ESCAPE '/')` )
                    sqlArray.push(' and ' + keywordStrArray.join(' and ')) // 在每个 categoryString 中间添加 'or'
                }
            }

            // filter categories
            if (req.query.categories){
                let categories = JSON.parse(String(req.query.categories))
                if (categories.length > 0) {
                    let categoryStrArray = categories.map((category: string) => `category='${category}'`)
                    let tempString = categoryStrArray.join(' or ')
                    sqlArray.push(` and (${tempString})`) // 在每个 categoryString 中间添加 'or'
                }
            }

            // filter share
            if (req.query.filterShared === '1'){
                sqlArray.push(' and is_public = 1')
            }

            // filter date range
            if (req.query.dateFilterString){
                let year = (req.query.dateFilterString as string).substring(0,4)
                let month = (req.query.dateFilterString as string).substring(4,6)
                sqlArray.push(` and YEAR(date)='${year}' AND MONTH(date)='${month}'`)
            }

            // filter date range
            if (req.query.dateStart){
                sqlArray.push(` and date >= '${req.query.dateStart}'`)
            }
            if (req.query.dateEnd){
                sqlArray.push(` and date <= '${req.query.dateEnd}'`)
            }

            sqlArray.push(` order by date desc`)

            getDataFromDB( DB_NAME, sqlArray)
                .then(data => {
                    updateUserLastLoginTime(userInfo.uid)
                    res.send(new ResponseSuccess(data, '请求成功'))
                })
                .catch(err => {
                    res.send(new ResponseError(err, err.message))
                })
        })
        .catch(errInfo => {
            res.send(new ResponseError('', errInfo))
        })
})



router.get('/export', (req, res) => {
    verifyAuthorization(req)
        .then(userInfo => {
            let sqlArray = []
            sqlArray.push(`SELECT *
                  from diaries 
                  where uid='${userInfo.uid}'`)
            getDataFromDB( DB_NAME, sqlArray)
                .then(data => {
                    updateUserLastLoginTime(userInfo.uid)
                    data.forEach(diary => {
                        // decode unicode and unescape MySQL
                        diary.title = unescapeMySQLString(unicodeDecode(diary.title))
                        diary.content = unescapeMySQLString(unicodeDecode(diary.content))
                        // 处理账单数据
                        if (diary.category === 'bill'){
                            diary.billData = processBillOfDay(diary, [])
                        }
                    })
                    res.send(new ResponseSuccess(data, '请求成功'))
                })
                .catch(err => {
                    res.send(new ResponseError(err, err.message))
                })
        })
        .catch(verified => {
            res.send(new ResponseError(verified, '无权查看日记列表：用户信息错误'))
        })
})

router.get('/temperature', (req, res) => {
    verifyAuthorization(req)
        .then(userInfo => {
            let sqlArray = []
            sqlArray.push(`SELECT
                               date,
                               temperature,
                               temperature_outside
                           FROM
                               diaries
                           WHERE
                               uid='${userInfo.uid}'
                             AND category = 'life'

                           ORDER BY
                               date desc
                               LIMIT 100 `)

            // date range
            if (req.query.dateFilterString){
                let year = (req.query.dateFilterString as string).substring(0,4)
                let month = (req.query.dateFilterString as string).substring(4,6)
                sqlArray.push(` and  YEAR(date)='${year}' AND MONTH(date)='${month}'`)
            }
            getDataFromDB( DB_NAME, sqlArray)
                .then(data => {
                    updateUserLastLoginTime(userInfo.uid)
                    data.forEach((diary: Diary) => {
                        // decode unicode and unescape MySQL
                        diary.title = unescapeMySQLString(unicodeDecode(diary.title))
                        diary.content = unescapeMySQLString(unicodeDecode(diary.content))
                    })
                    res.send(new ResponseSuccess(data, '请求成功'))
                })
                .catch(err => {
                    res.send(new ResponseError(err, err.message))
                })
        })
        .catch(errInfo => {
            res.send(new ResponseError('', errInfo))
        })
})

router.get('/detail', (req, res) => {
    let sqlArray = []
    sqlArray.push(`select * from diaries where id = ${req.query.diaryId}`)
    // 1. 先查询出日记结果
    getDataFromDB( DB_NAME, sqlArray, true)
        .then(dataDiary => {
            // decode unicode and unescape MySQL
            dataDiary.title = unescapeMySQLString(unicodeDecode(dataDiary.title))
            dataDiary.content = unescapeMySQLString(unicodeDecode(dataDiary.content))

            // 2. 判断是否为共享日记
            if (dataDiary.is_public === 1){
                // 2.1 如果是，直接返回结果，不需要判断任何东西
                let diaryOwnerId = dataDiary.uid
                getDataFromDB('diary', [`select * from users where uid = '${diaryOwnerId}'`], true)
                    .then(userData => {
                        dataDiary.nickname = userData.nickname
                        dataDiary.username = userData.username
                        res.send(new ResponseSuccess(dataDiary))
                    })
            } else {
                // 2.2 如果不是，需要判断：当前 email 和 token 是否吻合
                verifyAuthorization(req)
                    .then(userInfo => {
                        // 3. 判断日记是否属于当前请求用户
                        if (Number(userInfo.uid) === dataDiary.uid){
                            // 记录最后访问时间
                            updateUserLastLoginTime(userInfo.uid)
                            res.send(new ResponseSuccess(dataDiary))
                        } else {
                            res.send(new ResponseError('','无权查看该日记：请求用户 ID 与日记归属不匹配'))
                        }
                    })
                    .catch(errInfo => {
                        res.send(new ResponseError('', errInfo))
                    })
            }
        })
        .catch(err => {
            res.send(new ResponseError(err,))
        })
})

router.post('/add', (req, res) => {
    // 1. 验证用户信息是否正确
    verifyAuthorization(req)
        .then(userInfo => {
            let sqlArray = []
            let parsedTitle = unicodeEncode(req.body.title) // !
            parsedTitle = escapeMySQLString(parsedTitle)
            let parsedContent = unicodeEncode(req.body.content) || ''
            parsedContent = escapeMySQLString(parsedContent)
            let timeNow = dateFormatter(new Date())
            sqlArray.push(`
                    INSERT into diaries(title, content, category, weather, temperature, temperature_outside, date_create, date_modify, date, uid, is_public, is_markdown )
                    VALUES(
                        '${parsedTitle}','${parsedContent}','${req.body.category}','${req.body.weather}',${req.body.temperature},
                        ${req.body.temperature_outside}, '${timeNow}','${timeNow}','${req.body.date}','${userInfo.uid}','${req.body.is_public || 0}', '${req.body.is_markdown || 0}')`
            )
            operate_db_and_return_added_id(userInfo.uid, DB_NAME, DATA_NAME, sqlArray, '添加', res,)
        })
        .catch(errInfo => {
            res.send(new ResponseError('', errInfo))
        })
})

router.put('/modify', (req, res) => {
    // 1. 验证用户信息是否正确
    verifyAuthorization(req)
        .then(userInfo => {
            let parsedTitle = unicodeEncode(req.body.title) // !
            parsedTitle = escapeMySQLString(parsedTitle)
            let parsedContent = unicodeEncode(req.body.content) || ''
            parsedContent = escapeMySQLString(parsedContent)
            let timeNow = dateFormatter(new Date())
            let sqlArray = [`
                        update diaries
                            set
                                diaries.date_modify='${timeNow}',
                                diaries.date='${req.body.date}',
                                diaries.category='${req.body.category}',
                                diaries.title='${parsedTitle}',
                                diaries.content='${parsedContent}',
                                diaries.weather='${req.body.weather}',
                                diaries.temperature=${req.body.temperature},
                                diaries.temperature_outside=${req.body.temperature_outside},
                                diaries.is_public='${req.body.is_public}',
                                diaries.is_markdown='${req.body.is_markdown}'
                            WHERE id='${req.body.id}' and uid='${userInfo.uid}'
                    `]
            operate_db_without_return(userInfo.uid, DB_NAME, DATA_NAME, sqlArray, '修改', res)
        })
        .catch(errInfo => {
            res.send(new ResponseError('', errInfo))
        })
})

router.delete('/delete', (req, res) => {
    // 1. 验证用户信息是否正确
    verifyAuthorization(req)
        .then(userInfo => {
            let sqlArray = []
            sqlArray.push(`
                        DELETE from diaries
                        WHERE id='${req.body.diaryId}'
                        and uid='${userInfo.uid}'
                    `)
            operate_db_without_return(userInfo.uid, DB_NAME, DATA_NAME, sqlArray, '删除', res,)
        })
        .catch(errInfo => {
            res.send(new ResponseError('', errInfo))
        })
})

router.get('/latest-recommend', (req, res) => {
    let sqlArray = []
    sqlArray.push(`select * from diaries where title like '%首页推荐%' and is_public = 1 and uid = 3 order by date desc`)
    // 1. 先查询出日记结果
    getDataFromDB('diary', sqlArray, false)
        .then(diaryList => {
            if (diaryList.length > 0) {
                let dataDiary = diaryList[0]
                // decode unicode
                dataDiary.title = unicodeDecode(dataDiary.title)
                dataDiary.content = unicodeDecode(dataDiary.content)
                res.send(new ResponseSuccess(dataDiary))
            } else {
                res.send(new ResponseSuccess(''))
            }
        })
        .catch(err => {
            res.send(new ResponseError(err, '查询错误'))
        })
})

// 获取标题中带有指定关键字的日记内容
router.get('/get-diary-content-with-keyword', (req, res) => {
    verifyAuthorization(req)
        .then(userInfo => {
            let sqlArray = []
            sqlArray.push(`select * from diaries where title like '%${req.query.keyword}%' and uid = ${userInfo.uid} order by id desc`)

            getDataFromDB('diary', sqlArray, true)
                .then(dataDiary => {
                    updateUserLastLoginTime(userInfo.uid)
                    dataDiary.title = unescapeMySQLString(unicodeDecode(dataDiary.title))
                    dataDiary.content = unescapeMySQLString(unicodeDecode(dataDiary.content))
                    res.send(new ResponseSuccess(dataDiary))
                })
                .catch(err => {
                    res.send(new ResponseError(err, '查询错误'))
                })
        })
        .catch(errInfo => {
            res.send(new ResponseError('', errInfo))
        })
})

router.get('/get-latest-public-diary-with-keyword', (req, res) => {
    let sqlArray = []
    sqlArray.push(`select * from diaries where title like '%${req.query.keyword}%' and is_public = 1 and uid = 3 order by id desc`)
    // 1. 先查询出日记结果
    getDataFromDB('diary', sqlArray, true)
        .then(dataDiary => {
            dataDiary.title = unescapeMySQLString(unicodeDecode(dataDiary.title))
            dataDiary.content = unescapeMySQLString(unicodeDecode(dataDiary.content))
            res.send(new ResponseSuccess(dataDiary))
        })
        .catch(err => {
            res.send(new ResponseError(err, '查询错误'))
        })
})

router.post('/clear', (req, res) => {
    verifyAuthorization(req)
        .then(userInfo => {
            if (userInfo.email === 'test@163.com'){
                res.send(new ResponseError('', '演示帐户不允许执行此操作'))
                return
            }
            let sqlArray = []
            sqlArray.push(`delete from diaries where uid=${userInfo.uid}`)
            getDataFromDB( DB_NAME, sqlArray)
                .then(data => {
                    updateUserLastLoginTime(userInfo.uid)
                    res.send(new ResponseSuccess(data, `清空成功：${data.affectedRows} 条日记`))
                })
                .catch(err => {
                    res.send(new ResponseError(err, err.message))
                })
        })
        .catch(verified => {
            res.send(new ResponseError(verified, '无权查看日记列表：用户信息错误'))
        })
})

export default router
