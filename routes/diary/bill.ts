import express from "express"
import {ResponseError, ResponseSuccess} from "../../response/Response";
import {
    unicodeDecode,
    getDataFromDB,
    updateUserLastLoginTime,
    verifyAuthorization, processBillOfDay, formatMoney
} from "../../config/utility";
import {BillDay, BillFood, BillItem, BillMonth} from "entity/Bill";
const router = express.Router()


router.get('/', (req, res) => {
    verifyAuthorization(req)
        .then(userInfo => {
            // let startPoint = (req.query.pageNo - 1) * req.query.pageSize // 日记起点
            let sqlArray = []
            sqlArray.push(`SELECT *from diaries where uid='${userInfo.uid}' and category = 'bill' order by date asc`)
            getDataFromDB( 'diary', sqlArray)
                .then(billDiaryList => {
                    updateUserLastLoginTime(userInfo.uid)
                    let billResponse = []

                    billDiaryList.forEach(diary => {
                        // decode unicode
                        billResponse.push(processBillOfDay(diary, []))
                    })
                    res.send(new ResponseSuccess(billResponse, '请求成功'))
                })
                .catch(err => {
                    res.send(new ResponseError(err, err.message))
                })
        })
        .catch(errInfo => {
            res.send(new ResponseError('', errInfo))
        })
})

router.get('/sorted', (req, res) => {
    if (!req.query.years){
        res.send(new ResponseError('', '未选择年份'))
        return
    }
    verifyAuthorization(req)
        .then(userInfo => {
            new Date().getFullYear();
            let sqlRequests = []
            let sqlArray: Array<string>
            (req.query.years as string).split(',').forEach(year => {
                for (let month = 1; month <= 12; month ++ ){
                    sqlArray.push(`
                        select *,
                        date_format(date,'%Y%m') as month_id,
                        date_format(date,'%m') as month
                        from diaries 
                        where year(date) = ${year}
                        and month(date) = ${month}
                        and category = 'bill'
                        and uid = ${userInfo.uid}
                        order by date asc;
                    `)
                }
            })

            sqlRequests.push(getDataFromDB( 'diary', sqlArray))

            // 这里有个异步运算的弊端，所有结果返回之后，我需要重新给他们排序，因为他们的返回顺序是不定的。难搞哦
            Promise
                .all(sqlRequests)
                .then(yearDataArray => {
                    let responseData: BillMonth[] = []
                    let afterValues = yearDataArray[0].filter(item => item.length > 0) // 去掉内容为 0 的年份数据
                    afterValues.forEach(daysArray => {

                        let daysData: Array<BillDay> = []
                        let monthSum = 0
                        let monthSumIncome = 0
                        let monthSumOutput = 0
                        let food: BillFood = {
                            breakfast: 0,    // 早餐
                            launch: 0,       // 午餐
                            dinner: 0,       // 晚饭
                            supermarket: 0,  // 超市
                            fruit: 0,        // 水果
                            sum: 0,          // sum
                        }

                        // 用一次循环处理完所有需要在循环中处理的事：合总额、map DayArray
                        let keywords: string[] = []
                        if (req.query.keyword){
                            keywords = (req.query.keyword as string).split(' ')
                        }
                        daysArray.forEach(diaryDay => {
                            let processedDayData = processBillOfDay(diaryDay, keywords)
                            // 当内容 items 的数量大于 0 时
                            if (processedDayData.items.length > 0){
                                daysData.push(processedDayData)
                                monthSum = monthSum + processedDayData.sum
                                monthSumIncome = monthSumIncome + processedDayData.sumIncome
                                monthSumOutput = monthSumOutput + processedDayData.sumOutput
                                food.breakfast = food.breakfast + processedDayData.items
                                    .filter(item => item.item.indexOf('早餐') > -1)
                                    .reduce((sum,b) => sum || b.price || 0, 0)
                                food.launch = food.launch + processedDayData.items
                                    .filter(item => item.item.indexOf('午餐') > -1)
                                    .reduce((sum,b) => sum || b.price || 0, 0)
                                food.dinner = food.dinner + processedDayData.items
                                    .filter(item => item.item.indexOf('晚餐') > -1)
                                    .reduce((sum,b) => sum || b.price || 0, 0)
                                food.supermarket = food.supermarket + processedDayData.items
                                    .filter(item => item.item.indexOf('超市') > -1)
                                    .reduce((sum,b) => sum || b.price || 0, 0)
                                food.fruit = food.fruit + processedDayData.items
                                    .filter(item => item.item.indexOf('水果') > -1)
                                    .reduce((sum,b) => sum || b.price || 0, 0)
                            }
                        })

                        let billMonthTop5 = getBillMonthTop5(daysData)

                        if (daysData.length > 0){
                            responseData.push({
                                id: daysArray[0].id,
                                month_id: daysArray[0].month_id,
                                month: daysArray[0].month,
                                count: daysArray.length,
                                days: daysData,
                                sum: formatMoney(monthSum),
                                sumIncome: formatMoney(monthSumIncome),
                                sumOutput: formatMoney(monthSumOutput),
                                incomeTop5: billMonthTop5.income,
                                outcomeTop5: billMonthTop5.outcome,
                                food: {
                                    breakfast: formatMoney(food.breakfast),
                                    launch: formatMoney(food.launch),
                                    dinner: formatMoney(food.dinner),
                                    supermarket: formatMoney(food.supermarket),
                                    fruit: formatMoney(food.fruit),
                                    sum: formatMoney(food.breakfast + food.launch + food.dinner + food.supermarket + food.fruit)
                                }
                            })
                        }
                    })
                    // responseData.sort((a, b) => a.year > b.year ? 1 : -1)
                    res.send(new ResponseSuccess(responseData))
                })
                .catch(err => {
                    res.send(new ResponseError(err, err.message))
                })
        })
        .catch(errInfo => {
            res.send(new ResponseError('', errInfo))
        })
})

