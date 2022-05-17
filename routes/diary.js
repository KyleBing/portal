const express = require('express')
const router = express.Router()
const utility = require('../config/utility')
const ResponseSuccess = require('../response/ResponseSuccess')
const ResponseError = require('../response/ResponseError')


router.get('/list', (req, res, next) => {
    utility.verifyAuthorization(req)
        .then(verified => {
            let startPoint = (req.query.pageNo - 1) * req.query.pageCount // 日记起点

            let sqlArray = []
            sqlArray.push(`SELECT *
                  from diaries 
                  where uid='${req.query.uid}'`)

            // keywords
            if (req.query.keywords){
                let keywords = JSON.parse(req.query.keywords).map(item => utility.unicodeEncode(item))
                console.log(keywords)
                if (keywords.length > 0){
                    let keywordStrArray = keywords.map(keyword => `( title like '%${keyword}%' ESCAPE '/'  or content like '%${keyword}%' ESCAPE '/')` )
                    sqlArray.push(' and ' + keywordStrArray.join(' and ')) // 在每个 categoryString 中间添加 'or'
                }
            }

            // categories
            if (req.query.categories){
                let categories = JSON.parse(req.query.categories)
                if (categories.length > 0) {
                    let categoryStrArray = categories.map(category => `category='${category}'`)
                    let tempString = categoryStrArray.join(' or ')
                    sqlArray.push(` and (${tempString})`) // 在每个 categoryString 中间添加 'or'
                }
            }

            // share
            if (req.query.filterShared === '1'){
                sqlArray.push(' and is_public = 1')
            }

            // date range
            if (req.query.dateFilter){
                let year = req.query.dateFilter.substring(0,4)
                let month = req.query.dateFilter.substring(4,6)
                sqlArray.push(` and  YEAR(date)='${year}' AND MONTH(date)='${month}'`)
            }

            sqlArray.push(` order by date desc
                  limit ${startPoint}, ${req.query.pageCount}`)

            utility.getDataFromDB(sqlArray)
                .then(data => {
                    utility.updateUserLastLoginTime(req.query.email)
                    data.forEach(diary => {
                        // decode unicode
                        diary.title = utility.unicodeDecode(diary.title)
                        diary.content = utility.unicodeDecode(diary.content)
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

router.get('/detail', (req, res, next) => {
    let sqlArray = []
    sqlArray.push(`select * from diaries where id = ${req.query.diaryId}`)
    // 1. 先查询出日记结果
    utility.getDataFromDB(sqlArray, true)
        .then(data => {
            // decode unicode
            data.title = utility.unicodeDecode(data.title)
            data.content = utility.unicodeDecode(data.content)

            // 2. 判断是否为共享日记
            if (data.is_public === 1){
                // 2.1 如果是，直接返回结果，不需要判断任何东西
                res.send(new ResponseSuccess(data))
            } else {
                // 2.2 如果不是，需要判断：当前 email 和 token 是否吻合
                utility.verifyAuthorization(req)
                    .then(verified => {
                        // 3. 判断日记是否属于当前请求用户
                        if (Number(req.query.uid) === data.uid){
                            // 记录最后访问时间
                            utility.updateUserLastLoginTime(req.query.email)
                            res.send(new ResponseSuccess(data))
                        } else {
                            res.send(new ResponseError('','当前用户无权查看该日记：请求用户 ID 与日记归属不匹配'))
                        }
                    })
                    .catch(unverified => {
                        res.send(new ResponseError('','当前用户无权查看该日记：用户信息错误'))
                    })
            }
        })
        .catch(err => {
            res.send(new ResponseError(err.message))
        })
})


router.post('/add', (req, res, next) => {
    // 1. 验证用户信息是否正确
    utility.verifyAuthorization(req)
        .then(userInfo => {
            let sqlArray = []
            let parsedTitle = utility.unicodeEncode(req.body.title) // !
            let parsedContent = utility.unicodeEncode(req.body.content) || ''
            let timeNow = utility.dateFormatter(new Date())
            sqlArray.push(`
                    INSERT into diaries(title, content, category, weather, temperature, temperature_outside, date_create, date_modify, date, uid, is_public )
                    VALUES(
                        '${parsedTitle}','${parsedContent}','${req.body.category}','${req.body.weather}','${req.body.temperature || 18}',
                        '${req.body.temperatureOutside || 18}', '${timeNow}','${timeNow}','${req.body.date}','${req.body.uid}','${req.body.isPublic || 0}')`
            )
            utility.getDataFromDB(sqlArray)
                .then(data => {
                    utility.updateUserLastLoginTime(req.body.email)
                    res.send(new ResponseSuccess({id: data.insertId}, '添加成功')) // 添加成功之后，返回添加后的日记 id
                })
                .catch(err => {
                    res.send(new ResponseError(err.message, '添加失败'))
                })
        })
        .catch(err => {
            res.send(new ResponseError(err.message, '无权操作'))
        })
})

router.put('/modify', (req, res, next) => {

    // 1. 验证用户信息是否正确
    utility.verifyAuthorization(req)
        .then(userInfo => {
            let parsedTitle = utility.unicodeEncode(req.body.title) // !
            let parsedContent = utility.unicodeEncode(req.body.content) || ''
            let timeNow = utility.dateFormatter(new Date())

            let sqlArray = []
            sqlArray.push(`
                        update diaries
                            set
                                diaries.date_modify='${timeNow}',
                                diaries.date='${req.body.date}',
                                diaries.category='${req.body.category}',
                                diaries.title='${parsedTitle}',
                                diaries.content='${parsedContent}',
                                diaries.weather='${req.body.weather}',
                                diaries.temperature='${req.body.temperature}',
                                diaries.temperature_outside='${req.body.temperatureOutside}',
                                diaries.is_public='${req.body.isPublic}'
                            WHERE id='${req.body.id}' and uid='${req.body.uid}'
                    `)

            utility.getDataFromDB(sqlArray, true)
                .then(data => {
                    utility.updateUserLastLoginTime(req.body.email)
                    res.send(new ResponseSuccess(data, '修改成功'))
                })
                .catch(err => {
                    res.send(new ResponseError(err.message, '修改失败'))
                })
        })
        .catch(err => {
            res.send(new ResponseError(err.message, '无权操作'))
        })
})

router.delete('/delete', (req, res, next) => {
    // 1. 验证用户信息是否正确
    utility.verifyAuthorization(req)
        .then(userInfo => {
            let sqlArray = []
            sqlArray.push(`
                        DELETE from diaries
                        WHERE id='${req.query.diaryId}'
                        and uid='${req.query.uid}'
                    `)
            utility.getDataFromDB(sqlArray)
                .then(data => {
                    if (data.affectedRows > 0) {
                        utility.updateUserLastLoginTime(req.body.email)
                        res.send(new ResponseSuccess('', '删除成功'))
                    } else {
                        res.send(new ResponseError('', '删除失败'))
                    }
                })
                .catch(err => {
                    res.send(new ResponseError(err.message))
                })
        })
        .catch(err => {
            res.send(new ResponseError(err.message, '无权操作'))
        })
})


module.exports = router
