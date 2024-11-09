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
const qiniu_1 = __importDefault(require("qiniu"));
/**
 * 七牛云图片 处理
 */
const DB_NAME = 'diary';
const DATA_NAME = '七牛云图片';
const CURRENT_TABLE = 'image_qiniu';
// 生成 token 根据 bucket
router.get('/', (req, res) => {
    if (req.query.bucket) {
        if (req.query.hahaha) {
            res.send(new Response_1.ResponseSuccess(getQiniuToken(String(req.query.bucket)), '凭证获取成功'));
        }
        else {
            (0, utility_1.verifyAuthorization)(req)
                .then(() => {
                res.send(new Response_1.ResponseSuccess(getQiniuToken(String(req.query.bucket)), '凭证获取成功'));
            })
                .catch(() => {
                res.send(new Response_1.ResponseError('', '参数错误'));
            });
        }
    }
    else {
        res.send(new Response_1.ResponseError('', '缺少 bucket 参数'));
    }
});
function getQiniuToken(bucket) {
    let mac = new qiniu_1.default.auth.digest.Mac(configProject_json_1.default.qiniuAccessKey, configProject_json_1.default.qiniuSecretKey);
    const options = {
        scope: bucket
    };
    let putPolicy = new qiniu_1.default.rs.PutPolicy(options);
    return putPolicy.uploadToken(mac);
}
router.get('/list', (req, res) => {
    (0, utility_1.verifyAuthorization)(req)
        .then(userInfo => {
        // let startPoint = 0
        // if (req.query.pageNo && req.query.pageSize){
        //     startPoint = (Number(req.query.pageNo) - 1) * Number(req.query.pageSize) // 文件起点
        // }
        //
        let sqlArray = [];
        sqlArray.push(`SELECT * from ${CURRENT_TABLE} `);
        let tempQueryArray = [];
        // keywords
        if (req.query.keywords) {
            let keywords = JSON.parse(String(req.query.keywords));
            console.log(keywords);
            if (keywords.length > 0) {
                let keywordStrArray = keywords.map((keyword) => ` description like '%${keyword}%' ESCAPE '/' `);
                tempQueryArray.push(keywordStrArray.join(' or ')); // 在每个 keywords 中间添加 'or'
            }
        }
        // bucket
        if (req.query.bucket) {
            tempQueryArray.push(` bucket = '${req.query.bucket}'`); // 在每个 categoryString 中间添加 'or'
        }
        if (tempQueryArray.length > 0) {
            sqlArray.push(' where ');
            sqlArray.push(tempQueryArray.join(' and '));
        }
        sqlArray.push(`order by date_create desc`);
        (0, utility_1.getDataFromDB)(DB_NAME, sqlArray)
            .then(data => {
            (0, utility_1.updateUserLastLoginTime)(userInfo.uid);
            res.send(new Response_1.ResponseSuccess(data, '请求成功'));
        })
            .catch(err => {
            res.send(new Response_1.ResponseError(err, err.message));
        });
    })
        .catch(verified => {
        res.send(new Response_1.ResponseError(verified, '无权查看文件列表：用户信息错误'));
    });
});
router.post('/add', (req, res) => {
    (0, utility_1.verifyAuthorization)(req)
        .then(userInfo => {
        if (userInfo.email === configProject_json_1.default.adminCount) {
            let timeNow = (0, utility_1.dateFormatter)(new Date());
            // query.name_en
            let sqlArray = [];
            sqlArray.push(`
                                insert into ${CURRENT_TABLE}(id, description, date_create, type, bucket, base_url) 
                                values('${req.body.id}', '${req.body.description || ''}', '${timeNow}', '${req.body.type}', '${req.body.bucket}', '${req.body.base_url}')`);
            (0, utility_1.operate_db_and_return_added_id)(userInfo.uid, DB_NAME, DATA_NAME, sqlArray, '添加', res);
        }
        else {
            res.send(new Response_1.ResponseError('', '无权操作'));
        }
    })
        .catch(err => {
        res.send(new Response_1.ResponseError('', err.message));
    });
});
router.delete('/delete', (req, res) => {
    (0, utility_1.verifyAuthorization)(req)
        .then(userInfo => {
        if (userInfo.email === configProject_json_1.default.adminCount) {
            let sqlArray = [];
            sqlArray.push(`
                    delete from ${CURRENT_TABLE} 
                               where id = '${req.body.id}'
                    `);
            (0, utility_1.operate_db_without_return)(userInfo.uid, DB_NAME, DATA_NAME, sqlArray, '删除', res);
        }
        else {
            res.send(new Response_1.ResponseError('', '无权操作'));
        }
    })
        .catch(err => {
        res.send(new Response_1.ResponseError('', err.message));
    });
});
exports.default = router;
