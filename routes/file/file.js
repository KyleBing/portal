const express = require('express')
const router = express.Router()
const utility = require('../../config/utility')
const ResponseSuccess = require('../../response/ResponseSuccess')
const ResponseError = require('../../response/ResponseError')
const configProject = require("../../config/configProject");

const qiniu = require("qiniu")

const bucket = 'qrmanager'

/**
 * 七牛云 图片处理
 */


router.get('/', (req, res, next) => {
    utility
        .verifyAuthorization(req)
        .then(userInfo => {
            if (userInfo.email === configProject.adminCount) {
                res.send(new ResponseSuccess(getQiniuToken(), '凭证获取成功'))
            } else {
                res.send(new ResponseError('', '无权操作'))
            }
        })
        .catch(err => {
            res.send(new ResponseError('', '参数错误'))
        })

})

function getQiniuToken(){
    let mac = new qiniu.auth.digest.Mac(configProject.qiniuAccessKey, configProject.qiniuSecretKey);
    const options = {
        scope: bucket
    };
    let putPolicy = new qiniu.rs.PutPolicy(options);
    return putPolicy.uploadToken(mac)
}


module.exports = router
