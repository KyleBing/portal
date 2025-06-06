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
const configProject_json_1 = __importDefault(require("../../config/configProject.json"));
const utility_1 = require("../utility");
const qiniu_1 = __importDefault(require("qiniu"));
const router = express_1.default.Router();
/**
 * 七牛云图片 处理
 */
const DB_NAME = 'diary';
const DATA_NAME = '七牛云图片';
const CURRENT_TABLE = 'image_qiniu';
// Initialize Qiniu Service
class QiniuService {
    constructor() {
        this.mac = new qiniu_1.default.auth.digest.Mac(configProject_json_1.default.qiniuAccessKey, configProject_json_1.default.qiniuSecretKey);
        this.config = new qiniu_1.default.conf.Config();
        this.bucketManager = new qiniu_1.default.rs.BucketManager(this.mac, this.config);
    }
    getUploadToken(bucket) {
        const putPolicy = new qiniu_1.default.rs.PutPolicy({
            scope: bucket,
            expires: 7200
        });
        return putPolicy.uploadToken(this.mac);
    }
    deleteFile(bucket, key) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                this.bucketManager.delete(bucket, key, (err, respBody, respInfo) => {
                    if (err) {
                        reject(err);
                    }
                    if (respInfo.statusCode === 200) {
                        resolve();
                    }
                    else {
                        reject(new Error(`Delete failed: ${respInfo.statusCode}`));
                    }
                });
            });
        });
    }
    getFileInfo(bucket, key) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                this.bucketManager.stat(bucket, key, (err, respBody, respInfo) => {
                    if (err) {
                        reject(err);
                    }
                    if (respInfo.statusCode === 200) {
                        resolve(respBody);
                    }
                    else {
                        reject(new Error(`Get file info failed: ${respInfo.statusCode}`));
                    }
                });
            });
        });
    }
}
const qiniuService = new QiniuService();
// 生成 token 根据 bucket
router.get('/', (req, res) => {
    if (req.query.bucket) {
        if (req.query.hahaha) {
            res.send(new Response_1.ResponseSuccess(qiniuService.getUploadToken(String(req.query.bucket)), '凭证获取成功'));
        }
        else {
            (0, utility_1.verifyAuthorization)(req)
                .then(() => {
                res.send(new Response_1.ResponseSuccess(qiniuService.getUploadToken(String(req.query.bucket)), '凭证获取成功'));
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
router.get('/list', (req, res) => {
    (0, utility_1.verifyAuthorization)(req)
        .then(userInfo => {
        let filterSqlArray = [];
        filterSqlArray.push('');
        let tempQueryArray = [];
        // keywords
        if (req.query.keywords) {
            let keywords = JSON.parse(String(req.query.keywords));
            console.log(keywords);
            if (keywords.length > 0) {
                let keywordStrArray = keywords.map((keyword) => ` description like '%${keyword}%' ESCAPE '/' `);
                tempQueryArray.push(keywordStrArray.join(' or '));
            }
        }
        // bucket
        if (req.query.bucket) {
            tempQueryArray.push(` bucket = '${req.query.bucket}'`);
        }
        if (tempQueryArray.length > 0) {
            filterSqlArray.push(' where ');
            filterSqlArray.push(tempQueryArray.join(' and '));
        }
        filterSqlArray.push(`order by date_create desc`);
        let promisesAll = [];
        let pointStart = (Number(req.query.pageNo) - 1) * Number(req.query.pageSize);
        promisesAll.push((0, utility_1.getDataFromDB)(DB_NAME, [`SELECT * from ${CURRENT_TABLE} ${filterSqlArray.join('')} limit ${pointStart} , ${req.query.pageSize}`]));
        promisesAll.push((0, utility_1.getDataFromDB)(DB_NAME, [`select count(*) as sum from ${CURRENT_TABLE} ${filterSqlArray.join('')}`], true));
        Promise
            .all(promisesAll)
            .then(([imageList, dataSum]) => {
            (0, utility_1.updateUserLastLoginTime)(userInfo.uid);
            res.send(new Response_1.ResponseSuccess({
                list: imageList,
                pager: {
                    pageSize: Number(req.query.pageSize),
                    pageNo: Number(req.query.pageNo),
                    total: dataSum.sum
                }
            }, '请求成功'));
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
        if (userInfo.email !== configProject_json_1.default.adminCount) {
            return res.send(new Response_1.ResponseError('', '无权操作'));
        }
        (0, utility_1.getDataFromDB)(DB_NAME, [`SELECT * from ${CURRENT_TABLE} where id='${req.body.id}'`], true).then(fileInfo => {
            if (!fileInfo) {
                return res.send(new Response_1.ResponseError('', '文件不存在'));
            }
            qiniuService.deleteFile(fileInfo.bucket, fileInfo.id)
                .then(() => {
                let sqlArray = [];
                sqlArray.push(`
                            delete from ${CURRENT_TABLE} 
                            where id = '${req.body.id}'
                        `);
                (0, utility_1.operate_db_without_return)(userInfo.uid, DB_NAME, DATA_NAME, sqlArray, '删除', res);
            })
                .catch(err => {
                res.send(new Response_1.ResponseError('', err.message));
            });
        }).catch(err => {
            res.send(new Response_1.ResponseError('', err.message));
        });
    })
        .catch(err => {
        res.send(new Response_1.ResponseError('', err.message));
    });
});
// Batch delete endpoint
router.delete('/batch-delete', (req, res) => {
    (0, utility_1.verifyAuthorization)(req)
        .then(userInfo => {
        if (userInfo.email !== configProject_json_1.default.adminCount) {
            return res.send(new Response_1.ResponseError('', '无权操作'));
        }
        const { ids, bucket } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.send(new Response_1.ResponseError('', '无效的删除请求'));
        }
        (0, utility_1.getDataFromDB)(DB_NAME, [`SELECT * from ${CURRENT_TABLE} where id in ('${ids.join("','")}')`]).then(fileInfos => {
            if (!fileInfos || fileInfos.length === 0) {
                return res.send(new Response_1.ResponseError('', '文件不存在'));
            }
            const deletePromises = fileInfos.map(file => qiniuService.deleteFile(file.bucket, file.id));
            Promise.all(deletePromises)
                .then(() => {
                let sqlArray = [];
                sqlArray.push(`
                            delete from ${CURRENT_TABLE} 
                            where id in ('${ids.join("','")}')
                        `);
                (0, utility_1.operate_db_without_return)(userInfo.uid, DB_NAME, DATA_NAME, sqlArray, '批量删除', res);
            })
                .catch(err => {
                res.send(new Response_1.ResponseError('', err.message));
            });
        }).catch(err => {
            res.send(new Response_1.ResponseError('', err.message));
        });
    })
        .catch(err => {
        res.send(new Response_1.ResponseError('', err.message));
    });
});
// Update image description
router.put('/update', (req, res) => {
    (0, utility_1.verifyAuthorization)(req)
        .then(userInfo => {
        if (userInfo.email !== configProject_json_1.default.adminCount) {
            return res.send(new Response_1.ResponseError('', '无权操作'));
        }
        const { id, description } = req.body;
        if (!id || description === undefined) {
            return res.send(new Response_1.ResponseError('', '参数错误'));
        }
        let sqlArray = [];
        sqlArray.push(`
                update ${CURRENT_TABLE} 
                set description = '${description}'
                where id = '${id}'
            `);
        (0, utility_1.operate_db_without_return)(userInfo.uid, DB_NAME, DATA_NAME, sqlArray, '更新', res);
    })
        .catch(err => {
        res.send(new Response_1.ResponseError('', err.message));
    });
});
exports.default = router;
