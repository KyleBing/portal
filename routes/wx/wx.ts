import express from "express"
import {ResponseSuccess, ResponseError } from "@response/Response";
import configProject from "../../config/configProject";
const router = express.Router()

import axios from "axios";

let TEMP_TOKEN = {
    access_token: '',
    expires_in: '',
    expireTimeStamp: 0
}

router.post('/login', (req, res) => {
    axios({
        url: 'https://api.weixin.qq.com/sns/jscode2session',
        method: 'GET',
        params:{
            appid: configProject.wxMiniAppId,
            secret: configProject.wxMiniSecret,
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

router.post('/login-with-token', (req, res) => {
    getToken()
        .then(_ => {
            axios({
                url: 'https://api.weixin.qq.com/sns/jscode2session',
                method: 'GET',
                params:{
                    appid: configProject.wxMiniAppId,
                    secret: configProject.wxMiniSecret,
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
                    appid: configProject.wxMiniAppId,
                    secret: configProject.wxMiniSecret
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


module.exports = router
