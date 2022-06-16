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
            sqlArray.push(`SELECT *from diaries where uid='${req.query.uid}' and category = 'bill' order by  date asc`)
            utility.getDataFromDB(sqlArray)
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
                        order by date desc;
                    `)
            }
            sqlRequests.push(utility.getDataFromDB(sqlArray))
            // 这里有个异步运算的弊端，所有结果返回之后，我需要重新给他们排序，因为他们的返回顺序是不定的。难搞哦
            Promise.all(sqlRequests)
                .then(values => {
                    let response = []
                    let afterValues = values[0].filter(item => item.length > 0)
                    afterValues.forEach(daysArray => {
                        response.push({
                            month: daysArray[0].id,
                            count: daysArray.length,
                            days: daysArray.map(item => {
                                return processBillOfDay(item.content, item.date)
                            })
                        })
                    })
                    response.sort((a, b) => a.year > b.year ? 1 : -1)
                    res.send(new ResponseSuccess(response))
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
        let price = Number(itemInfos[1])
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

module.exports = router
