"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_child_process_1 = require("node:child_process");
const express_1 = __importDefault(require("express"));
const Response_1 = require("../response/Response");
const configProject_json_1 = __importDefault(require("../../config/configProject.json"));
const utility_1 = require("../utility");
const router = express_1.default.Router();
// 发送邮件
router.post('/send', (req, res) => {
    (0, utility_1.verifyAuthorization)(req)
        .then(_ => {
        if (req.query.email === configProject_json_1.default.adminCount) {
            if (req.body.receiver.length > 0) {
                req.body.receiver.forEach((receiverEmail) => {
                    sendEmail(req.body.title, req.body.content, receiverEmail);
                });
                res.send(new Response_1.ResponseSuccess('', '执行完成'));
            }
            else {
                res.send(new Response_1.ResponseError('', '未选择任何收信人'));
            }
        }
        else {
            res.send(new Response_1.ResponseError('', '无权操作'));
        }
    })
        .catch(err => {
        res.send(new Response_1.ResponseError(err, err.message));
    });
});
// 发送邮件给管理员
router.post('/send-to-admin', (req, res) => {
    if (!configProject_json_1.default.adminCount) {
        res.send(new Response_1.ResponseError('后台管理员邮箱未设置'));
        return;
    }
    (0, utility_1.verifyAuthorization)(req)
        .then(_ => {
        if (req.query.email === configProject_json_1.default.adminCount) {
            sendEmailToAdmin(req.body.title, req.body.content);
            res.send(new Response_1.ResponseSuccess('', '执行完成'));
        }
        else {
            res.send(new Response_1.ResponseError('', '无权操作'));
        }
    })
        .catch(err => {
        res.send(new Response_1.ResponseError(err, err.message));
    });
});
// 给 n 个用户发邮件
function sendEmail(title, content, receivers) {
    (0, node_child_process_1.exec)(` echo "${content}" | mail -s ${title} ${receivers.join(',')}`, (err, stdout, stderr) => {
        if (err) {
            console.log('send email fail');
        }
        console.log(stdout);
        console.log(stderr);
    });
}
// 给管理员发送邮件
function sendEmailToAdmin(title, content) {
    (0, node_child_process_1.exec)(` echo "${content}" | mail -s ${title} ${configProject_json_1.default.adminCount}`, (err, stdout, stderr) => {
        if (err) {
            console.log('send email fail');
        }
        console.log(stdout);
        console.log(stderr);
    });
}
exports.default = router;
