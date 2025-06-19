"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Response_1 = require("../response/Response");
const mysql2_1 = __importDefault(require("mysql2"));
const configDatabase_json_1 = __importDefault(require("../../config/configDatabase.json"));
const utility_1 = require("../utility");
const router = express_1.default.Router();
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const LOCK_FILE_NAME = 'DATABASE_LOCK';
router.get('/', (_req, res) => {
    (0, fs_1.stat)(LOCK_FILE_NAME, ((err, _) => {
        if (err) {
            // 如果没有该文件，说明数据库没有初始化过
            let tempConfigDatabase = {
                host: '',
                user: '',
                password: '',
                port: 3306,
                multipleStatements: false, // 允许同时请求多条 sql 语句
                timezone: ''
            };
            Object.assign(tempConfigDatabase, configDatabase_json_1.default);
            let connection = mysql2_1.default.createConnection(tempConfigDatabase);
            connection.connect();
            const sqlCreation = 'CREATE DATABASE IF NOT EXISTS diary';
            connection.query(sqlCreation, [], function (err) {
                if (err) {
                    console.log('- 1. fail : create db fails, \nwith err info: \n' + err.message);
                    res.send(new Response_1.ResponseError(err, err.message));
                }
                else {
                    console.log('- 1. success: create db diary');
                    createTables()
                        .then(() => {
                        (0, fs_1.writeFile)(LOCK_FILE_NAME, 'Database has been locked, file add in ' + (0, utility_1.dateFormatter)(new Date()), err => {
                            if (err) {
                                res.send('初始化失败');
                            }
                            else {
                                res.send('数据库初始化成功：<br>' +
                                    '数据库名： diary<br>' +
                                    '创建 6 张表：users、user_group、diaries、diary_category、qrs、invitations <br>' +
                                    '已创建数据库锁定文件： ' + LOCK_FILE_NAME);
                            }
                        });
                    })
                        .catch(msg => {
                        res.send(msg);
                    });
                }
            });
            connection.end();
        }
        else {
            // 如果已经初始化过了
            res.send('该数据库已被初始化过，如果想重新初始化，请先删除项目中 <b>DATABASE_LOCK</b> 文件');
        }
    }));
});
function createTables() {
    return new Promise((resolve, reject) => {
        let connection = mysql2_1.default.createConnection(configDatabase_json_1.default);
        console.log(configDatabase_json_1.default);
        connection.connect();
        // Read SQL from external file
        const sqlFilePath = path_1.default.join(__dirname, 'init.sql');
        const sqlCreateTables = (0, fs_1.readFileSync)(sqlFilePath, 'utf8');
        connection.query(sqlCreateTables, [], function (err, result) {
            console.log('result: ', result);
            if (err) {
                console.log('-- 2. fail: create table diaries, users');
                reject('失败：新建 tables: users, diaries，\ninfo: \n' + err.message);
            }
            else {
                console.log('-- 2. success: create table diaries, users');
                resolve('成功：新建 tables: users, diaries');
            }
        });
        connection.end();
    });
}
exports.default = router;
