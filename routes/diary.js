const express = require('express')
const router = express.Router()
const utility = require('../config/utility')


router.get('/list', (req, res, next) => {
    let sqlArray = []
    sqlArray.push(`select * from diaries where uid = ${req.query.uid}`)
    if (req.query.timeStart) sqlArray.push(`and date_modify BETWEEN '${req.query.timeStart}' and '${req.query.timeEnd}'`)
    sqlArray.push(`limit 200`)

    utility.getDataFromDB(res, sqlArray)
})

router.get('/detail/:diaryId', (req, res, next) => {
    let sqlArray = []
    sqlArray.push(`select * from diaries where id = ${req.params.diaryId}`)
    utility.getDataFromDB(res, sqlArray, true)
})

router.put('/edit', (req, res, next) => {
    utility.getDataFromDB(res)
})
router.post('/add', (req, res, next) => {
    utility.getDataFromDB(res)
})




module.exports = router
