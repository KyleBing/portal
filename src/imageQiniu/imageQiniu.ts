import express, { Request, Response, NextFunction } from "express"
import {ResponseError, ResponseSuccess} from "../response/Response";
import configProject from "../../config/configProject.json"
import {
    dateFormatter,
    getDataFromDB, operate_db_and_return_added_id, operate_db_without_return,
    updateUserLastLoginTime,
    verifyAuthorization
} from "../utility";
import qiniu from 'qiniu'
import { EnumUserGroup } from "entity/User";
const router = express.Router()

/**
 * 七牛云图片 处理
 */

const DB_NAME = 'diary'
const DATA_NAME = '七牛云图片'
const CURRENT_TABLE = 'image_qiniu'

// Initialize Qiniu Service
class QiniuService {
    private mac: qiniu.auth.digest.Mac;
    private config: qiniu.conf.Config;
    private bucketManager: qiniu.rs.BucketManager;

    constructor() {
        this.mac = new qiniu.auth.digest.Mac(
            configProject.qiniuAccessKey,
            configProject.qiniuSecretKey
        );
        this.config = new qiniu.conf.Config();
        this.bucketManager = new qiniu.rs.BucketManager(this.mac, this.config);
    }

    getUploadToken(bucket: string): string {
        const putPolicy = new qiniu.rs.PutPolicy({
            scope: bucket,
            expires: 7200
        });
        return putPolicy.uploadToken(this.mac);
    }

    async deleteFile(bucket: string, key: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.bucketManager.delete(bucket, key, (err, respBody, respInfo) => {
                if (err) {
                    reject(err);
                }
                if (respInfo.statusCode === 200) {
                    resolve();
                } else {
                    reject(new Error(`Delete failed: ${respInfo.statusCode}`));
                }
            });
        });
    }

    async getFileInfo(bucket: string, key: string): Promise<any> {
        return new Promise((resolve, reject) => {
            this.bucketManager.stat(bucket, key, (err, respBody, respInfo) => {
                if (err) {
                    reject(err);
                }
                if (respInfo.statusCode === 200) {
                    resolve(respBody);
                } else {
                    reject(new Error(`Get file info failed: ${respInfo.statusCode}`));
                }
            });
        });
    }
}

const qiniuService = new QiniuService();

// 生成 token 根据 bucket
router.get('/', (req, res) => {
    if (req.query.bucket){
        if (req.query.hahaha){
            res.send(new ResponseSuccess(qiniuService.getUploadToken(String(req.query.bucket)), '凭证获取成功'))
        } else {
            verifyAuthorization(req)
                .then(() => {
                    res.send(new ResponseSuccess(qiniuService.getUploadToken(String(req.query.bucket)), '凭证获取成功'))
                })
                .catch(() => {
                    res.send(new ResponseError('', '参数错误'))
                })
        }
    } else {
        res.send(new ResponseError('', '缺少 bucket 参数'))
    }
})

router.get('/list', (req, res) => {
    verifyAuthorization(req)
        .then(userInfo => {
            let filterSqlArray = []
            filterSqlArray.push('')

            let tempQueryArray = []
            // keywords
            if (req.query.keywords){
                let keywords = JSON.parse(String(req.query.keywords))
                console.log(keywords)
                if (keywords.length > 0){
                    let keywordStrArray = keywords.map((keyword: string) => ` description like '%${keyword}%' ESCAPE '/' ` )
                    tempQueryArray.push(keywordStrArray.join(' or '))
                }
            }

            // bucket
            if (req.query.bucket){
                tempQueryArray.push(` bucket = '${req.query.bucket}'`)
            }

            if (tempQueryArray.length > 0){
                filterSqlArray.push(' where ')
                filterSqlArray.push(tempQueryArray.join(' and '))
            }

            filterSqlArray.push(`order by date_create desc`)

            let promisesAll = []

            let pointStart = (Number(req.query.pageNo) - 1) * Number(req.query.pageSize)
            promisesAll.push(getDataFromDB(
                DB_NAME,
                [`SELECT * from ${CURRENT_TABLE} ${filterSqlArray.join('')} limit ${pointStart} , ${req.query.pageSize}`])
            )
            promisesAll.push(getDataFromDB(
                DB_NAME,
                [`select count(*) as sum from ${CURRENT_TABLE} ${filterSqlArray.join('')}` ], true)
            )

            Promise
                .all(promisesAll)
                .then(([imageList, dataSum]) => {
                    updateUserLastLoginTime(userInfo.uid)
                    res.send(new ResponseSuccess({
                        list: imageList,
                        pager: {
                            pageSize: Number(req.query.pageSize),
                            pageNo: Number(req.query.pageNo),
                            total: dataSum.sum
                        }
                    }, '请求成功'))
                })
                .catch(err => {
                    res.send(new ResponseError(err, err.message))
                })
        })
        .catch(verified => {
            res.send(new ResponseError(verified, '无权查看文件列表：用户信息错误'))
        })
})

