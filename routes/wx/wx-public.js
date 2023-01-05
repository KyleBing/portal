const express = require('express')
const configProject = require('../../config/configProject')
const utility = require("../../config/utility");
const ResponseSuccess = require("../../response/ResponseSuccess");
const ResponseError = require("../../response/ResponseError");
const router = express.Router()
const axios = require("axios");

const crypto = require('crypto')

// 微信开发者绑定
router.get('/', (req, res, next) => {
    let echostr   = req.query.echostr    // 随机字符串

    if (checkWxAuthorization(req)){
        console.log('请求来源微信')
        res.send(echostr)
    } else {
        console.log('请求来源非微信')
        res.send(false)
    }
})

function checkWxAuthorization(req){
    let signature = req.query.signature  // 微信加密签名
    let timestamp = req.query.timestamp  // 时间戳
    let nonce     = req.query.nonce      // 随机数

    let tempArray = [configProject.wxToken, timestamp, nonce].sort()
    let tempVerifiedStr = tempArray.join('')
    let shasum = crypto.createHash('sha1')
    let generatedSignature = shasum.update(tempVerifiedStr).digest('hex')
    console.log('signature: ', signature)
    console.log('signature.length: ', signature.length)
    console.log('generatedSignature: ', generatedSignature)
    console.log('generatedSignature.length: ', generatedSignature.length)
    console.log( 'generatedSignature === signature: ',generatedSignature === signature)
    return generatedSignature === signature
}





module.exports = router