// 获取每月账单最高的前5个消费项目
function getBillMonthTop5(billDays: Array<BillDay>): {
    outcome: Array<BillItem>
    income: Array<BillItem>
} {
    let tempMonthBillItems: Array<BillItem> = []  // 当前月份的所有 bill[]
    billDays.forEach(billDay => {
        billDay.items.forEach(billItem => {
            tempMonthBillItems.push(billItem)
        })
    })
    tempMonthBillItems.sort((a,b) => a.price > b.price ? 1: -1)

    let billItemsIncome = tempMonthBillItems.filter(item => item.price > 0).sort((a,b) => a.price < b.price ? 1: -1)
    return {
        outcome: tempMonthBillItems.splice(0,5),
        income: billItemsIncome.splice(0,5)
    }
}

router.get('/keys', (req, res) => {
    let currentYear = new Date().getFullYear()
    let years = []
    for(let i=0;i<5;i++){
        years.push( currentYear - i)
    }
    verifyAuthorization(req)
        .then(userInfo => {
            let sqlRequests = []
            let sqlArray = []
            years.forEach(year => {
                for (let month = 1; month <= 12; month ++ ){
                    sqlArray.push(`
                        select *,
                        date_format(date,'%Y%m') as month_id,
                        date_format(date,'%m') as month
                        from diaries 
                        where year(date) = ${year}
                        and month(date) = ${month}
                        and category = 'bill'
                        and uid = ${userInfo.uid}
                        order by date asc;
                    `)
                }
            })

            sqlRequests.push(getDataFromDB( 'diary', sqlArray))
            // 这里有个异步运算的弊端，所有结果返回之后，我需要重新给他们排序，因为他们的返回顺序是不定的。难搞哦
            let BillKeyMap = new Map()

            Promise
                .all(sqlRequests)
                .then(yearDataArray => {
                    // let responseData = []
                    let afterValues = yearDataArray[0].filter(item => item.length > 0) // 去年内容为 0 的年价数据
                    afterValues.forEach(daysArray => {
                        daysArray.forEach(item => {
                            let processedDayData = processBillOfDay(item, [])
                            // 当内容 items 的数量大于 0 时
                            if (processedDayData.items.length > 0){
                                processedDayData.items.forEach(billItem => {
                                    if (BillKeyMap.has(billItem.item)){ // 如果已存在账单项
                                        let count = BillKeyMap.get(billItem.item)
                                        BillKeyMap.set(billItem.item, count + 1)
                                    } else {
                                        BillKeyMap.set(billItem.item, 1) // 初始化为1
                                    }
                                })
                            }
                        })

                    })
                    let billKeyArray = []
                    BillKeyMap.forEach((value,key,map) => {
                        if (BillKeyMap.get(key) >= 1){
                            billKeyArray.push({
                                item: key,
                                value: BillKeyMap.get(key)
                            })
                        }
                    })
                    billKeyArray.sort((a,b) => b.value - a.value)
                    res.send(new ResponseSuccess(billKeyArray))
                })
                .catch(err => {
                    res.send(new ResponseError(err, err.message))
                })
        })
        .catch(errInfo => {
            res.send(new ResponseError('', errInfo))
        })
})

