import express from "express"
import {ResponseError, ResponseSuccess} from "../response/Response";
import {
    unicodeEncode,
    unicodeDecode,
    dateFormatter,
    getDataFromDB,
    updateUserLastLoginTime,
    verifyAuthorization, operate_db_without_return,
} from "../utility";
const router = express.Router()

import multer from "multer";
import {WubiDict} from "../../src/entity/WubiDict";
const uploadLocal = multer({dest: 'upload'})
const storage = multer.memoryStorage()
const uploadStorage = multer({ storage: storage })

const DB_WUBI = 'wubi'
const DB_DIARY = 'diary'
const DATA_NAME = '五笔词条'
const CURRENT_TABLE = 'wubi_words'

// used for dict init
// 废弃
router.post('/upload-dict', uploadStorage.single('dict'), (req, res) => {
    // 1. 验证用户信息是否正确
    verifyAuthorization(req)
        .then(userInfo => {
            let dict = new WubiDict(req.file.buffer.toString(), 'temp', 'temp')
            let sqlArray = []
            // let parsedTitle = unicodeEncode(req.body.title) // !
            // let parsedContent = unicodeEncode(req.body.content) || ''
            let timeNow = dateFormatter(new Date())
            dict.wordsOrigin.forEach(word => {
                sqlArray.push(`
                    INSERT into ${CURRENT_TABLE}(word, code, priority, date_create, comment, user_init, user_modify)
                    VALUES(
                        '${word.word}','${word.code}',${word.priority || 0},'${timeNow}','${word.note}', '${userInfo.uid}', '${userInfo.uid}');`
                )
            })

            getDataFromDB( DB_WUBI, sqlArray)
                .then(data => {
                    updateUserLastLoginTime(userInfo.uid)
                    res.send(new ResponseSuccess(null, '导入词条成功')) // 添加成功之后，返回添加后的 id
                })
                .catch(err => {
                    res.send(new ResponseError(err, '导入词条失败'))
                })
        })
        .catch(err => {
            res.send(new ResponseError(err, '无权操作'))
        })
})

router.post('/list', (req, res) => {
    verifyAuthorization(req)
        .then(userInfo => {
            let sqlBase = `
                           SELECT
                           wubi_words.id,
                           wubi_words.word,
                           wubi_words.code,
                           wubi_words.priority,
                           wubi_words.up,
                           wubi_words.down,
                           wubi_words.date_create,
                           wubi_words.date_modify,
                           wubi_words.comment,
                           wubi_category.id AS category_id,
                           wubi_category.name as category_name,
                           wubi_words.user_init,
                           wubi_words.user_modify,
                           wubi_words.approved,
                           users_init.uid as uid_init,
                           users_init.nickname as nickname_init,
                           users_init.group_id as group_id_init,
                           users_modify.uid as uid_modify,
                           users_modify.nickname as nickname_modify,
                           users_modify.group_id as group_id_modify
                           
                           from ${DB_WUBI}.${CURRENT_TABLE}
                           LEFT JOIN wubi_category ON category_id = wubi_category.id
                           LEFT JOIN ${DB_DIARY}.users users_init ON wubi_words.user_init = users_init.uid
                           LEFT JOIN ${DB_DIARY}.users users_modify ON wubi_words.user_modify = users_modify.uid

                            `
            let filterArray = []

            // keywords
            if (req.body.keyword){
                let keywords = req.body.keyword.split(' ').map(item => unicodeEncode(item))
                if (keywords.length > 0){
                    let keywordStrArray =
                        keywords.map(keyword => `( wubi_words.word like '%${keyword}%' ESCAPE '/'  or  wubi_words.code like '%${keyword}%' ESCAPE '/' or wubi_words.comment like '%${keyword}%' ESCAPE '/')` )
                    filterArray.push( keywordStrArray.join(' and ')) // 在每个 categoryString 中间添加 'or'
                }
            }
            // date range
            if (req.body.dateRange && req.body.dateRange.length === 2){
                if (filterArray.length > 0){
                    filterArray.push(`and`)
                }
                filterArray.push(`date_create between '${req.body.dateRange[0]}' AND '${req.body.dateRange[1]}'`)
            }
            // category
            if (req.body.category_id){
                if (filterArray.length > 0){
                    filterArray.push(`and`)
                }
                filterArray.push(`category_id = ${req.body.category_id}`)
            }
            // approved
            if (req.body.hasOwnProperty('approved') && req.body.approved !== ''){
                if (filterArray.length > 0){
                    filterArray.push(`and`)
                }
                filterArray.push(`wubi_words.approved = ${req.body.approved} `)
            }

            if (filterArray.length > 0){
                filterArray.unshift('where')
            }

            filterArray.push(`order by wubi_words.code asc, wubi_words.priority asc`)

            let promisesAll = []
            let pointStart = (Number(req.body.pageNo) - 1) * Number(req.body.pageSize)
            promisesAll.push(getDataFromDB(
                DB_WUBI,
                [`${sqlBase} ${filterArray.join(' ')}  limit ${pointStart} , ${req.body.pageSize}`])
            )
            promisesAll.push(getDataFromDB(
                DB_WUBI,
                [`select count(*) as sum from ${CURRENT_TABLE} ${filterArray.join(' ')}`], true)
            )

            Promise
                .all(promisesAll)
                .then(([dataList, dataSum]) => {
                    dataList.forEach(item => {
                        item.word = unicodeDecode(item.word)
                        return item
                    })
                    updateUserLastLoginTime(userInfo.uid)
                    res.send(new ResponseSuccess({
                        list: dataList,
                        pager: {
                            pageSize: Number(req.body.pageSize),
                            pageNo: Number(req.body.pageNo),
                            total: dataSum.sum
                        }
                    }, '请求成功'))

                })
                .catch(err => {
                    res.send(new ResponseError(err, err.message))
                })

        })
        .catch(errInfo => {
            res.send(new ResponseError('', errInfo))
        })
})