router.post('/add', (req, res) => {
    verifyAuthorization(req)
        .then(userInfo => {
            if (userInfo.group_id === EnumUserGroup.ADMIN){
                let timeNow = dateFormatter(new Date())
                let sqlArray = []
                sqlArray.push(`
                    insert into ${CURRENT_TABLE}(id, description, date_create, type, bucket, base_url) 
                    values('${req.body.id}', '${req.body.description || ''}', '${timeNow}', '${req.body.type}', '${req.body.bucket}', '${req.body.base_url}')`
                )
                operate_db_and_return_added_id(userInfo.uid, DB_NAME, DATA_NAME, sqlArray, '添加', res)
            } else {
                res.send(new ResponseError('', '无权操作'))
            }
        })
        .catch(err => {
            res.send(new ResponseError('', err.message))
        })
})

router.delete('/delete', (req, res) => {
    verifyAuthorization(req)
        .then(userInfo => {
            if (userInfo.group_id !== EnumUserGroup.ADMIN) {
                return res.send(new ResponseError('', '无权操作'));
            }

            getDataFromDB(
                DB_NAME,
                [`SELECT * from ${CURRENT_TABLE} where id='${req.body.id}'`],
                true
            ).then(fileInfo => {
                if (!fileInfo) {
                    return res.send(new ResponseError('', '文件不存在'));
                }
                qiniuService.deleteFile(fileInfo.bucket, fileInfo.id)
                    .then(() => {
                        let sqlArray = [];
                        sqlArray.push(`
                            delete from ${CURRENT_TABLE} 
                            where id = '${req.body.id}'
                        `);
                        operate_db_without_return(userInfo.uid, DB_NAME, DATA_NAME, sqlArray, '删除', res);
                    })
                    .catch(err => {
                        res.send(new ResponseError('', err.message));
                    });
            }).catch(err => {
                res.send(new ResponseError('', err.message));
            });
        })
        .catch(err => {
            res.send(new ResponseError('', err.message));
        });
})

// Batch delete endpoint
router.delete('/batch-delete', (req, res) => {
    verifyAuthorization(req)
        .then(userInfo => {
            if (userInfo.group_id !== EnumUserGroup.ADMIN) {
                return res.send(new ResponseError('', '无权操作'));
            }

            const { ids, bucket } = req.body;
            if (!Array.isArray(ids) || ids.length === 0) {
                return res.send(new ResponseError('', '无效的删除请求'));
            }

            getDataFromDB(
                DB_NAME,
                [`SELECT * from ${CURRENT_TABLE} where id in ('${ids.join("','")}')`]
            ).then(fileInfos => {
                if (!fileInfos || fileInfos.length === 0) {
                    return res.send(new ResponseError('', '文件不存在'));
                }
                const deletePromises = fileInfos.map(file =>
                    qiniuService.deleteFile(file.bucket, file.id)
                );
                Promise.all(deletePromises)
                    .then(() => {
                        let sqlArray = [];
                        sqlArray.push(`
                            delete from ${CURRENT_TABLE} 
                            where id in ('${ids.join("','")}')
                        `);
                        operate_db_without_return(userInfo.uid, DB_NAME, DATA_NAME, sqlArray, '批量删除', res);
                    })
                    .catch(err => {
                        res.send(new ResponseError('', err.message));
                    });
            }).catch(err => {
                res.send(new ResponseError('', err.message));
            });
        })
        .catch(err => {
            res.send(new ResponseError('', err.message));
        });
})

// Update image description
router.put('/update', (req, res) => {
    verifyAuthorization(req)
        .then(userInfo => {
            if (userInfo.group_id !== EnumUserGroup.ADMIN) {
                return res.send(new ResponseError('', '无权操作'));
            }

            const { id, description } = req.body;
            if (!id || description === undefined) {
                return res.send(new ResponseError('', '参数错误'));
            }

            let sqlArray = [];
            sqlArray.push(`
                update ${CURRENT_TABLE} 
                set description = '${description}'
                where id = '${id}'
            `);
            operate_db_without_return(userInfo.uid, DB_NAME, DATA_NAME, sqlArray, '更新', res);
        })
        .catch(err => {
            res.send(new ResponseError('', err.message));
        });
})

export default router
