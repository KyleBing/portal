const express = require('express')
const CONFIG_PROJECT = require('../../config/configProject')
const utility = require("../../config/utility");
const ResponseSuccess = require("../../response/ResponseSuccess");
const ResponseError = require("../../response/ResponseError");
const routerWX = express.Router()
const axios = require("axios");

let TEMP_TOKEN = {
    access_token: '',
    expires_in: '',
    expireTimeStamp: 0
}

routerWX.post('/login', (req: Request, res: Response, next) => {
    axios({
        url: 'https://api.weixin.qq.com/sns/jscode2session',
        method: 'GET',
        params:{
            appid: CONFIG_PROJECT.wxMiniAppId,
            secret: CONFIG_PROJECT.wxMiniSecret,
            js_code: req.body.code, // code 是小程序里获取的
            grant_type: 'authorization_code'
        }
    })
        .then(resOpenidObject => {
            res.send(new ResponseSuccess(resOpenidObject.data, '请求成功'))
        })
        .catch(err => {
            res.send(new ResponseError(err, '请求失败'))
        })
})

routerWX.post('/login-with-token', (req: Request, res: Response, next) => {
    getToken()
        .then(token => {
            axios({
                url: 'https://api.weixin.qq.com/sns/jscode2session',
                method: 'GET',
                params:{
                    appid: CONFIG_PROJECT.wxMiniAppId,
                    secret: CONFIG_PROJECT.wxMiniSecret,
                    js_code: req.body.code, // code 是小程序里获取的
                    grant_type: 'authorization_code'
                }
            })
                .then(resOpenidObject => {
                    res.send(new ResponseSuccess(resOpenidObject.data, '请求成功'))
                })
                .catch(err => {
                    res.send(new ResponseError(err, '请求失败'))
                })
        })
        .catch(err => {
            console.log(err)
        })
})

// 获取微信 token
function getToken(){
    return new Promise((resolve, reject) => {
        if (TEMP_TOKEN.expireTimeStamp && (new Date()).getTime() < TEMP_TOKEN.expireTimeStamp){ // 已经存在 token
            console.log('token exist: ', TEMP_TOKEN.access_token)
            resolve(TEMP_TOKEN.access_token)
        } else {
            axios({
                url: 'https://api.weixin.qq.com/cgi-bin/token',
                params: {
                    grant_type: 'client_credential',
                    appid: CONFIG_PROJECT.wxMiniAppId,
                    secret: CONFIG_PROJECT.wxMiniSecret
                }
            })
                .then(res => {
                    TEMP_TOKEN = res.data
                    TEMP_TOKEN.expireTimeStamp = (new Date()).getTime() + res.data.expires_in * 1000
                    console.log('new token: ', TEMP_TOKEN.access_token)
                    resolve(TEMP_TOKEN.access_token)
                })
                .catch(err => {
                    reject(err)
                })
        }
    })

}


export {routerWX}
