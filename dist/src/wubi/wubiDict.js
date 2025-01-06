"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Response_1 = require("../response/Response");
const utility_1 = require("../utility");
const router = express_1.default.Router();
const DB_WUBI = 'wubi';
const DB_DIARY = 'diary';
const DatabaseTableName = 'wubi_dict';
// 下载码表文件
router.get('/pull', (req, res) => {
    // 1. 是否属于系统中的用户
    (0, utility_1.verifyAuthorization)(req)
        .then(userInfo => {
        let sqlArray = [`select * from ${DatabaseTableName} where title = '${req.query.title}' and  uid='${userInfo.uid}'`];
        // 1. 先查询出码表结果
        (0, utility_1.getDataFromDB)(DB_WUBI, sqlArray)
            .then(result => {
            if (result.length > 0) {
                let data = result[0];
                data.title = (0, utility_1.unicodeDecode)(data.title);
                // 记录最后访问时间
                (0, utility_1.updateUserLastLoginTime)(userInfo.uid);
                res.send(new Response_1.ResponseSuccess(data));
            }
            else {
                res.send(new Response_1.ResponseSuccess('', '不存在词库'));
            }
        })
            .catch(err => {
            res.send(new Response_1.ResponseError(err));
        });
    })
        .catch(errInfo => {
        res.send(new Response_1.ResponseError('', errInfo));
    });
});
// 上传码表文件
router.put('/push', (req, res) => {
    let timeNow = (0, utility_1.dateFormatter)(new Date());
    // 1. 是否属于系统中的用户
    (0, utility_1.verifyAuthorization)(req)
        .then((userInfo) => __awaiter(void 0, void 0, void 0, function* () {
        let encodedTitle = (0, utility_1.unicodeEncode)(req.body.title); // encode 是因为，文件名中可能包含 emoji
        // 2. 检测是否存在内容
        let sqlArray = [`select * from ${DatabaseTableName} where title='${encodedTitle}' and uid='${userInfo.uid}'`];
        try {
            const existData = yield (0, utility_1.getDataFromDB)(DB_WUBI, sqlArray);
            // console.log(existData)
            if (existData.length > 0) {
                // update content
                let sqlArray_1 = [];
                sqlArray_1.push(`
                                update ${DatabaseTableName}
                                    set
                                       title='${encodedTitle}',
                                       content='${req.body.content}',
                                       content_size='${req.body.contentSize}',
                                       word_count='${req.body.wordCount}',
                                       date_update='${timeNow}'
                                    WHERE title='${encodedTitle}' and uid='${userInfo.uid}';
                            `);
                sqlArray_1.push(`update users set sync_count=sync_count + 1 WHERE uid='${userInfo.uid}'`);
                (0, utility_1.getDataFromDB)(DB_WUBI, sqlArray_1, true)
                    .then(data => {
                    (0, utility_1.updateUserLastLoginTime)(userInfo.uid);
                    res.send(new Response_1.ResponseSuccess(data, '上传成功'));
                })
                    .catch(err => {
                    res.send(new Response_1.ResponseError(err, '上传失败'));
                });
            }
            else {
                // insert content
                let sqlArray_2 = [];
                sqlArray_2.push(`
                            INSERT into ${DatabaseTableName}(title, content, content_size, word_count, date_init, date_update, comment, uid)
                            VALUES( '${encodedTitle}','${req.body.content}', '${req.body.contentSize}','${req.body.wordCount}','${timeNow}','${timeNow}','','${userInfo.uid}')`);
                (0, utility_1.getDataFromDB)(DB_WUBI, sqlArray_2)
                    .then(data_1 => {
                    (0, utility_1.updateUserLastLoginTime)(userInfo.uid);
                    res.send(new Response_1.ResponseSuccess({ id: data_1.insertId }, '上传成功')); // 添加成功之后，返回添加后的码表 id
                })
                    .catch(err_1 => {
                    res.send(new Response_1.ResponseError(err_1, '上传失败'));
                });
            }
        }
        catch (_a) {
        }
    }))
        .catch(errInfo => {
        res.send(new Response_1.ResponseError('', errInfo));
    });
});
// 检查对应的文件是否存在备份
router.post('/check-backup-exist', (req, res) => {
    // 1. 是否属于系统中的用户
    (0, utility_1.verifyAuthorization)(req)
        .then(userInfo => {
        let sqlArray = [`select id,title,content_size,word_count, date_init, date_update, comment, uid, sync_count from ${DatabaseTableName} where title = '${req.body.fileName}' and  uid='${userInfo.uid}'`];
        // 1. 先查询出码表结果
        (0, utility_1.getDataFromDB)(DB_WUBI, sqlArray, true)
            .then(result => {
            res.send(new Response_1.ResponseSuccess(result, '信息获取成功'));
        })
            .catch(err => {
            res.send(new Response_1.ResponseError(err));
        });
    })
        .catch(errInfo => {
        res.send(new Response_1.ResponseError('', errInfo));
    });
});
exports.default = router;
