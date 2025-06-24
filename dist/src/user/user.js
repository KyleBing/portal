"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const configProject_json_1 = __importDefault(require("../../config/configProject.json"));
const Response_1 = require("../response/Response");
const utility_1 = require("../utility");
const router = express_1.default.Router();
const DB_NAME = 'diary';
const DATA_NAME = '用户';
const CURRENT_TABLE = 'users';
const bcrypt_1 = __importDefault(require("bcrypt"));
/* GET users listing. */
router.post('/register', (req, res) => {
    // TODO: 验证传过来的数据库必填项
    if (req.body.invitationCode === configProject_json_1.default.invitation_code) { // 万能全局邀请码
        registerUser(req, res);
    }
    else {
        (0, utility_1.getDataFromDB)(DB_NAME, [`select * from invitations where id = '${req.body.invitationCode}'`], true)
            .then(result => {
            if (result) {
                if (result.binding_uid) {
                    res.send(new Response_1.ResponseError('', '邀请码已被使用'));
                }
                else {
                    registerUser(req, res);
                }
            }
            else {
                res.send(new Response_1.ResponseError('', '邀请码无效'));
            }
        })
            .catch(err => {
            res.send(new Response_1.ResponseError(err, '数据库请求出错'));
        });
    }
});
function registerUser(req, res) {
    checkEmailOrUserNameExist(req.body.email, req.body.username)
        .then(dataEmailExistArray => {
        // email 记录是否已经存在
        if (dataEmailExistArray.length > 0) {
            return res.send(new Response_1.ResponseError('', '邮箱或用户名已被注册'));
        }
        else {
            let sqlArray = [];
            let timeNow = (0, utility_1.dateFormatter)(new Date());
            // 明文密码通过 bcrypt 加密，对比密码也是通过  bcrypt
            bcrypt_1.default.hash(req.body.password, 10, (err, encryptPassword) => {
                sqlArray.push(
                // 注册的用户默认为普通用户
                `insert into ${CURRENT_TABLE}(email, nickname, username, password, register_time, last_visit_time, comment, 
                                                wx, phone, homepage, gaode, group_id)
                                    VALUES (
                                    '${req.body.email}', 
                                    '${req.body.nickname || ''}', 
                                    '${req.body.username || ''}', 
                                    '${encryptPassword}', 
                                    '${timeNow}',
                                    '${timeNow}',
                                    '${req.body.comment || ''}', 
                                    '${req.body.wx || ''}', 
                                    '${req.body.phone || ''}', 
                                    '${req.body.homepage || ''}', 
                                    '${req.body.gaode || ''}', 
                                    '2'
                                    )`);
                (0, utility_1.getDataFromDB)(DB_NAME, sqlArray)
                    .then(data => {
                    let lastInsertedUid = data.insertId;
                    (0, utility_1.getDataFromDB)(DB_NAME, [`update invitations set binding_uid = ${lastInsertedUid}, date_register = '${timeNow}' where id = '${req.body.invitationCode}'`])
                        .then(resInvitation => {
                        res.send(new Response_1.ResponseSuccess('', '注册成功'));
                    })
                        .catch(err => {
                        res.send(new Response_1.ResponseError('', '注册成功，邀请码信息更新失败'));
                    });
                })
                    .catch(err => {
                    res.send(new Response_1.ResponseError('', '注册失败'));
                });
            });
        }
    })
        .catch(errEmailExist => {
        console.log(errEmailExist);
        res.send(new Response_1.ResponseError(errEmailExist, '查询出错'));
    });
}
// 检查用户名或邮箱是否存在
function checkEmailOrUserNameExist(email, username) {
    let sqlArray = [];
    sqlArray.push(`select * from ${CURRENT_TABLE} where email='${email}' or username ='${username}'`);
    return (0, utility_1.getDataFromDB)(DB_NAME, sqlArray);
}
router.post('/list', (req, res) => {
    (0, utility_1.verifyAuthorization)(req)
        .then(userInfo => {
        let promisesAll = [];
        let pointStart = (Number(req.body.pageNo) - 1) * Number(req.body.pageSize);
        if (userInfo.group_id === 1) {
            // admin user
            promisesAll.push((0, utility_1.getDataFromDB)(DB_NAME, [`SELECT * from ${CURRENT_TABLE} limit ${pointStart} , ${req.body.pageSize}`]));
            promisesAll.push((0, utility_1.getDataFromDB)(DB_NAME, [`select count(*) as sum from ${CURRENT_TABLE}`], true));
        }
        else {
            // normal user
            promisesAll.push((0, utility_1.getDataFromDB)(DB_NAME, [`SELECT * from ${CURRENT_TABLE} where uid = '${userInfo.uid}' limit ${pointStart} , ${req.body.pageSize}`]));
            promisesAll.push((0, utility_1.getDataFromDB)(DB_NAME, [`select count(*) as sum from ${CURRENT_TABLE} where uid = '${userInfo.uid}' `], true));
        }
        Promise
            .all(promisesAll)
            .then(([userList, dataSum]) => {
            (0, utility_1.updateUserLastLoginTime)(userInfo.uid);
            userList.forEach(diary => {
                // decode unicode
                diary.title = (0, utility_1.unicodeDecode)(diary.title);
                diary.content = (0, utility_1.unicodeDecode)(diary.content);
            });
            res.send(new Response_1.ResponseSuccess({
                list: userList,
                pager: {
                    pageSize: Number(req.body.pageSize),
                    pageNo: Number(req.body.pageNo),
                    total: dataSum.sum
                }
            }, '请求成功'));
        })
            .catch(err => {
            res.send(new Response_1.ResponseError(err, err.message));
        });
    })
        .catch(errInfo => {
        res.send(new Response_1.ResponseError('', errInfo));
    });
});
router.get('/detail', (req, res) => {
    let sqlArray = [];
    sqlArray.push(`select * from qrs where hash = '${req.query.hash}'`);
    (0, utility_1.getDataFromDB)(DB_NAME, sqlArray, true)
        .then(data => {
        // decode unicode
        data.message = (0, utility_1.unicodeDecode)(data.message);
        data.description = (0, utility_1.unicodeDecode)(data.description);
        // 2. 判断是否为共享 QR
        if (data.is_public === 1) {
            // 2.1 如果是，直接返回结果，不需要判断任何东西
            res.send(new Response_1.ResponseSuccess(data));
        }
        else {
            // 2.2 如果不是，需要判断：当前 email 和 token 是否吻合
            (0, utility_1.verifyAuthorization)(req)
                .then(userInfo => {
                // 3. 判断 QR 是否属于当前请求用户
                if (Number(userInfo.uid) === data.uid) {
                    // 记录最后访问时间
                    (0, utility_1.updateUserLastLoginTime)(userInfo.uid);
                    /*                            // TODO:过滤可见信息 自己看，管理员看，其它用户看
                                                if (data.is_show_wx){
                                                    data.wx = ''
                                                }
                                                if (data.is_show_car){
                                                    data.car = ''
                                                    data.car_desc = ''
                                                    data.car_plate = ''
                                                }
                                                if (data.is_show_gaode){
                                                    data.gaode = ''
                                                }
                                                if (data.is_show_homepage){
                                                    data.homepage = ''
                                                }*/
                    res.send(new Response_1.ResponseSuccess(data));
                }
                else {
                    res.send(new Response_1.ResponseError('', '当前用户无权查看该 QR ：请求用户 ID 与 QR 归属不匹配'));
                }
            })
                .catch(errInfo => {
                res.send(new Response_1.ResponseError('', errInfo));
            });
        }
    })
        .catch(err => {
        res.send(new Response_1.ResponseError(err, err.message));
    });
});
router.get('/avatar', (req, res) => {
    let sqlArray = [];
    sqlArray.push(`select avatar from ${CURRENT_TABLE} where email = '${req.query.email}'`);
    (0, utility_1.getDataFromDB)(DB_NAME, sqlArray, true)
        .then(data => {
        res.send(new Response_1.ResponseSuccess(data));
    })
        .catch(err => {
        res.send(new Response_1.ResponseError(err, err.message));
    });
});
router.post('/add', (req, res) => {
    checkEmailOrUserNameExist(req.body.email, req.body.username)
        .then(dataEmailExistArray => {
        // email 记录是否已经存在
        if (dataEmailExistArray.length > 0) {
            return res.send(new Response_1.ResponseError('', '邮箱或用户名已被注册'));
        }
        else {
            let sqlArray = [];
            let timeNow = (0, utility_1.dateFormatter)(new Date());
            // 明文密码通过 bcrypt 加密，对比密码也是通过  bcrypt
            bcrypt_1.default.hash(req.body.password, 10, (err, encryptPassword) => {
                sqlArray.push(`insert into ${CURRENT_TABLE}(email, nickname, username, password, register_time, last_visit_time, comment, 
                                                wx, phone, homepage, gaode, group_id)
                                    VALUES (
                                    '${req.body.email}', 
                                    '${req.body.nickname}', 
                                    '${req.body.username}', 
                                    '${encryptPassword}', 
                                    '${timeNow}',
                                    '${timeNow}',
                                    '${req.body.comment || ''}', 
                                    '${req.body.wx}', 
                                    '${req.body.phone}', 
                                    '${req.body.homepage}', 
                                    '${req.body.gaode}', 
                                    '${req.body.group_id}'
                                    )`);
                (0, utility_1.getDataFromDB)(DB_NAME, sqlArray)
                    .then(data => {
                    res.send(new Response_1.ResponseSuccess('', '用户添加成功'));
                })
                    .catch(err => {
                    res.send(new Response_1.ResponseError(err, '用户添加失败'));
                });
            });
        }
    })
        .catch(errEmailExist => {
        console.log(errEmailExist);
        res.send(new Response_1.ResponseError(errEmailExist, '查询出错'));
    });
});
// 检查用户名或邮箱是否存在
function checkHashExist(username, email) {
    let sqlArray = [];
    sqlArray.push(`select * from ${CURRENT_TABLE} where username ='${username.toLowerCase()}' or email = '${email}'`);
    return (0, utility_1.getDataFromDB)(DB_NAME, sqlArray);
}
// 设置用户资料：昵称，avatar，手机号
router.put('/set-profile', (req, res) => {
    // 1. 验证用户信息是否正确
    (0, utility_1.verifyAuthorization)(req)
        .then(userInfo => {
        if (userInfo.email === 'test@163.com') {
            res.send(new Response_1.ResponseError('', '演示帐户不允许修改资料哦'));
            return;
        }
        let avatar = req.body.avatar || '';
        let sqlArray = [];
        sqlArray.push(`
                update ${CURRENT_TABLE}
                set ${CURRENT_TABLE}.nickname       = '${req.body.nickname}',
                    ${CURRENT_TABLE}.phone          = '${req.body.phone}',
                    ${CURRENT_TABLE}.avatar         = '${avatar}',
                    ${CURRENT_TABLE}.city           = '${req.body.city}',
                    ${CURRENT_TABLE}.geolocation    = '${req.body.geolocation}'
                    WHERE uid = '${userInfo.uid}'
            `);
        (0, utility_1.getDataFromDB)(DB_NAME, sqlArray, true)
            .then(data => {
            (0, utility_1.updateUserLastLoginTime)(userInfo.uid);
            (0, utility_1.verifyAuthorization)(req)
                .then(newUserInfo => {
                res.send(new Response_1.ResponseSuccess(newUserInfo, '修改成功'));
            });
        })
            .catch(err => {
            res.send(new Response_1.ResponseError(err, '修改失败'));
        });
    })
        .catch(err => {
        res.send(new Response_1.ResponseError(err, '无权操作'));
    });
});
router.put('/modify', (req, res) => {
    // 1. 验证用户信息是否正确
    (0, utility_1.verifyAuthorization)(req)
        .then(userInfo => {
        if (userInfo.group_id === 1) {
            operateUserInfo(req, res, userInfo);
        }
        else {
            if (userInfo.uid !== req.body.uid) {
                res.send(new Response_1.ResponseError('', '你无权操作该用户信息'));
            }
            else {
                operateUserInfo(req, res, userInfo);
            }
        }
    })
        .catch(err => {
        res.send(new Response_1.ResponseError(err, '无权操作'));
    });
});
function operateUserInfo(req, res, userInfo) {
    let sqlArray = [];
    sqlArray.push(`
                update ${CURRENT_TABLE}
                    set
                            ${CURRENT_TABLE}.email = '${req.body.email}', 
                            ${CURRENT_TABLE}.nickname = '${req.body.nickname}', 
                            ${CURRENT_TABLE}.username = '${req.body.username}', 
                            ${CURRENT_TABLE}.comment = '${req.body.comment || ''}', 
                            ${CURRENT_TABLE}.wx = '${req.body.wx}', 
                            ${CURRENT_TABLE}.phone = '${req.body.phone}', 
                            ${CURRENT_TABLE}.homepage = '${req.body.homepage}', 
                            ${CURRENT_TABLE}.gaode = '${req.body.gaode}', 
                            ${CURRENT_TABLE}.group_id = '${req.body.group_id}'
                    WHERE uid='${req.body.uid}'
            `);
    (0, utility_1.getDataFromDB)(DB_NAME, sqlArray, true)
        .then(data => {
        (0, utility_1.updateUserLastLoginTime)(userInfo.uid);
        res.send(new Response_1.ResponseSuccess(data, '修改成功'));
    })
        .catch(err => {
        res.send(new Response_1.ResponseError(err, '修改失败'));
    });
}
router.delete('/delete', (req, res) => {
    // 1. 验证用户信息是否正确
    (0, utility_1.verifyAuthorization)(req)
        .then(userInfo => {
        if (userInfo.group_id === 1) {
            let sqlArray = [];
            sqlArray.push(`
                        DELETE from ${CURRENT_TABLE}
                        WHERE uid='${req.body.uid}'
                    `);
            (0, utility_1.operate_db_without_return)(userInfo.uid, DB_NAME, DATA_NAME, sqlArray, '删除', res);
        }
        else {
            res.send(new Response_1.ResponseError('', '无权操作'));
        }
    })
        .catch(err => {
        res.send(new Response_1.ResponseError(err, '无权操作'));
    });
});
router.post('/login', (req, res) => {
    let sqlArray = [];
    sqlArray.push(`select * from ${CURRENT_TABLE} where email = '${req.body.email}'`);
    (0, utility_1.getDataFromDB)(DB_NAME, sqlArray, true)
        .then(data => {
        if (data) {
            bcrypt_1.default.compare(req.body.password, data.password, function (err, isPasswordMatch) {
                if (isPasswordMatch) {
                    (0, utility_1.updateUserLastLoginTime)(req.body.email);
                    res.send(new Response_1.ResponseSuccess(data, '登录成功'));
                }
                else {
                    res.send(new Response_1.ResponseError('', '用户名或密码错误'));
                }
            });
        }
        else {
            res.send(new Response_1.ResponseError('', '无此用户'));
        }
    })
        .catch(err => {
        res.send(new Response_1.ResponseError('', err.message));
    });
});
// 修改密码
router.put('/change-password', (req, res) => {
    if (!req.body.password) {
        res.send(new Response_1.ResponseError('', '参数错误：password 未定义'));
        return;
    }
    (0, utility_1.verifyAuthorization)(req)
        .then(userInfo => {
        if (userInfo.email === 'test@163.com') {
            res.send(new Response_1.ResponseError('', '演示帐户密码不允许修改'));
            return;
        }
        bcrypt_1.default.hash(req.body.password, 10, (err, encryptPasswordNew) => {
            let sqlArray = [`update ${CURRENT_TABLE} set password = '${encryptPasswordNew}' where email='${userInfo.email}'`];
            (0, utility_1.operate_db_and_return_added_id)(userInfo.uid, DB_NAME, DATA_NAME, sqlArray, '修改密码', res);
        });
    })
        .catch(err => {
        res.send(new Response_1.ResponseError(err, '无权操作'));
    });
});
// 注销帐号
router.delete('/destroy-account', (req, res) => {
    (0, utility_1.verifyAuthorization)(req)
        .then(userInfo => {
        // 演示帐户时不允许执行注销操作
        if (userInfo.email === 'test@163.com') {
            res.send(new Response_1.ResponseError('', '演示帐户不允许执行此操作'));
            return;
        }
        let connection = (0, utility_1.getMysqlConnection)(DB_NAME);
        connection.beginTransaction(transactionError => {
            if (transactionError) {
                connection.rollback(err => {
                    res.send(new Response_1.ResponseError('', 'beginTransaction: 事务执行失败，已回滚'));
                });
                connection.end();
            }
            else {
                let sql = `
                                delete from diaries where uid = ${userInfo.uid}; 
                                delete from invitations where binding_uid = ${userInfo.uid}; 
                                delete from map_pointer where uid = ${userInfo.uid}; 
                                delete from map_route where uid = ${userInfo.uid}; 
                                delete from map_route where uid = ${userInfo.uid}; 
                                delete from qrs where uid = ${userInfo.uid}; 
                                delete from ${CURRENT_TABLE} where uid = ${userInfo.uid}; 
                                `;
                connection.query(sql, [], (queryErr, result) => {
                    if (queryErr) {
                        connection.rollback(err => {
                            res.send(new Response_1.ResponseError(queryErr, 'query: 事务执行失败，已回滚'));
                        });
                        // res.send(new ResponseError(err, '数据库请求错误'))
                    }
                    else {
                        connection.commit(commitError => {
                            if (commitError) {
                                connection.rollback(err => {
                                    res.send(new Response_1.ResponseError(err, 'transaction.commit: 事务执行失败，已回滚'));
                                });
                            }
                            else {
                                res.send(new Response_1.ResponseSuccess(result, '事务执行成功'));
                            }
                        });
                    }
                    connection.end();
                });
            }
        });
    })
        .catch(errInfo => {
        res.send(new Response_1.ResponseError('null', errInfo));
    });
});
exports.default = router;
