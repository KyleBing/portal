"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Response_1 = require("../response/Response");
const configProject_json_1 = __importDefault(require("../../config/configProject.json"));
const router = express_1.default.Router();
const axios_1 = __importDefault(require("axios"));
let TEMP_TOKEN = {
    access_token: '',
    expires_in: '',
    expireTimeStamp: 0
};
router.post('/login', (req, res) => {
    (0, axios_1.default)({
        url: 'https://api.weixin.qq.com/sns/jscode2session',
        method: 'GET',
        params: {
            appid: configProject_json_1.default.wxMiniAppId,
            secret: configProject_json_1.default.wxMiniSecret,
            js_code: req.body.code, // code 是小程序里获取的
            grant_type: 'authorization_code'
        }
    })
        .then(resOpenidObject => {
        res.send(new Response_1.ResponseSuccess(resOpenidObject.data, '请求成功'));
    })
        .catch(err => {
        res.send(new Response_1.ResponseError(err, '请求失败'));
    });
});
router.post('/login-with-token', (req, res) => {
    getToken()
        .then(_ => {
        (0, axios_1.default)({
            url: 'https://api.weixin.qq.com/sns/jscode2session',
            method: 'GET',
            params: {
                appid: configProject_json_1.default.wxMiniAppId,
                secret: configProject_json_1.default.wxMiniSecret,
                js_code: req.body.code, // code 是小程序里获取的
                grant_type: 'authorization_code'
            }
        })
            .then(resOpenidObject => {
            res.send(new Response_1.ResponseSuccess(resOpenidObject.data, '请求成功'));
        })
            .catch(err => {
            res.send(new Response_1.ResponseError(err, '请求失败'));
        });
    })
        .catch(err => {
        console.log(err);
    });
});
// 获取微信 token
function getToken() {
    return new Promise((resolve, reject) => {
        if (TEMP_TOKEN.expireTimeStamp && (new Date()).getTime() < TEMP_TOKEN.expireTimeStamp) { // 已经存在 token
            console.log('token exist: ', TEMP_TOKEN.access_token);
            resolve(TEMP_TOKEN.access_token);
        }
        else {
            (0, axios_1.default)({
                url: 'https://api.weixin.qq.com/cgi-bin/token',
                params: {
                    grant_type: 'client_credential',
                    appid: configProject_json_1.default.wxMiniAppId,
                    secret: configProject_json_1.default.wxMiniSecret
                }
            })
                .then(res => {
                TEMP_TOKEN = res.data;
                TEMP_TOKEN.expireTimeStamp = (new Date()).getTime() + res.data.expires_in * 1000;
                console.log('new token: ', TEMP_TOKEN.access_token);
                resolve(TEMP_TOKEN.access_token);
            })
                .catch(err => {
                reject(err);
            });
        }
    });
}
exports.default = router;
