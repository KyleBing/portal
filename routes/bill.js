const express = require('express')
const router = express.Router()
const utility = require('../config/utility')
const ResponseSuccess = require('../response/ResponseSuccess')
const ResponseError = require('../response/ResponseError')


router.get('/', (req, res, next) => {
    utility
        .verifyAuthorization(req)
        .then(verified => {
            // let startPoint = (req.query.pageNo - 1) * req.query.pageCount // 日记起点
            let sqlArray = []
            sqlArray.push(`SELECT *from diaries where uid='${req.query.uid}' and category = 'bill' order by date asc`)
            utility
                .getDataFromDB( 'diary', sqlArray)
                .then(billDiaryList => {
                    utility.updateUserLastLoginTime(req.query.email)
                    let billResponse = []

                    billDiaryList.forEach(diary => {
                        // decode unicode
                        billResponse.push(utility.processBillOfDay(diary.content, diary.date))
                    })
                    res.send(new ResponseSuccess(billResponse, '请求成功'))
                })
                .catch(err => {
                    res.send(new ResponseError(err, err.message))
                })
        })
        .catch(verified => {
            res.send(new ResponseError(verified, '无权查看日记列表：用户信息错误'))
        })
})


router.get('/sorted', (req, res, next) => {
    utility
        .verifyAuthorization(req)
        .then(verified => {
            let yearNow = new Date().getFullYear()
            let sqlRequests = []
            let sqlArray = []
            for (let month = 1; month <= 12; month ++ ){
                sqlArray.push(`
                        select 
                            *,
                        date_format(date,'%Y%m') as id,
                        date_format(date,'%m') as month
                        from diaries 
                        where year(date) = ${req.query.year}
                        and month(date) = ${month}
                        and category = 'bill'
                        and uid = ${req.query.uid}
                        order by date asc;
                    `)
            }
            sqlRequests.push(utility.getDataFromDB( 'diary', sqlArray))
            // 这里有个异步运算的弊端，所有结果返回之后，我需要重新给他们排序，因为他们的返回顺序是不定的。难搞哦
            Promise.all(sqlRequests)
                .then(values => {
                    let responseData = []
                    let afterValues = values[0].filter(item => item.length > 0) // 去年内容为 0 的年价数据
                    afterValues.forEach(daysArray => {

                        let daysData = []
                        let monthSum = 0
                        let monthSumIncome = 0
                        let monthSumOutput = 0
                        let food = {
                            breakfast: 0, // 早餐
                            launch: 0, // 午餐
                            dinner: 0 // 晚饭
                        }

                        // 用一次循环处理完所有需要在循环中处理的事：合总额、map DayArray
                        daysArray.forEach(item => {
                            let processedDayData = utility.processBillOfDay(item.content, item.date)
                            daysData.push(processedDayData)
                            monthSum = monthSum + processedDayData.sum
                            monthSumIncome = monthSumIncome + processedDayData.sumIncome
                            monthSumOutput = monthSumOutput + processedDayData.sumOutput
                            food.breakfast = food.breakfast + processedDayData.items.filter(item => item.item.indexOf('早餐') > -1).reduce((a,b) => a.price || 0 + b.price || 0, 0)
                            food.launch = food.launch + processedDayData.items.filter(item => item.item.indexOf('午餐') > -1).reduce((a,b) => a.price || 0 + b.price || 0, 0)
                            food.dinner = food.dinner + processedDayData.items.filter(item => item.item.indexOf('晚餐') > -1).reduce((a,b) => a.price || 0 + b.price || 0, 0)
                        })

                        responseData.push({
                            id: daysArray[0].id,
                            month: daysArray[0].month,
                            count: daysArray.length,
                            days: daysData,
                            sum: utility.formatMoney(monthSum),
                            sumIncome: utility.formatMoney(monthSumIncome),
                            sumOutput: utility.formatMoney(monthSumOutput),
                            food: {
                                breakfast: utility.formatMoney(food.breakfast),
                                launch: utility.formatMoney(food.launch),
                                dinner: utility.formatMoney(food.dinner),
                                sum: utility.formatMoney(food.breakfast + food.launch + food.dinner)
                            }
                        })
                    })
                    responseData.sort((a, b) => a.year > b.year ? 1 : -1)
                    res.send(new ResponseSuccess(responseData))
                })
                .catch(err => {
                    res.send(new ResponseError(err, err.message))
                })
        })
        .catch(verified => {
            res.send(new ResponseError(verified, '无权查看日记列表：用户信息错误'))
        })
})



module.exports = router
