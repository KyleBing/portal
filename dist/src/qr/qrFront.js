"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Response_1 = require("../response/Response");
const utility_1 = require("../utility");
const router = express_1.default.Router();
const DB_NAME = 'diary';
const DATA_NAME = '二维码';
const CURRENT_TABLE = 'qrs';
router.get('/', (req, res) => {
    // query.hash
    let sqlArray = [];
    sqlArray.push(`
            select ${CURRENT_TABLE}.hash,
                   ${CURRENT_TABLE}.is_public,
                   ${CURRENT_TABLE}.is_show_phone,
                   ${CURRENT_TABLE}.message,
                   ${CURRENT_TABLE}.car_name,
                   ${CURRENT_TABLE}.car_plate,
                   ${CURRENT_TABLE}.car_desc,
                   ${CURRENT_TABLE}.is_show_car,
                   ${CURRENT_TABLE}.is_show_wx,
                   ${CURRENT_TABLE}.wx_code_img,
                   ${CURRENT_TABLE}.description,
                   ${CURRENT_TABLE}.is_show_homepage,
                   ${CURRENT_TABLE}.is_show_gaode,
                   ${CURRENT_TABLE}.date_init,
                   ${CURRENT_TABLE}.visit_count,
                   ${CURRENT_TABLE}.imgs,
                   ${CURRENT_TABLE}.car_type,
                   users.phone,
                   users.wx,
                   users.homepage,
                   users.uid,
                   users.nickname,
                   users.username
            from ${CURRENT_TABLE}
                     left join users on ${CURRENT_TABLE}.uid = users.uid
                        where ${CURRENT_TABLE}.hash = '${req.query.hash}' and is_public = 1`);
    // 1. 先查询出 QR 结果
    (0, utility_1.getDataFromDB)(DB_NAME, sqlArray, true)
        .then(dataQr => {
        if (dataQr) { // 没有记录时会返回  undefined
            // decode unicode
            dataQr.message = (0, utility_1.unicodeDecode)(dataQr.message);
            dataQr.description = (0, utility_1.unicodeDecode)(dataQr.description);
            (0, utility_1.getDataFromDB)('diary', [`select hash, car_name, car_plate, imgs from ${CURRENT_TABLE} 
                                  where 
                                     uid = ${dataQr.uid} 
                                     and is_public = 1 
                                     and hash != '${req.query.hash}'`], false)
                .then(dataHasList => {
                res.send(new Response_1.ResponseSuccess({
                    dataQr: dataQr,
                    hashList: dataHasList
                }, '获取成功'));
                countPlusOne(String(req.query.hash));
            })
                .catch(err => {
                console.log(err);
                res.send(new Response_1.ResponseError('', '获取同用户其它码失败'));
            });
        }
        else {
            res.send(new Response_1.ResponseError('', '查无此码'));
        }
    })
        .catch(err => {
        res.send(new Response_1.ResponseError(err, err.message));
    });
});
function countPlusOne(hash) {
    (0, utility_1.getDataFromDB)(DB_NAME, [`update ${CURRENT_TABLE} set visit_count = visit_count + 1 where hash = '${hash}'`])
        .then();
}
exports.default = router;
