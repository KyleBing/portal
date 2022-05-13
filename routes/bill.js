const express = require('express')
const router = express.Router()
const utility = require('../config/utility')
const ResponseSuccess = require('../response/ResponseSuccess')
const ResponseError = require('../response/ResponseError')


router.post('/demo', (req, res, next) => {
    let str = req.body.content.replace(/ +/g, ' ') // 替换掉所有多个空格的间隔，改为一个空格
    let strArray = str.split('\n').filter(item => item.trim().length > 0)

    let response = {
        items: [],
        sum: 0
    }
    strArray.forEach(item => {
        let itemInfos = item.split(' ')
        let price = Number(itemInfos[1])
        response.items.push({
            item: itemInfos[0],
            price: price
        })
        response.sum = response.sum + price
    })

    res.send(new ResponseSuccess(response, '处理成功'))

})

module.exports = router
