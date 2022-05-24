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
            sqlArray.push(`SELECT *from diaries where uid='${req.query.uid}' and category = 'bill'`)
            utility.getDataFromDB(sqlArray)
                .then(billDiaryList => {
                    utility.updateUserLastLoginTime(req.query.email)
                    let billResponse = []
                    billDiaryList.reverse().forEach(diary => {
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
