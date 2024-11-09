"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Response_1 = require("../response/Response");
const utility_1 = require("../utility");
const router = express_1.default.Router();
const multer_1 = __importDefault(require("multer"));
const fs_1 = __importDefault(require("fs"));
const DB_NAME = 'diary';
const DATA_NAME = '文件';
const CURRENT_TABLE = 'file_manager';
const TEMP_FOLDER = 'temp'; // 临时文件存放文件夹
const DEST_FOLDER = 'upload'; // 临时文件存放文件夹
const uploadLocal = (0, multer_1.default)({ dest: TEMP_FOLDER }); // 文件存储在服务器的什么位置
// const storage = multer.memoryStorage()
router.post('/upload', uploadLocal.single('file'), (req, res) => {
    let fileOriginalName = Buffer.from(req.file.originalname, 'latin1').toString('utf-8');
    const destPath = `${DEST_FOLDER}/${fileOriginalName}`;
    (0, utility_1.verifyAuthorization)(req)
        .then(userInfo => {
        let connection = (0, utility_1.getMysqlConnection)(DB_NAME);
        connection.beginTransaction(transactionError => {
            if (transactionError) {
                connection.rollback(rollbackError => {
                    res.send(new Response_1.ResponseError(rollbackError, 'beginTransaction: 事务执行失败，已回滚'));
                });
                connection.end();
            }
            else {
                let timeNow = (0, utility_1.dateFormatter)(new Date());
                let sql = `insert into
                                 ${CURRENT_TABLE}(path, name_original, description, date_create, type, size, uid) 
                                values ('${destPath}', '${fileOriginalName}', '${req.body.note}', '${timeNow}', '${req.file.mimetype}', ${req.file.size}, ${userInfo.uid})`;
                connection.query(sql, [], (queryErr, _) => {
                    if (queryErr) {
                        connection.rollback(_ => {
                            res.send(new Response_1.ResponseError(queryErr, 'query: sql 事务执行失败，已回滚'));
                            connection.end();
                        });
                    }
                    else {
                        fs_1.default.copyFile(req.file.path, `../${destPath}`, fs_1.default.constants.COPYFILE_EXCL, (copyFileError => {
                            if (copyFileError) {
                                connection.rollback(_ => {
                                    fs_1.default.rm(req.file.path, _ => { });
                                    if (copyFileError.code === 'EEXIST') {
                                        res.send(new Response_1.ResponseError('', '文件已存在'));
                                    }
                                    else {
                                        res.send(new Response_1.ResponseError(copyFileError, '上传失败'));
                                    }
                                    connection.end();
                                });
                            }
                            else {
                                fs_1.default.rm(req.file.path, deleteErr => {
                                    if (deleteErr) {
                                        res.send(new Response_1.ResponseError(deleteErr, '服务器临时文件删除失败'));
                                        connection.end();
                                    }
                                    else {
                                        connection.commit(commitError => {
                                            if (commitError) {
                                                connection.rollback(rollbackError => {
                                                    res.send(new Response_1.ResponseError(rollbackError, 'transaction.commit: 事务执行失败，已回滚'));
                                                    connection.end();
                                                });
                                            }
                                            else {
                                                connection.end();
                                                res.send(new Response_1.ResponseSuccess('', '上传成功'));
                                            }
                                        });
                                    }
                                });
                            }
                        }));
                    }
                });
            }
        });
    })
        .catch(errInfo => {
        res.send(new Response_1.ResponseError(errInfo, '无权操作'));
    });
});
router.post('/modify', (req, res) => {
    // 1. 验证用户信息是否正确
    (0, utility_1.verifyAuthorization)(req)
        .then(userInfo => {
        const sqlArray = [`
                                update ${CURRENT_TABLE} set description = '${req.body.description}' 
                                WHERE id='${req.body.fileId}' and uid='${userInfo.uid}'
                            `];
        (0, utility_1.operate_db_without_return)(userInfo.uid, DB_NAME, DATA_NAME, sqlArray, '修改', res);
    })
        .catch(errInfo => {
        res.send(new Response_1.ResponseError('', errInfo));
    });
});
// TODO: 用事务处理
router.delete('/delete', (req, res) => {
    // 1. 验证用户信息是否正确
    (0, utility_1.verifyAuthorization)(req)
        .then(userInfo => {
        (0, utility_1.getDataFromDB)(DB_NAME, [`select * from ${CURRENT_TABLE} where id='${req.body.fileId}'`], true)
            .then(fileInfo => {
            (0, utility_1.getDataFromDB)(DB_NAME, [` DELETE from ${CURRENT_TABLE} WHERE id='${req.body.fileId}' and uid='${userInfo.uid}' `])
                .then(data => {
                if (data.affectedRows > 0) {
                    (0, utility_1.updateUserLastLoginTime)(userInfo.uid);
                    fs_1.default.rm(`../${fileInfo.path}`, { force: true }, errDeleteFile => {
                        if (errDeleteFile) {
                            res.send(new Response_1.ResponseError(errDeleteFile, '删除失败'));
                        }
                        else {
                            res.send(new Response_1.ResponseSuccess('', '删除成功'));
                        }
                    });
                }
                else {
                    res.send(new Response_1.ResponseError('', '删除失败'));
                }
            })
                .catch(err => {
                res.send(new Response_1.ResponseError(err));
            });
        })
            .catch(errQuery => {
            res.send(new Response_1.ResponseError('', errQuery));
        });
    })
        .catch(errInfo => {
        res.send(new Response_1.ResponseError('', errInfo));
    });
});
router.get('/list', (req, res) => {
    (0, utility_1.verifyAuthorization)(req)
        .then(userInfo => {
        let startPoint = (Number(req.query.pageNo) - 1) * Number(req.query.pageSize); // 文件记录起点
        let sqlArray = [];
        sqlArray.push(`SELECT *from ${CURRENT_TABLE} where uid='${userInfo.uid}'`);
        // keywords
        if (req.query.keywords) {
            let keywords = JSON.parse(String(req.query.keywords)).map((item) => (0, utility_1.unicodeEncode)(item));
            console.log(keywords);
            if (keywords.length > 0) {
                let keywordStrArray = keywords.map((keyword) => `( description like '%${keyword}%' ESCAPE '/' `);
                sqlArray.push(' and ' + keywordStrArray.join(' and ')); // 在每个 categoryString 中间添加 'or'
            }
        }
        // date range
        if (req.query.dateFilter) {
            let year = req.query.dateFilter.substring(0, 4);
            let month = req.query.dateFilter.substring(4, 6);
            sqlArray.push(` and  YEAR(date)='${year}' AND MONTH(date)='${month}'`);
        }
        sqlArray.push(` order by date_create desc
                  limit ${startPoint}, ${req.query.pageSize}`);
        (0, utility_1.getDataFromDB)(DB_NAME, sqlArray)
            .then(data => {
            (0, utility_1.updateUserLastLoginTime)(userInfo.uid);
            res.send(new Response_1.ResponseSuccess(data, '请求成功'));
        })
            .catch(err => {
            res.send(new Response_1.ResponseError(err, err.message));
        });
    })
        .catch(errInfo => {
        res.send(new Response_1.ResponseError('', errInfo));
    });
});
exports.default = router;
