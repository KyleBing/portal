import { exec } from "child_process"
import {CONFIG_PROJECT} from "../../config/config"
import {verifyAuthorization} from "../../config/utility";
import express = require("express")
import {Response, Request} from "express";
import {ResponseError} from "../../response/ResponseError";
import {ResponseSuccess} from "../../response/ResponseSuccess";
const routerMail = express.Router()


// 发送邮件
routerMail.post('/send', (req: Request, res: Response, next) => {
    verifyAuthorization(req)
        .then(userInfo => {
            if (req.query.email === CONFIG_PROJECT.adminCount) {
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
routerMail.post('/send-to-admin', (req: Request, res: Response, next) => {
    if (!CONFIG_PROJECT.adminCount) {
        res.send(new ResponseError('后台管理员邮箱未设置'))
        return
    }

    verifyAuthorization(req)
        .then(verified => {
            if (req.query.email === CONFIG_PROJECT.adminCount) {
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
    exec(` echo "${content}" | mail -s ${title} ${CONFIG_PROJECT.adminCount}`,(err, stdout, stderr) => {
        if (err){
            console.log('send email fail')
        }
        console.log(stdout)
        console.log(stderr)
    })
}

export {routerMail}

