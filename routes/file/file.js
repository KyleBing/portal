const express = require('express')
const router = express.Router()
const utility = require('../../config/utility')
const ResponseSuccess = require('../../response/ResponseSuccess')
const ResponseError = require('../../response/ResponseError')
const configProject = require("../../config/configProject");

const qiniu = require("qiniu")

/**
 * 七牛云 图片处理
 */

// 生成 token 根据 bucket
router.get('/', (req, res, next) => {
    if (req.query.bucket){
        utility
            .verifyAuthorization(req)
            .then(userInfo => {
                res.send(new ResponseSuccess(getQiniuToken(req.query.bucket), '凭证获取成功'))
            })
            .catch(err => {
                res.send(new ResponseError('', '参数错误'))
            })
    } else {
        res.send(new ResponseError('', '缺少 bucket 参数'))
    }
})

function getQiniuToken(bucket){
    let mac = new qiniu.auth.digest.Mac(configProject.qiniuAccessKey, configProject.qiniuSecretKey);
    const options = {
        scope: bucket
    };
    let putPolicy = new qiniu.rs.PutPolicy(options);
    return putPolicy.uploadToken(mac)
}


module.exports = router
