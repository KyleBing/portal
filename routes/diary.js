const express = require('express')
const router = express.Router()
const utility = require('../config/utility')
const ResponseSuccess = require('../response/ResponseSuccess')
const ResponseError = require('../response/ResponseError')


router.get('/list', (req, res, next) => {
    let sqlArray = []
    sqlArray.push(`select * from diaries where uid = ${req.query.uid}`)
    if (req.query.timeStart) sqlArray.push(`and date_modify BETWEEN '${req.query.timeStart}' and '${req.query.timeEnd}'`)
    sqlArray.push(`limit 200`)

    utility.getDataFromDB(sqlArray)
        .then(data => {
            res.send(new ResponseSuccess(data))
        })
        .catch(err => {
            res.send(new ResponseError(err))
        })
})

router.get('/search', (req, res, next) => {
    let startPoint = (req.query.pageNo - 1) * req.query.pageCount // 日记起点

    let sqlArray = []
    sqlArray.push(`SELECT *
                  from diaries 
                  where uid='${req.query.uid}'`)

    // keywords
    let keywords = JSON.parse(req.query.keywords)
    if (keywords.length > 0){
        let keywordStrArray = keywords.map(keyword => `( title like '%${keyword}%' or content like '%${keyword}%')` )
        sqlArray.push(' and ' + keywordStrArray.join(' and ')) // 在每个 categoryString 中间添加 'or'
    }

    // categories
    let categories = JSON.parse(req.query.categories)
    if (categories.length > 0) {
        let categoryStrArray = categories.map(category => `category='${category}'`)
        let tempString = categoryStrArray.join(' or ')
        sqlArray.push(` and (${tempString})`) // 在每个 categoryString 中间添加 'or'
    }

    // share
    if (req.query.filterShared === '1'){
        sqlArray.push(' and is_public = 1')
    }

    // date range
    if (req.query.dateRange){
        let year = req.query.dateRange.substring(0,4)
        let month = req.query.dateRange.substring(4,6)
        sqlArray.push(` and  YEAR(date)='${year}' AND MONTH(date)='${month}'`)
    }

    sqlArray.push(` order by date desc
                  limit ${startPoint}, ${req.query.pageCount}`)

    utility.getDataFromDB(sqlArray)
        .then(data => {
            res.send(new ResponseSuccess(data))
        })
        .catch(err => {
            res.send(new ResponseError(err))
        })
})

router.get('/detail', (req, res, next) => {
    let sqlArray = []
    sqlArray.push(`select * from diaries where id = ${req.query.diaryId}`)
    utility.getDataFromDB(sqlArray, true)
        .then(data => {
            res.send(new ResponseSuccess(data))
        })
        .catch(err => {
            res.send(new ResponseError(err))
        })
})

router.post('/add', (req, res, next) => {
    let sqlArray = []
    // TODO: 添加到 CSDN 关于不同请求中的数据，在 req 中的位置
    // TODO: 处理 title content 进行转义
    let parsedTitle = req.body.title
    let parsedContent = req.body.content
    let timeNow = utility.dateFormatter(new Date())

    sqlArray.push(`
        INSERT into diaries(title,content,category,weather,temperature,temperature_outside,date_create,date_modify,date,uid, is_public )
        VALUES('${parsedTitle}','${parsedContent}','${req.body.category}','${req.body.weather}','${req.body.temperature}','${req.body.temperature_outside}','${timeNow}','${timeNow}','${req.body.date}','${req.body.uid}','${req.body.is_public}')`
    )

    utility.getDataFromDB(sqlArray, true)
        .then(data => {
            res.send(new ResponseSuccess(data))
        })
        .catch(err => {
            res.send(new ResponseError(err))
        })
})
router.put('/modify', (req, res, next) => {
    let parsedTitle = req.body.title
    let parsedContent = req.body.content
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
                diaries.temperature_outside='${req.body.temperature_outside}',
                diaries.is_public='${req.body.is_public}'
            WHERE id='${req.body.id}' and uid='${req.body.uid}'
    `)

    utility.getDataFromDB(sqlArray, true)
        .then(data => {
            res.send(new ResponseSuccess(data))
        })
        .catch(err => {
            res.send(new ResponseError(err))
        })
})

router.delete('/delete', (req, res, next) => {
    let sqlArray = []
    sqlArray.push(`
        DELETE from diaries
        WHERE id='${req.query.diaryId}'
        and uid='${req.query.uid}'
    `)
    utility.getDataFromDB(sqlArray)
        .then(data => {
            if (data.affectedRows > 0) {
                res.send(new ResponseSuccess('', '删除成功'))
            } else {
                res.send(new ResponseError('', '删除失败'))
            }
        })
        .catch(err => {
            res.send(new ResponseError(err))
        })
})




module.exports = router
