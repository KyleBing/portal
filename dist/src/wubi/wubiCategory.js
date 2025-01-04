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
const DB_NAME = 'wubi';
const DB_DIARY = 'diary';
const DATA_NAME = '五笔码表类别';
const CURRENT_TABLE = 'wubi_category';
router.get('/list', (req, res) => {
    (0, utility_1.verifyAuthorization)(req)
        .then(() => {
        // 1. get categories list
        (0, utility_1.getDataFromDB)(DB_NAME, [` select * from ${CURRENT_TABLE} order by sort_id asc`])
            .then(categoryListData => {
            if (categoryListData) {
                // categoryListData = [{"id": 1, "name": "主码表", "sort_id": 1, "date_init": "2022-12-09T08:27:08.000Z"}]
                let tempArray = categoryListData.map(item => {
                    return `count(case when category_id=${item.id} then 1 end) as '${item.id}'`;
                });
                let sqlArray = [];
                sqlArray.push(`
                                select  
                               ${tempArray.join(', ')},
                                count(*) as amount
                                from wubi_words
                        `);
                (0, utility_1.getDataFromDB)(DB_NAME, sqlArray, true)
                    .then(countData => {
                    categoryListData.forEach(category => {
                        category.count = countData[category.id];
                    });
                    res.send(new Response_1.ResponseSuccess(categoryListData));
                })
                    .catch(err => {
                    res.send(new Response_1.ResponseError(err));
                });
            }
            else {
                res.send(new Response_1.ResponseError('', '类别列表查询出错'));
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
router.post('/add', (req, res) => {
    checkCategoryExist(req.body.name)
        .then(dataCategoryExistenceArray => {
        // email 记录是否已经存在
        if (dataCategoryExistenceArray.length > 0) {
            return res.send(new Response_1.ResponseError('', `${DATA_NAME}已存在`));
        }
        else {
            (0, utility_1.verifyAuthorization)(req)
                .then(userInfo => {
                if (userInfo.email === configProject_json_1.default.adminCount) {
                    let timeNow = (0, utility_1.dateFormatter)(new Date());
                    // query.name_en
                    let sqlArray = [];
                    sqlArray.push(`
                                insert into ${CURRENT_TABLE}(name, sort_id, date_init)
                                values ('${req.body.name}', ${req.body.sort_id}, '${timeNow}')`);
                    (0, utility_1.operate_db_and_return_added_id)(userInfo.uid, DB_NAME, DATA_NAME, sqlArray, '添加', res);
                }
                else {
                    res.send(new Response_1.ResponseError('', '无权操作'));
                }
            })
                .catch(err => {
                res.send(new Response_1.ResponseError('', err.message));
            });
        }
    });
});
router.put('/modify', (req, res) => {
    (0, utility_1.verifyAuthorization)(req)
        .then(userInfo => {
        if (userInfo.email === configProject_json_1.default.adminCount) {
            let timeNow = (0, utility_1.dateFormatter)(new Date());
            // query.name_en
            let sqlArray = [];
            sqlArray.push(`
                    update ${CURRENT_TABLE} set 
                    name = '${req.body.name}',
                    sort_id = '${req.body.sort_id}'
                    where id = '${req.body.id}'
                    `);
            (0, utility_1.operate_db_and_return_added_id)(userInfo.uid, DB_NAME, DATA_NAME, sqlArray, '修改', res);
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
            sqlArray.push(` delete from ${CURRENT_TABLE} where id = '${req.body.id}' `);
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
// 检查类别是否存在
function checkCategoryExist(categoryName) {
    let sqlArray = [];
    sqlArray.push(`select * from ${CURRENT_TABLE} where name='${categoryName}'`);
    return (0, utility_1.getDataFromDB)(DB_NAME, sqlArray);
}
exports.default = router;