router.post('/export-extra', (req, res) => {
    verifyAuthorization(req)
        .then(() => {
            let sqlBase = `
                SELECT wubi_words.id,
                       wubi_words.word,
                       wubi_words.code,
                       wubi_words.priority,
                       wubi_words.comment,
                       wubi_category.id AS category_id,
                       wubi_category.name as category_name,
                       wubi_words.user_init,
                       wubi_words.user_modify, 
                       users.email,
                       users.group_id
                FROM ${CURRENT_TABLE} 
                         LEFT JOIN wubi_category  ON category_id = wubi_category.id
                         LEFT JOIN users ON wubi_words.user_init = users.uid
                WHERE category_id != 1 and approved = 1
                ORDER BY 
                    wubi_category.sort_id, wubi_words.id ASC;
            `

            getDataFromDB(DB_WUBI,[sqlBase], false)
                .then(wordList => {
                    wordList.forEach(item => {
                        item.word = unicodeDecode(item.word)
                    })
                    // 由于服务器性能有限，不适合在服务器端作码表的处理操作，放到客户端即可
                    res.send(new ResponseSuccess(wordList, '请求成功'))
                })

        })
        .catch(errInfo => {
            res.send(new ResponseError('', errInfo))
        })
})

router.post('/check-exist', (req, res) => {
    verifyAuthorization(req)
        .then(userInfo => {
            let sqlArray = []
            let parseWord = unicodeEncode(req.body.word) // !
            sqlArray.push(`
                select * from ${CURRENT_TABLE} where word like '%${parseWord}%' and code like '${req.body.code}%' limit 5`
            )
            getDataFromDB( DB_WUBI, sqlArray, false)
                .then(data => {
                    res.send(new ResponseSuccess(data, '查询成功'))
                    updateUserLastLoginTime(userInfo.uid)
                })
                .catch(err => {
                    res.send(new ResponseError(err, '查询失败'))
                })
        })
        .catch(err => {
            res.send(new ResponseError(err, '无权操作'))
        })
})

router.post('/add', (req, res) => {
    // 1. 验证用户信息是否正确
    verifyAuthorization(req)
        .then(userInfo => {
            let sqlArray = []
            let parseWord = unicodeEncode(req.body.word) // !
            let timeNow = dateFormatter(new Date())
            let isApproved = userInfo.group_id === 1 ? 1: 0 // 管理员添加的词条默认就是已经 approved
            sqlArray.push(
                `
                    INSERT into 
                    ${CURRENT_TABLE}(
                        word, code, priority, up, down, date_create, date_modify, 
                        comment, user_init, user_modify, category_id, approved 
                        )
                    VALUES(
                        '${parseWord}','${req.body.code}','${req.body.priority || 0}','${req.body.up || 0}','${req.body.down || 0}',
                        '${timeNow}','${timeNow}','${req.body.comment}','${userInfo.uid}','${userInfo.uid}','${req.body.category_id || 1}', 
                        ${isApproved})
                `
            )
            getDataFromDB( DB_WUBI, sqlArray)
                .then(data => {
                    updateUserLastLoginTime(userInfo.uid)
                    res.send(new ResponseSuccess({id: data.insertId}, '添加成功')) // 添加成功之后，返回添加后的 id
                })
                .catch(err => {
                    res.send(new ResponseError(err, '添加失败'))
                })
        })
        .catch(err => {
            res.send(new ResponseError(err, '无权操作'))
        })
})

