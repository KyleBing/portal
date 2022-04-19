const express = require('express')
const router = express.Router()
const utility = require('../config/utility')
const ResponseSuccess = require("../response/ResponseSuccess");
const ResponseError = require("../response/ResponseError");
const mysql = require("mysql");
const configOfDatabase = require("../config/configDatabase");
const { stat, writeFile } = require("fs");

const LOCK_FILE_NAME = 'DATABASE_LOCK'

router.get('/', (req, res, next) => {

    stat(LOCK_FILE_NAME, ((err, stats) => {
        if (err){
            // 如果没有该文件，说明数据库没有初始化过
            let tempConfigDatabase = {}
            Object.assign(tempConfigDatabase, configOfDatabase)
            delete tempConfigDatabase.database
            let connection = mysql.createConnection(tempConfigDatabase)
            connection.connect()
            const sqlCreation = 'CREATE DATABASE IF NOT EXISTS diary'
            connection.query(sqlCreation, [], function (err, result) {
                if (err){
                    console.log('- 1. fail : create db fails, \nwith err info: \n' + err.message)
                    res.send(new ResponseError(err.message))
                } else {
                    console.log('- 1. success: create db diary')
                    createTables()
                        .then(msg => {

                            writeFile(LOCK_FILE_NAME, 'Database has been locked, file add in ' + utility.dateFormatter(new Date()),err => {
                                if (err){
                                    res.send('初始化失败')
                                } else {
                                    res.send(
                                        '数据库初始化成功：<br>' +
                                        '数据库名： diary<br>' +
                                        '创建两张表：users、diaries <br>' +
                                        '已创建数据库锁定文件： ' + LOCK_FILE_NAME
                                    )
                                }
                            })

                        })
                        .catch(msg => {
                            res.send(msg)
                        })
                }
            })
            connection.end()
        } else {
            // 如果已经初始化过了
            res.send('该数据库已被初始化过，如果想重新初始化，请先删除项目中 <b>DATABASE_LOCK</b> 文件')
        }
    }))


})

function createTables(){
    return new Promise((resolve, reject) => {
        let connection = mysql.createConnection(configOfDatabase)
        console.log(configOfDatabase)
        connection.connect()
        const sqlCreateTables = `
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for diaries
-- ----------------------------
DROP TABLE IF EXISTS \`diaries\`;
CREATE TABLE \`diaries\`  (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`date\` datetime(0) NOT NULL COMMENT '日记日期',
  \`title\` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '标题',
  \`content\` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '内容',
  \`temperature\` int(3) NULL DEFAULT -273 COMMENT '室内温度',
  \`temperature_outside\` int(3) NULL DEFAULT -273 COMMENT '室外温度',
  \`weather\` enum('sunny','cloudy','overcast','sprinkle','rain','thunderstorm','fog','snow','tornado','smog','sandstorm') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'sunny' COMMENT '天气',
  \`category\` enum('life','study','film','game','work','sport','bigevent','week','article') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'life' COMMENT '类别',
  \`date_create\` datetime(0) NOT NULL COMMENT '创建日期',
  \`date_modify\` datetime(0) NULL DEFAULT NULL COMMENT '编辑日期',
  \`uid\` int(11) NOT NULL COMMENT '用户id',
  \`is_public\` int(1) NOT NULL DEFAULT 0 COMMENT '是否共享',
  PRIMARY KEY (\`id\`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Compact;

-- ----------------------------
-- Table structure for users
-- ----------------------------
DROP TABLE IF EXISTS \`users\`;
CREATE TABLE \`users\`  (
  \`uid\` int(11) NOT NULL AUTO_INCREMENT,
  \`email\` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  \`password\` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  \`last_visit_time\` datetime(0) NULL DEFAULT NULL,
  \`username\` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  \`register_time\` datetime(0) NULL DEFAULT NULL,
  \`comment\` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  PRIMARY KEY (\`uid\`, \`email\`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Compact;

SET FOREIGN_KEY_CHECKS = 1;
`
        connection.query(sqlCreateTables, [], function (err, result) {
            console.log('result: ', result)
            if (err){
                console.log('-- 2. fail: create table diaries, users')
                reject('失败：新建 tables: users, diaries，\ninfo: \n' + err.message)
            } else {
                console.log('-- 2. success: create table diaries, users')
                resolve('成功：新建 tables: users, diaries')
            }
        })
        connection.end()
    })
}

module.exports = router
