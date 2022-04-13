const express = require('express')
const router = express.Router()
const utility = require('../config/utility')


router.get('/categories', (req, res, next) => {
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
                count(case when category='article' then 1 end) as article
                from diaries where uid='${req.query.uid}'
        `)

    utility.getDataFromDB(res, sqlArray, true)
})


module.exports = router