router.post('/add-batch', (req, res) => {
    // 1. 验证用户信息是否正确
    verifyAuthorization(req)
        .then(userInfo => {

            Promise.all(
                req.body.words.map(word => {
                    return getDataFromDB(DB_WUBI, [`select * from ${CURRENT_TABLE} where code = '${word.code}' and word = '${word.word}'`], true)
                })
            )
                .then(results => {
                    // results : 所有 words 是否存在于数据库的结果值
                    let wordsWithExistTag = req.body.words.map((word,index) => {
                        word.isExist = !!results[index]
                        return word
                    })

                    // 需要插入的词条数组
                    let insertWords = wordsWithExistTag.filter(item => !item.isExist)

                    if (insertWords.length === 0){
                        // 当所有词条都已存在数据库中时，直接返回成功
                        res.send(new ResponseSuccess(
                            {
                                addedCount: 0,
                                existCount: results.length,
                            },
                            '批量添加成功')) // 添加成功之后，返回添加后的 id
                    } else {
                        let sqlArray = insertWords.map(word => {
                            let parseWord = unicodeEncode(word.word) // !
                            let timeNow = dateFormatter(new Date())
                            let isApproved = userInfo.group_id === 1 ? 1: 0 // 管理员添加的词条默认就是已经 approved
                            return `INSERT into ${CURRENT_TABLE}(word, code, priority,
                                                          date_create, date_modify, comment, user_init, user_modify, category_id, approved)
                                VALUES ('${parseWord}', '${word.code}', '${word.priority || 0}',
                                        '${timeNow}', '${timeNow}', '${word.comment || ''}', '${userInfo.uid}','${userInfo.uid}',
                                        '${req.body.category_id || 1}', ${isApproved});`
                        })
                        getDataFromDB( DB_WUBI, sqlArray)
                            .then(() => {
                                updateUserLastLoginTime(userInfo.uid)
                                res.send(new ResponseSuccess(
                                    {
                                        addedCount: insertWords.length,
                                        existCount: results.length - insertWords.length,
                                    },
                                    '批量添加成功')) // 添加成功之后，返回添加后的 id
                            })
                            .catch(err => {
                                res.send(new ResponseError(err, '添加失败'))
                            })
                    }
                })
        })
        .catch(err => {
            res.send(new ResponseError(err, '无权操作'))
        })
})

router.put('/modify', (req, res) => {

    // 1. 验证用户信息是否正确
    verifyAuthorization(req)
        .then(userInfo => {
            let parseWord = unicodeEncode(req.body.word) // !
            let timeNow = dateFormatter(new Date())
            let isApproved = userInfo.group_id === 1 ? 1: 0 // 管理员添加的词条默认就是已经 approved
            let sqlArray = []
            sqlArray.push(`
                        update ${CURRENT_TABLE}
                            set
                                date_modify='${timeNow}',
                                word='${parseWord}',
                                code='${req.body.code}',
                                priority='${req.body.priority}',
                                up='${req.body.up}',
                                down='${req.body.down}',
                                comment='${req.body.comment}',
                                category_id='${req.body.category_id}',
                                user_modify = ${userInfo.uid},
                                approved = ${isApproved}
                            WHERE id='${req.body.id}'
                    `)
            // 除管理员之外，只能操作自己创造的词
            if (userInfo.group_id === 1){ // 管理员时

            } else {
                sqlArray.push(`and user_init = ${userInfo.uid}`)
            }
            getDataFromDB( DB_WUBI, sqlArray, true)
                .then(data => {
                    updateUserLastLoginTime(userInfo.uid)
                    res.send(new ResponseSuccess(data, '修改成功'))
                })
                .catch(err => {
                    res.send(new ResponseError(err, '修改失败'))
                })
        })
        .catch(err => {
            res.send(new ResponseError(err, '无权操作'))
        })
})

router.delete('/delete', (req, res) => {
    // 1. 验证用户信息是否正确
    verifyAuthorization(req)
        .then(userInfo => {
            let sqlArray = []
            sqlArray.push(`
                        DELETE from ${CURRENT_TABLE}
                        WHERE id in (${req.body.ids.join(',')})
                    `)
            // 除管理员之外，只能操作自己创造的词
            if (userInfo.group_id === 1){ // 管理员时

            } else {
                sqlArray.push(`and user_init = ${userInfo.uid}`)
            }

            operate_db_without_return(userInfo.uid, DB_WUBI, DATA_NAME, sqlArray, '删除', res)

        })
        .catch(err => {
            res.send(new ResponseError(err, '无权操作'))
        })
})

// 批量修改词条类别
router.put('/modify-batch', (req, res) => {
    verifyAuthorization(req)
        .then(userInfo => {
            let timeNow = dateFormatter(new Date())
            let sqlArray = [`update ${CURRENT_TABLE} set date_modify='${timeNow}', user_modify=${userInfo.uid}, `]
            // 以下两个不会同时出现，所以不用加中间的 , 了
            if (req.body.hasOwnProperty('category_id')){
                sqlArray.push(`category_id='${req.body.category_id}'`)
            }
            if (req.body.hasOwnProperty('approved')){
                sqlArray.push(`approved='${req.body.approved}'`)
            }
            sqlArray.push(`WHERE id in (${req.body.ids.join(',')})`)
            getDataFromDB( DB_WUBI, sqlArray, true)
                .then(data => {
                    updateUserLastLoginTime(userInfo.uid)
                    res.send(new ResponseSuccess(data, '修改成功'))
                })
                .catch(err => {
                    res.send(new ResponseError(err, '修改失败'))
                })
        })
        .catch(err => {
            res.send(new ResponseError(err, '无权操作'))
        })
})

router.get('/statistic', (req, res) => {})

router.get('/thumbs-up', (req, res) => {})

router.get('/thumbs-down', (req, res) => {})


export default router

