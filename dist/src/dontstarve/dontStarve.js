"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Response_1 = require("../response/Response");
const utility_1 = require("../utility");
const router = express_1.default.Router();
// get list
function getDataList(sqlArray, path) {
    router.get(path, (_, res) => {
        (0, utility_1.getDataFromDB)('starve', sqlArray)
            .then(data => {
            if (data) { // 没有记录时会返回  undefined
                res.send(new Response_1.ResponseSuccess(data));
            }
            else {
                res.send(new Response_1.ResponseError('', '无数据'));
            }
        })
            .catch(err => {
            res.send(new Response_1.ResponseError(err, err.message));
        });
    });
}
const ListGet = [
    {
        path: '/character/list',
        sqlArray: [` select * from characters`]
    },
    {
        path: '/mob/list',
        sqlArray: [` select * from mobs`]
    },
    {
        path: '/log/list',
        sqlArray: [` select * from logs`]
    },
    {
        path: '/plant/list',
        sqlArray: [` select * from plants`]
    },
    {
        path: '/thing/list',
        sqlArray: [` select * from things`]
    },
    {
        path: '/material/list',
        sqlArray: [` select * from materials`]
    },
    {
        path: '/craft/list',
        sqlArray: [` select * from crafts`]
    },
    {
        path: '/cookingrecipe/list',
        sqlArray: [` select * from cookingrecipes`]
    },
    {
        path: '/coder/list',
        sqlArray: [` select * from coders`]
    },
];
ListGet.forEach(item => {
    getDataList(item.sqlArray, item.path);
});
// get infos
const ListGetInfo = [
    {
        path: '/character/info',
        tableName: 'characters'
    },
    {
        path: '/mob/info',
        tableName: 'mobs'
    },
    {
        path: '/log/info',
        tableName: 'logs'
    },
    {
        path: '/plant/info',
        tableName: 'plants'
    },
    {
        path: '/thing/info',
        tableName: 'things'
    },
    {
        path: '/material/info',
        tableName: 'materials'
    },
    {
        path: '/craft/info',
        tableName: 'crafts'
    },
    {
        path: '/cookreceipe/info',
        tableName: 'cookreceipes'
    },
    {
        path: '/coder/info',
        tableName: 'coders'
    },
];
ListGetInfo.forEach(item => {
    getDataInfo(item.tableName, item.path);
});
function getDataInfo(tableName, path) {
    router.get(path, (req, res) => {
        (0, utility_1.getDataFromDB)('starve', [`select * from ${tableName} where id = ${req.query.id}`], true)
            .then(data => {
            if (data) { // 没有记录时会返回  undefined
                res.send(new Response_1.ResponseSuccess(data));
            }
            else {
                res.send(new Response_1.ResponseError('', '无数据'));
            }
        })
            .catch(err => {
            res.send(new Response_1.ResponseError(err, err.message));
        });
    });
}
exports.default = router;
