const { exec } = require('child_process')
const configProject = require('../../config/configProject')
const ResponseError = require("../../response/Response");
const utility = require("../../config/utility");
const express = require("express");
const ResponseSuccess = require("../../response/ResponseSuccess");
const router = express.Router()


// 发送邮件
router.post('/send', (req, res, next) => {
    utility
        .verifyAuthorization(req)
        .then(userInfo => {
            if (req.query.email === configProject.adminCount) {
                if (req.body.receiver.length > 0){
                    req.body.receiver.forEach(receiverEmail => {
                        sendEmail(req.body.title, req.body.content, receiverEmail)
                    })
                    res.send(new ResponseSuccess('', '执行完成'))

                } else {
                    res.send(new ResponseError('', '未选择任何收信人'))
                }
            } else {
                res.send(new ResponseError('', '无权操作'))
            }
        })
        .catch(err => {
            res.send(new ResponseError(err, err.message))
        })
})
// 发送邮件给管理员
router.post('/send-to-admin', (req, res, next) => {
    if (!configProject.adminCount) {
        res.send(new ResponseError('后台管理员邮箱未设置'))
        return
    }

    utility
        .verifyAuthorization(req)
        .then(verified => {
            if (req.query.email === configProject.adminCount) {
                sendEmailToAdmin(req.body.title, req.body.content)
                res.send(new ResponseSuccess('', '执行完成'))
            } else {
                res.send(new ResponseError('', '无权操作'))
            }
        })
        .catch(err => {
            res.send(new ResponseError(err, err.message))
        })
})

// 给 n 个用户发邮件
function sendEmail(title, content, receivers){
    exec(` echo "${content}" | mail -s ${title} ${receivers.join(',')}`,(err, stdout, stderr) => {
        if (err){
            console.log('send email fail')
        }
        console.log(stdout)
        console.log(stderr)
    })
}
// 给管理员发送邮件
function sendEmailToAdmin(title, content){
    exec(` echo "${content}" | mail -s ${title} ${configProject.adminCount}`,(err, stdout, stderr) => {
        if (err){
            console.log('send email fail')
        }
        console.log(stdout)
        console.log(stderr)
    })
}

module.exports = router

