"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDatabase = initializeDatabase;
exports.formatInitResultHtml = formatInitResultHtml;
const mysql2_1 = __importDefault(require("mysql2"));
const path_1 = __importDefault(require("path"));
const promises_1 = require("fs/promises");
const utility_1 = require("../utility");
const setupService_1 = require("../setup/setupService");
const DB_NAME = 'diary';
// mysql2 仍是回调风格，这里做一层 Promise 包装，方便初始化流程串行执行和统一错误处理。
function connectMysql(connection) {
    return new Promise((resolve, reject) => {
        connection.connect(err => {
            if (err) {
                reject(err);
            }
            else {
                resolve();
            }
        });
    });
}
function queryMysql(connection, sql) {
    return new Promise((resolve, reject) => {
        connection.query(sql, [], (err, result) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(result);
            }
        });
    });
}
function closeMysql(connection) {
    return new Promise((resolve) => {
        connection.end(() => resolve());
    });
}
// 第一步只连到 MySQL 服务本身，用来确保 diary 数据库存在。
function createDatabase() {
    return __awaiter(this, void 0, void 0, function* () {
        const databaseConfig = (0, setupService_1.getDatabaseConfig)();
        const connection = mysql2_1.default.createConnection({
            host: databaseConfig.host,
            user: databaseConfig.user,
            password: databaseConfig.password,
            port: databaseConfig.port,
            timezone: databaseConfig.timezone
        });
        try {
            yield connectMysql(connection);
            yield queryMysql(connection, `CREATE DATABASE IF NOT EXISTS ${DB_NAME}`);
        }
        finally {
            yield closeMysql(connection);
        }
    });
}
function createTables() {
    return __awaiter(this, void 0, void 0, function* () {
        const databaseConfig = (0, setupService_1.getDatabaseConfig)();
        const connection = mysql2_1.default.createConnection({
            host: databaseConfig.host,
            user: databaseConfig.user,
            password: databaseConfig.password,
            port: databaseConfig.port,
            timezone: databaseConfig.timezone,
            database: DB_NAME,
            multipleStatements: true
        });
        try {
            yield connectMysql(connection);
            // 初始化 SQL 文件会在构建时一并复制到 dist 中，所以这里始终按当前运行目录读取即可。
            const sqlFilePath = path_1.default.join(__dirname, 'init.sql');
            const sqlCreateTables = yield (0, promises_1.readFile)(sqlFilePath, 'utf8');
            yield queryMysql(connection, sqlCreateTables);
        }
        finally {
            yield closeMysql(connection);
        }
    });
}
function createLockFile() {
    return __awaiter(this, void 0, void 0, function* () {
        yield (0, promises_1.writeFile)((0, setupService_1.getLockFilePath)(), `Database has been locked, file add in ${(0, utility_1.dateFormatter)(new Date())}`, 'utf8');
    });
}
// 对外暴露统一初始化入口，供旧的 /init 页面和新的安装向导接口复用。
function initializeDatabase() {
    return __awaiter(this, void 0, void 0, function* () {
        if ((0, setupService_1.isDatabaseInitialized)()) {
            return {
                alreadyInitialized: true,
                message: `该数据库已被初始化过，如果想重新初始化，请先删除项目中 ${(0, setupService_1.getLockFileName)()} 文件`,
                data: {
                    dbName: DB_NAME,
                    lockFileName: (0, setupService_1.getLockFileName)()
                }
            };
        }
        yield createDatabase();
        yield createTables();
        yield createLockFile();
        return {
            alreadyInitialized: false,
            message: '数据库初始化成功',
            data: {
                dbName: DB_NAME,
                tableNames: ['users', 'user_group', 'diaries', 'diary_category', 'qrs', 'invitations'],
                lockFileName: (0, setupService_1.getLockFileName)()
            }
        };
    });
}
function formatInitResultHtml(initResult) {
    // 旧接口直接返回 HTML 文本，这里保留格式化函数，避免老入口行为变化。
    if (initResult.alreadyInitialized) {
        return `该数据库已被初始化过，如果想重新初始化，请先删除项目中 <b>${initResult.data.lockFileName}</b> 文件`;
    }
    return ('数据库初始化成功：<br>' +
        `数据库名： ${initResult.data.dbName}<br>` +
        `创建 6 张表：${initResult.data.tableNames.join('、')} <br>` +
        `已创建数据库锁定文件： ${initResult.data.lockFileName}`);
}