router.get('/day-sum', (req, res) => {
    verifyAuthorization(req)
        .then(userInfo => {
            getDataFromDB('diary', [`select content, date  from diaries where category = 'bill' and uid = '${userInfo.uid}'`])
                .then(billData => {
                    let finalData = billData.map(item => {
                        let originalData = processBillOfDay(item)
                        delete originalData.items
                        delete originalData.sum
                        return originalData
                    })
                    res.send(new ResponseSuccess(finalData, '获取成功'))
                })

        })
        .catch(errInfo => {
            res.send(new ResponseError('', errInfo))
        })
})

router.get('/month-sum', (req, res) => {

    let yearNow = new Date().getFullYear()
    let yearStart = 2018
    let years = []
    for (let i=yearStart; i<=yearNow; i++){
        years.push(i)
    }

    verifyAuthorization(req)
        .then(userInfo => {
            // let yearNow = new Date().getFullYear()
            let sqlRequests = []
            let sqlArray = []
            years.forEach(year => {
                for (let month = 1; month <= 12; month ++ ){
                    sqlArray.push(`
                        select content, date,
                        date_format(date,'%Y%m') as month_id,
                        date_format(date,'%m') as month
                        from diaries 
                        where year(date) = ${year}
                        and month(date) = ${month}
                        and category = 'bill'
                        and uid = ${userInfo.uid}
                        order by date asc;
                    `)
                }
            })

            sqlRequests.push(getDataFromDB( 'diary', sqlArray))
            // 这里有个异步运算的弊端，所有结果返回之后，我需要重新给他们排序，因为他们的返回顺序是不定的。难搞哦
            Promise.all(sqlRequests)
                .then(yearDataArray => {
                    let responseData = []
                    let afterValues = yearDataArray[0].filter(item => item.length > 0) // 去年内容为 0 的年价数据
                    afterValues.forEach(daysArray => {

                        let daysData = []
                        let monthSum = 0
                        let monthSumIncome = 0
                        let monthSumOutput = 0

                        // 用一次循环处理完所有需要在循环中处理的事：合总额、map DayArray
                        let keywords: string[] = []
                        if (req.query.keyword){
                            keywords = (req.query.keyword as string).split(' ')
                        }
                        daysArray.forEach(item => {
                            let processedDayData = processBillOfDay(item, keywords)
                            // 当内容 items 的数量大于 0 时
                            if (processedDayData.items.length > 0){
                                daysData.push(processedDayData)
                                monthSum = monthSum + processedDayData.sum
                                monthSumIncome = monthSumIncome + processedDayData.sumIncome
                                monthSumOutput = monthSumOutput + processedDayData.sumOutput
                            }
                        })

                        if (daysData.length > 0){
                            responseData.push({
                                id: daysArray[0].id,
                                month_id: daysArray[0].month_id,
                                month: daysArray[0].month,
                                count: daysArray.length,
                                sum: formatMoney(monthSum),
                                sumIncome: formatMoney(monthSumIncome),
                                sumOutput: formatMoney(monthSumOutput),
                            })
                        }

                    })
                    responseData.sort((a, b) => a.year > b.year ? 1 : -1)
                    res.send(new ResponseSuccess(responseData))
                })
                .catch(err => {
                    res.send(new ResponseError(err, err.message))
                })
        })
        .catch(errInfo => {
            res.send(new ResponseError('', errInfo))
        })
})

router.get('/borrow', (req, res) => {
    // 1. 验证 token
    verifyAuthorization(req)
        .then(userInfo => {
            let sqlArray = []
            sqlArray.push(`select * from diaries where title = '借还记录' and uid = ${userInfo.uid}`) // 固定 '借还记录' 为标题的日记作为存储借还记录
            // 2. 查询出日记结果
            getDataFromDB( 'diary', sqlArray, true)
                .then(dataDiary => {
                    if (dataDiary) {
                        // decode unicode
                        dataDiary.title = unicodeDecode(dataDiary.title || '')
                        dataDiary.content = unicodeDecode(dataDiary.content || '')

                        // 记录最后访问时间
                        updateUserLastLoginTime(userInfo.uid)
                        res.send(new ResponseSuccess(dataDiary.content))
                    } else {
                        res.send(new ResponseSuccess('', ''))
                    }
                })
                .catch(err => {
                    res.send(new ResponseError(err, err.message))
                })
        })
        .catch(errInfo => {
            res.send(new ResponseError('', errInfo))
        })
})

export default router
