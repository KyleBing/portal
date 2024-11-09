"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Response_1 = require("../response/Response");
const configProject_json_1 = __importDefault(require("../../config/configProject.json"));
const utility_1 = require("../utility");
const router = express_1.default.Router();
const DB_NAME = 'diary';
const DATA_NAME = '邀请码';
const CURRENT_TABLE = 'invitations';
const crypto_1 = __importDefault(require("crypto"));
router.get('/list', (req, res) => {
    (0, utility_1.verifyAuthorization)(req)
        .then(userInfo => {
        let sqlArray = [];
        if (userInfo.email === configProject_json_1.default.adminCount) { //
            sqlArray.push(`SELECT * from ${CURRENT_TABLE} where binding_uid is null order by date_create desc ;`);
        }
        else {
            sqlArray.push(`SELECT * from ${CURRENT_TABLE} where binding_uid is null and is_shared = 0 order by date_create desc  ;`);
        }
        (0, utility_1.getDataFromDB)('diary', sqlArray)
            .then(data => {
            (0, utility_1.updateUserLastLoginTime)(userInfo.uid);
            res.send(new Response_1.ResponseSuccess(data, '请求成功'));
        })
            .catch(err => {
            res.send(new Response_1.ResponseError(err, err.message));
        });
    })
        .catch(verified => {
        let sqlArray = [];
        // 获取未分享的可用邀请码
        sqlArray.push(`SELECT * from ${CURRENT_TABLE} where binding_uid is null and is_shared = 0 order by date_create desc ;`);
        (0, utility_1.getDataFromDB)('diary', sqlArray)
            .then(data => {
            res.send(new Response_1.ResponseSuccess(data, '请求成功'));
        })
            .catch(err => {
            res.send(new Response_1.ResponseError(err, err.message));
        });
    });
});
router.post('/generate', (req, res) => {
    (0, utility_1.verifyAuthorization)(req)
        .then(userInfo => {
        if (userInfo.email === configProject_json_1.default.adminCount) { // admin
            let timeNow = (0, utility_1.dateFormatter)(new Date());
            let sqlArray = [];
            crypto_1.default.randomBytes(12, (err, buffer) => {
                let key = buffer.toString('base64');
                sqlArray.push(`
                        insert into 
                            ${CURRENT_TABLE}(date_create, id) 
                            VALUES ('${timeNow}', '${key}')`);
                (0, utility_1.operate_db_and_return_added_id)(userInfo.uid, DB_NAME, DATA_NAME, sqlArray, '生成', res);
            });
        }
        else {
            res.send(new Response_1.ResponseError('', '无权限操作'));
        }
    })
        .catch(err => {
        res.send(new Response_1.ResponseError(err, err));
    });
});
// 标记邀请码为已分享状态
router.post('/mark-shared', (req, res) => {
    (0, utility_1.verifyAuthorization)(req)
        .then(userInfo => {
        if (userInfo.email === configProject_json_1.default.adminCount) { // admin
            let sqlArray = [];
            sqlArray.push(`
                        update ${CURRENT_TABLE} set is_shared = 1 where id = '${req.body.id}' `);
            (0, utility_1.operate_db_and_return_added_id)(userInfo.uid, DB_NAME, DATA_NAME, sqlArray, '标记', res);
        }
        else {
            res.send(new Response_1.ResponseError('', '无权限操作'));
        }
    })
        .catch(err => {
        res.send(new Response_1.ResponseError(err, err));
    });
});
router.delete('/delete', (req, res) => {
    if (!req.query.id) {
        res.send(new Response_1.ResponseError('', '参数错误，缺少 id'));
        return;
    }
    // 1. 验证用户信息是否正确
    (0, utility_1.verifyAuthorization)(req)
        .then(userInfo => {
        if (userInfo.email === configProject_json_1.default.adminCount) {
            let sqlArray = [];
            sqlArray.push(` DELETE from ${CURRENT_TABLE} WHERE id='${req.query.id}' `);
            (0, utility_1.operate_db_and_return_added_id)(userInfo.uid, DB_NAME, DATA_NAME, sqlArray, '添加', res);
        }
        else {
            res.send(new Response_1.ResponseError('', '无权操作'));
        }
    })
        .catch(err => {
        res.send(new Response_1.ResponseError(err, '无权操作'));
    });
});
exports.default = router;
