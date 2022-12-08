const express = require('express')
const router = express.Router()
const utility = require('../../config/utility')
const ResponseSuccess = require('../../response/ResponseSuccess')
const ResponseError = require('../../response/ResponseError')

const multer = require('multer')
const Dict = require("./Dict")

const uploadLocal = multer({dest: 'upload'})
const storage = multer.memoryStorage()
const uploadStorage = multer({ storage: storage })

const TABLE_NAME = 'wubi_words'


router.post('/upload-dict', uploadStorage.single('dict'), (req, res, next) => {
    // 1. 验证用户信息是否正确
    utility
        .verifyAuthorization(req)
        .then(userInfo => {
            let dict = new Dict(req.file.buffer.toString(), 'temp', 'temp')
            let sqlArray = []
            // let parsedTitle = utility.unicodeEncode(req.body.title) // !
            // let parsedContent = utility.unicodeEncode(req.body.content) || ''
            let timeNow = utility.dateFormatter(new Date())
            dict.wordsOrigin.forEach(word => {
                sqlArray.push(`
                    INSERT into ${TABLE_NAME}(word, code, priority, date_create, comment, uid)
                    VALUES(
                        '${word.word}','${word.code}',${word.priority || 0},'${timeNow}','${word.note}', '${userInfo.uid}');`
                )
            })

            utility
                .getDataFromDB( 'diary', sqlArray)
                .then(data => {
                    utility.updateUserLastLoginTime(userInfo.uid)
                    res.send(new ResponseSuccess(null, '导入词条成功')) // 添加成功之后，返回添加后的日记 id
                })
                .catch(err => {
                    res.send(new ResponseError(err, '导入词条失败'))
                })
        })
        .catch(err => {
            res.send(new ResponseError(err, '无权操作'))
        })
})


router.post('/list', (req, res, next) => {
    /**
     * dateStart
     * dateEnd
     * pageSize
     * pageNo
     */
    utility
        .verifyAuthorization(req)
        .then(userInfo => {
            let sqlBase = `SELECT * from ${TABLE_NAME} `

            let filterArray = []

            // keywords
            if (req.body.keyword){
                let keywords = req.body.keyword.split(' ').map(item => utility.unicodeEncode(item))
                if (keywords.length > 0){
                    let keywordStrArray = keywords.map(keyword => `( word like '%${keyword}%' ESCAPE '/'  or code like '%${keyword}%' ESCAPE '/')` )
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

            if (filterArray.length > 0){
                filterArray.unshift('where')
            }

            let promisesAll = []
            let pointStart = (Number(req.body.pageNo) - 1) * Number(req.body.pageSize)
            promisesAll.push(utility.getDataFromDB(
                'diary',
                [`${sqlBase} ${filterArray.join(' ')}  limit ${pointStart} , ${req.body.pageSize}`])
            )
            promisesAll.push(utility.getDataFromDB(
                'diary',
                [`select count(*) as sum from ${TABLE_NAME} ${filterArray.join(' ')}`], true)
            )

            Promise.all(promisesAll)
                .then(([dataList, dataSum]) => {
                    utility.updateUserLastLoginTime(userInfo.uid)
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
        .catch(verified => {
            res.send(new ResponseError(verified, '无权查看日记列表：用户信息错误'))
        })
})

router.post('/add', (req, res, next) => {
    // 1. 验证用户信息是否正确
    utility
        .verifyAuthorization(req)
        .then(userInfo => {
            let sqlArray = []
            let parseWord = utility.unicodeEncode(req.body.word) // !
            let timeNow = utility.dateFormatter(new Date())
            sqlArray.push(`
                    INSERT into ${TABLE_NAME}(word, code, priority, up, down, date_create, date_modify, comment, uid, category_id )
                    VALUES(
                        '${parseWord}','${req.body.code}','${req.body.priority || 0}','${req.body.up || 0}','${req.body.down || 0}',
                        '${timeNow}','${timeNow}','${req.body.comment}','${userInfo.uid}','${req.body.category_id || 1}')`
            )
            utility
                .getDataFromDB( 'diary', sqlArray)
                .then(data => {
                    utility.updateUserLastLoginTime(userInfo.uid)
                    res.send(new ResponseSuccess({id: data.insertId}, '添加成功')) // 添加成功之后，返回添加后的日记 id
                })
                .catch(err => {
                    res.send(new ResponseError(err, '添加失败'))
                })
        })
        .catch(err => {
            res.send(new ResponseError(err, '无权操作'))
        })
})
router.put('/modify', (req, res, next) => {

    // 1. 验证用户信息是否正确
    utility
        .verifyAuthorization(req)
        .then(userInfo => {
            let parseWord = utility.unicodeEncode(req.body.word) // !
            let timeNow = utility.dateFormatter(new Date())
            let sqlArray = []
            sqlArray.push(`
                        update ${TABLE_NAME}
                            set
                                date_modify='${timeNow}',
                                word='${parseWord}',
                                code='${req.body.code}',
                                priority='${req.body.priority}',
                                up='${req.body.up}',
                                down='${req.body.down}',
                                comment='${req.body.comment}',
                                category_id='${req.body.category_id}'
                            WHERE id='${req.body.id}'
                    `)

            utility
                .getDataFromDB( 'diary', sqlArray, true)
                .then(data => {
                    utility.updateUserLastLoginTime(userInfo.uid)
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
router.delete('/delete', (req, res, next) => {
    // 1. 验证用户信息是否正确
    utility
        .verifyAuthorization(req)
        .then(userInfo => {
            let sqlArray = []
            sqlArray.push(`
                        DELETE from ${TABLE_NAME}
                        WHERE id='${req.body.id}'
                    `)
            utility
                .getDataFromDB( 'diary', sqlArray)
                .then(data => {
                    if (data.affectedRows > 0) {
                        utility.updateUserLastLoginTime(userInfo.uid)
                        res.send(new ResponseSuccess('', '删除成功'))
                    } else {
                        res.send(new ResponseError('', '删除失败'))
                    }
                })
                .catch(err => {
                    res.send(new ResponseError(err,))
                })
        })
        .catch(err => {
            res.send(new ResponseError(err, '无权操作'))
        })
})


router.get('/statistic', (req, res, next) => {})
router.get('/thumbs-up', (req, res, next) => {})
router.get('/thumbs-down', (req, res, next) => {})


module.exports = router
