const express = require('express')
const router = express.Router()
const utility = require('../config/utility')
const ResponseSuccess = require('../response/ResponseSuccess')
const ResponseError = require('../response/ResponseError')


/**
 * 获取点赞初始计数
 * req.query.key
 */

router.get('/', (req, res, next) => {
    if (req.query.key) {
        let sqlArray = [
            `SELECT *
             from thumbs_up
             where up_key = '${req.query.key}'`
        ]
        utility.getDataFromDB(sqlArray, true)
            .then(thumbsUpResult => {
                res.send(new ResponseSuccess(thumbsUpResult.up_count, '请求成功'))
            })
            .catch(err => {
                res.send(new ResponseError(err, err.message))
            })
    } else {
        res.send(new ResponseError('', 'key 值未定义'))
    }

})


module.exports = router
