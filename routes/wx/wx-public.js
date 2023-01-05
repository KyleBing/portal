const express = require('express')
const configProject = require('../../config/configProject')
const utility = require("../../config/utility");
const ResponseSuccess = require("../../response/ResponseSuccess");
const ResponseError = require("../../response/ResponseError");
const router = express.Router()
const axios = require("axios");

const crypto = require('crypto')


// 临时 access token
let access_token = {
    expires: new Date().getTime(),
    access_token: ''
}



// 微信公众号信息处理
router.post('/', (req, res, next) => {
    if (checkWxAuthorization(req)){
        console.log('[已验证] 微信')
        console.log(req.body)
        res.send(true)

        // TODO 始终无法获取到用户发送的信息
    } else {
        console.log('[未验证] 未知来源请求')
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
    return generatedSignature === signature
}


router.get('/menu/create', (req, res, next) => {
    axios({
        method: 'post',
        url: 'https://api.weixin.qq.com/cgi-bin/menu/create',
        params: {
            access_token: getAccessToken()
        },
        data: {
            "button":[
                {
                    "type":"click",
                    "name":"今日歌曲",
                    "key":"V1001_TODAY_MUSIC"
                },
                {
                    "name":"菜单",
                    "sub_button":[
                        {
                            "type":"view",
                            "name":"搜索",
                            "url":"http://www.soso.com/"
                        },
                        {
                            "type":"miniprogram",
                            "name":"wxa",
                            "url":"http://mp.weixin.qq.com",
                            "appid":"wx286b93c14bbf93aa",
                            "pagepath":"pages/lunar/index"
                        },
                        {
                            "type":"click",
                            "name":"赞一下我们",
                            "key":"V1001_GOOD"
                        }]
                }]
        }
    })
        .then(response => {
            res.send(new ResponseSuccess(response, '操作成功'))
        })
        .catch(err => {
            res.send(new ResponseError(err, '操作失败'))
        })
})


router.get('/access-token', (req, res, next) => {
    getAccessToken()
        .then(response => {
            res.send(new ResponseSuccess(response, '获取成功'))
        })
        .catch(err => {
            res.send(new ResponseError(err, '获取失败'))
        })
})


// 获取 ACCESS TOKEN
function getAccessToken(){
    return new Promise((resolve, reject) => {
        if (access_token.expires < new Date().getTime()){ // 已超时
            axios({
                method: 'get',
                url: 'https://api.weixin.qq.com/cgi-bin/token',
                params: {
                    grant_type: 'client_credential',
                    appid: configProject.wxPublicAppId,
                    secret: configProject.wxPublicSecret
                },
            })
                .then(response => {
                    if (response.data.errcode){
                        reject(response.data)
                    } else {
                        resolve(response.data.access_token)
                        // 更新 access_token 数据
                        access_token = {
                            access_token : response.data.access_token,
                            expires: new Date().getTime() + response.data.expires_in * 1000
                        }
                    }
                })
                .catch(err => {
                    reject(err)
                })
        } else {
            resolve(access_token.access_token)
        }
    })
}



// 微信开发者绑定
router.get('/', (req, res, next) => {
    let echostr   = req.query.echostr    // 随机字符串
    if (checkWxAuthorization(req)){
        console.log('[已验证] 微信')
        res.send(echostr)
    } else {
        console.log('[未验证] 未知来源请求')
        res.send(false)
    }
})




module.exports = router
