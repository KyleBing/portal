"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Response_1 = require("../response/Response");
const utility_1 = require("../utility");
const router = express_1.default.Router();
router.get('/', (req, res) => {
    // 1. 验证 token
    (0, utility_1.verifyAuthorization)(req)
        .then(userInfo => {
        let sqlArray = [];
        sqlArray.push(`select * from diaries where title = '我的银行卡列表' and uid = ${userInfo.uid}`); // 固定 '银行卡列表' 为标题的日记作为存储银行卡列表
        // 2. 查询出日记结果
        (0, utility_1.getDataFromDB)('diary', sqlArray, true)
            .then(dataDiary => {
            if (dataDiary) {
                // decode unicode
                dataDiary.title = (0, utility_1.unicodeDecode)(dataDiary.title || '');
                dataDiary.content = (0, utility_1.unicodeDecode)(dataDiary.content || '');
                // 记录最后访问时间
                (0, utility_1.updateUserLastLoginTime)(userInfo.uid);
                res.send(new Response_1.ResponseSuccess(dataDiary.content));
            }
            else {
                res.send(new Response_1.ResponseSuccess('', '未保存任何银行卡信息'));
            }
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
