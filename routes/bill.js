const express = require('express')
const router = express.Router()
const utility = require('../config/utility')
const ResponseSuccess = require('../response/ResponseSuccess')
const ResponseError = require('../response/ResponseError')


router.get('/', (req, res, next) => {
    utility.verifyAuthorization(req)
        .then(verified => {
            // let startPoint = (req.query.pageNo - 1) * req.query.pageCount // 日记起点
            let sqlArray = []
            sqlArray.push(`SELECT *from diaries where uid='${req.query.uid}' and category = 'bill' order by date asc`)
            utility.getDataFromDB( 'diary', sqlArray)
                .then(billDiaryList => {
                    utility.updateUserLastLoginTime(req.query.email)
                    let billResponse = []

                    billDiaryList.forEach(diary => {
                        // decode unicode
                        billResponse.push(processBillOfDay(diary.content, diary.date))
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
    utility.verifyAuthorization(req)
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
                            let processedDayData = processBillOfDay(item.content, item.date)
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
                            sum: money(monthSum),
                            sumIncome: money(monthSumIncome),
                            sumOutput: money(monthSumOutput),
                            food: {
                                breakfast: money(food.breakfast),
                                launch: money(food.launch),
                                dinner: money(food.dinner),
                                sum: money(food.breakfast + food.launch + food.dinner)
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


// 处理某天的 bill 内容
function processBillOfDay(billContent, date){
    let str = billContent.replace(/ +/g, ' ') // 替换掉所有多个空格的间隔，改为一个空格
    let strArray = str.split('\n').filter(item => item.trim().length > 0)

    let response = {
        date: date,
        items: [],
        sum: 0,
        sumIncome: 0,
        sumOutput: 0
    }
    strArray.forEach(item => {
        let itemInfos = item.split(' ')
        let price = Number(itemInfos[1]) || 0 // 避免账单填写出错的情况
        if (price < 0) {
            response.sumOutput = response.sumOutput + price
        } else {
            response.sumIncome = response.sumIncome + price
        }
        response.sum = response.sum + price

        response.items.push({
            item: itemInfos[0],
            price: price
        })
    })

    return response
}

function money(number){
    return Number(number.toFixed(2))
}

module.exports = router
