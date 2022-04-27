const express = require('express')
const router = express.Router()
const utility = require('../config/utility')
const ResponseSuccess = require("../response/ResponseSuccess");
const ResponseError = require("../response/ResponseError");


router.get('/category', (req, res, next) => {
    if(!req.query.uid || !req.query.token){
        res.send(new ResponseError('参数错误：uid 未定义'))
        return
    }
    let sqlArray = []
    sqlArray.push(`
                select  
                count(case when category='life' then 1 end) as life,
                count(case when category='study' then 1 end) as study,
                count(case when category='film' then 1 end) as film,
                count(case when category='game' then 1 end) as game,
                count(case when category='work' then 1 end) as work,
                count(case when category='sport' then 1 end) as sport,
                count(case when category='bigevent' then 1 end) as bigevent,
                count(case when category='week' then 1 end) as week,
                count(case when category='article' then 1 end) as article,
                count(case when is_public='1' then 1 end) as shared,
                count(*) as amount
                from diaries where uid='${req.query.uid}'
        `)

    utility.getDataFromDB(sqlArray, true)
        .then(data => {
            res.send(new ResponseSuccess(data))
            updateUsersDataCount()
        })
        .catch(err => {
            res.send(new ResponseError(err.message))
        })
})

router.get('/year', (req, res, next) => {
    if(!req.query.uid || !req.query.token){
        res.send(new ResponseError('参数错误：uid 未定义'))
        return
    }
    let yearNow = new Date().getFullYear()
    let sqlRequests = []
    for (let year = 1991; year <= yearNow; year ++){
        let sqlArray = []
        sqlArray.push(`
                select 
                date_format(date,'%Y%m') as id,
                date_format(date,'%m') as month,
                count(*) as 'count'
                from diaries 
                where year(date) = ${year}
                and uid = ${req.query.uid}
                group by month
                order by month desc
        `)
        sqlRequests.push(utility.getDataFromDB(sqlArray))
    }
    // 这里有个异步运算的弊端，所有结果返回之后，我需要重新给他们排序，因为他们的返回顺序是不定的。难搞哦
    Promise.all(sqlRequests)
        .then(values => {
            let response = []
            values.forEach(data => {
                if (data.length > 0) { // 只统计有数据的年份
                    response.push({
                        year: data[0].id.substring(0, 4),
                        count: data.map(item => item.count).reduce((a, b) => a + b),
                        months: data
                    })
                }
            })
            response.sort((a, b) => a.year < b.year ? 1 : -1)
            res.send(new ResponseSuccess(response))
        })
        .catch(err => {
            res.send(new ResponseError(err, err.message))
        })
})


module.exports = router
