import {exec} from "node:child_process";
import express from "express"
import {ResponseError, ResponseSuccess} from "../response/Response";
import configProject from "../../config/configProject";
import {
    verifyAuthorization,
} from "../utility";
const router = express.Router()

// 发送邮件
router.post('/send', (req, res) => {
    verifyAuthorization(req)
        .then(_ => {
            if (req.query.email === configProject.adminCount) {
                if (req.body.receiver.length > 0){
                    req.body.receiver.forEach((receiverEmail: Array<string>) => {
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
router.post('/send-to-admin', (req, res) => {
    if (!configProject.adminCount) {
        res.send(new ResponseError('后台管理员邮箱未设置'))
        return
    }

    verifyAuthorization(req)
        .then(_ => {
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
function sendEmail(title: string, content: string, receivers: Array<string>){
    exec(` echo "${content}" | mail -s ${title} ${receivers.join(',')}`,(err, stdout, stderr) => {
        if (err){
            console.log('send email fail')
        }
        console.log(stdout)
        console.log(stderr)
    })
}
// 给管理员发送邮件
function sendEmailToAdmin(title: string, content: string,){
    exec(` echo "${content}" | mail -s ${title} ${configProject.adminCount}`,(err, stdout, stderr) => {
        if (err){
            console.log('send email fail')
        }
        console.log(stdout)
        console.log(stderr)
    })
}

export default router
