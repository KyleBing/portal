"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Response_1 = require("../response/Response");
const utility_1 = require("../utility");
const User_1 = require("entity/User");
const router = express_1.default.Router();
const DB_NAME = 'diary';
const DATA_NAME = '日记类别';
const CURRENT_TABLE = 'diary_category';
router.get('/list', (req, res) => {
    // query.name_en
    let sqlArray = [];
    sqlArray.push(` select * from ${CURRENT_TABLE} order by sort_id asc`);
    (0, utility_1.getDataFromDB)(DB_NAME, sqlArray)
        .then(data => {
        if (data) { // 没有记录时会返回  undefined
            res.send(new Response_1.ResponseSuccess(data));
        }
        else {
            res.send(new Response_1.ResponseError('', `${DATA_NAME}查询错误`));
        }
    })
        .catch(err => {
        res.send(new Response_1.ResponseError(err, err.message));
    });
});
router.post('/add', (req, res) => {
    checkCategoryExist(req.body.name_en)
        .then(dataCategoryExistenceArray => {
        // email 记录是否已经存在
        if (dataCategoryExistenceArray.length > 0) {
            return res.send(new Response_1.ResponseError('', `${DATA_NAME}已存在`));
        }
        else {
            (0, utility_1.verifyAuthorization)(req)
                .then(userInfo => {
                if (userInfo.group_id === User_1.EnumUserGroup.ADMIN) {
                    let timeNow = (0, utility_1.dateFormatter)(new Date());
                    // query.name_en
                    let sqlArray = [];
                    sqlArray.push(`
                                insert into ${CURRENT_TABLE}(name, name_en, color, sort_id, date_init) 
                                values('${req.body.name}', '${req.body.name_en}', '${req.body.color}', '${req.body.sort_id}', '${timeNow}')`);
                    (0, utility_1.operate_db_and_return_added_id)(userInfo.uid, DB_NAME, DATA_NAME, sqlArray, '添加', res);
                }
                else {
                    res.send(new Response_1.ResponseError('', '无权操作'));
                }
            })
                .catch(errInfo => {
                res.send(new Response_1.ResponseError('', errInfo));
            });
        }
    });
});
router.put('/modify', (req, res) => {
    (0, utility_1.verifyAuthorization)(req)
        .then(userInfo => {
        if (userInfo.group_id === User_1.EnumUserGroup.ADMIN) {
            let timeNow = (0, utility_1.dateFormatter)(new Date());
            // query.name_en
            let sqlArray = [];
            sqlArray.push(`
                    update ${CURRENT_TABLE} set 
                    name = '${req.body.name}',
                    count = '${req.body.count}',
                    color = '${req.body.color}',
                    sort_id = ${req.body.sort_id}
                    where name_en = '${req.body.name_en}'
                    `);
            (0, utility_1.operate_db_without_return)(userInfo.uid, DB_NAME, DATA_NAME, sqlArray, '修改', res);
        }
        else {
            res.send(new Response_1.ResponseError('', '无权操作'));
        }
    })
        .catch(errInfo => {
        res.send(new Response_1.ResponseError('', errInfo));
    });
});
router.delete('/delete', (req, res) => {
    (0, utility_1.verifyAuthorization)(req)
        .then(userInfo => {
        if (userInfo.group_id === User_1.EnumUserGroup.ADMIN) {
            // query.name_en
            let sqlArray = [];
            sqlArray.push(` delete from ${CURRENT_TABLE} where name_en = '${req.body.name_en}' `);
            (0, utility_1.operate_db_without_return)(userInfo.uid, DB_NAME, DATA_NAME, sqlArray, '删除', res);
        }
        else {
            res.send(new Response_1.ResponseError('', '无权操作'));
        }
    })
        .catch(errInfo => {
        res.send(new Response_1.ResponseError('', errInfo));
    });
});
// 检查类别是否存在
function checkCategoryExist(categoryName) {
    let sqlArray = [];
    sqlArray.push(`select * from ${CURRENT_TABLE} where name_en='${categoryName}'`);
    return (0, utility_1.getDataFromDB)(DB_NAME, sqlArray);
}
exports.default = router;
