import express from "express"
import {ResponseSuccess, ResponseError } from "../../response/Response";
import configProject from "../../config/configProject";
const router = express.Router()
import axios from "axios";

import crypto from "crypto";
import xml2json from "xml2json"

// 临时 access token
let access_token = {
    expires: new Date().getTime(),
    access_token: ''
}



// 微信公众号信息处理
router.post('/', (req, res) => {
    if (checkWxAuthorization(req)){
        // console.log('[ 已验证 ] 请求来自微信')
        let xmlData = ''
        req
            .on('data', data => {
                xmlData += data.toString()
/*                xmlData =
                    `<xml><ToUserName><![CDATA[gh_44543146fe48]]></ToUserName>
                    <FromUserName><![CDATA[oU9gc6M5bCiuL5rSfsCRn5djrtm0]]></FromUserName>
                    <CreateTime>1673838891</CreateTime>
                    <MsgType><![CDATA[text]]></MsgType>
                    <Content><![CDATA[这]]></Content>
                    <MsgId>23963610449099327</MsgId>
                    </xml>`*/
            })
            .on('end', () => {
                let receiveMsg = JSON.parse(xml2json.toJson(xmlData))
                let responseMsg = `<xml>
                                        <ToUserName><![CDATA[${receiveMsg.xml.FromUserName}]]></ToUserName>
                                        <FromUserName><![CDATA[${receiveMsg.xml.ToUserName}]]></FromUserName>
                                        <CreateTime>${new Date().getTime()}</CreateTime>
                                        <MsgType><![CDATA[text]]></MsgType>
                                        <Content><![CDATA[这是后台回复的内容]]></Content>
                                    </xml>`
                res.send (responseMsg)
            })
    } else {
        // console.log('[未验证] 未知来源请求')
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


router.get('/menu/create', (_, res) => {
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


router.get('/access-token', (_, res) => {
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
router.get('/', (req, res) => {
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
