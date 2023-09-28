const express = require('express')
const router = express.Router()
const utility = require('../../config/utility')
const ResponseSuccess = require('../../response/ResponseSuccess')
const ResponseError = require('../../response/ResponseError')
const multer = require('multer')
const {adminCount} = require("../../config/configProject");

const uploadLocal = multer({dest: 'upload'}) // 文件存储在服务器的什么位置
const storage = multer.memoryStorage()

const TABLE_NAME = 'wubi_words'

// used for dict init
// 废弃
router.post('/upload', uploadLocal.single('dict'), (req, res, next) => {
    // 1. 验证用户信息是否正确
    utility
        .verifyAuthorization(req)
        .then(userInfo => {
            console.log(req.file)

        })
        .catch(err => {
            res.send(new ResponseError(err, '无权操作'))
        })
})

module.exports = router
