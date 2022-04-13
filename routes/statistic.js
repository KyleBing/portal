const express = require('express')
const router = express.Router()
const utility = require('../config/utility')


router.get('/category', (req, res, next) => {
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

    utility.getDataFromDB(res, sqlArray, true)
})


router.get('/month', (req, res, next) => {
    let sqlArray = []
    sqlArray.push(`
                select 
                date_format(date,'%Y%m') as id,
                date_format(date,'%m') as month,
                count(*) as 'count'
                from diaries 
                where year(date) = ${req.query.year}
                and uid = ${req.query.uid}
                group by month
                order by month desc
        `)

    utility.getDataFromDB(res, sqlArray)
})


module.exports = router
