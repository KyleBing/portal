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
exports.getLockFileName = getLockFileName;
exports.getLockFilePath = getLockFilePath;
exports.isDatabaseInitialized = isDatabaseInitialized;
exports.getDatabaseConfig = getDatabaseConfig;
exports.getSetupStatus = getSetupStatus;
exports.saveSetupConfig = saveSetupConfig;
const fs_1 = require("fs");
const promises_1 = require("fs/promises");
const path_1 = __importDefault(require("path"));
const configDatabase_json_1 = __importDefault(require("../../config/configDatabase.json"));
const utility_1 = require("../utility");
const LOCK_FILE_NAME = 'DATABASE_LOCK';
const runtimeRoot = path_1.default.resolve(__dirname, '..', '..');
const isDistRuntime = path_1.default.basename(runtimeRoot).toLowerCase() === 'dist';
const projectRoot = isDistRuntime ? path_1.default.dirname(runtimeRoot) : runtimeRoot;
// 运行在源码目录和 dist 目录时，配置文件落点不同，这里统一收口出需要同步写入的目标列表。
function getConfigTargets(fileName) {
    const targetSet = new Set();
    targetSet.add(path_1.default.join(runtimeRoot, 'config', fileName));
    if (isDistRuntime) {
        const sourceConfigDir = path_1.default.join(projectRoot, 'config');
        if ((0, fs_1.existsSync)(sourceConfigDir)) {
            targetSet.add(path_1.default.join(sourceConfigDir, fileName));
        }
    }
    else {
        const distConfigDir = path_1.default.join(projectRoot, 'dist', 'config');
        if ((0, fs_1.existsSync)(distConfigDir)) {
            targetSet.add(path_1.default.join(distConfigDir, fileName));
        }
    }
    return Array.from(targetSet);
}
function cloneDatabaseConfig() {
    return {
        host: configDatabase_json_1.default.host,
        user: configDatabase_json_1.default.user,
        password: configDatabase_json_1.default.password,
        port: configDatabase_json_1.default.port,
        multipleStatements: configDatabase_json_1.default.multipleStatements,
        timezone: configDatabase_json_1.default.timezone
    };
}
function normalizeDatabaseConfig(rawConfig) {
    return {
        host: String(rawConfig.host || '').trim(),
        user: String(rawConfig.user || '').trim(),
        password: String(rawConfig.password || ''),
        port: Number(rawConfig.port || 3306),
        multipleStatements: rawConfig.multipleStatements !== undefined
            ? Boolean(rawConfig.multipleStatements)
            : configDatabase_json_1.default.multipleStatements,
        timezone: String(rawConfig.timezone || '').trim()
    };
}
function validateDatabaseConfig(databaseConfig) {
    if (!databaseConfig.host) {
        throw new Error('数据库主机不能为空');
    }
    if (!databaseConfig.user) {
        throw new Error('数据库用户名不能为空');
    }
    if (!Number.isInteger(databaseConfig.port) || databaseConfig.port <= 0 || databaseConfig.port > 65535) {
        throw new Error('数据库端口不正确');
    }
}
function writeJsonFile(filePath, data) {
    return __awaiter(this, void 0, void 0, function* () {
        yield (0, promises_1.mkdir)(path_1.default.dirname(filePath), { recursive: true });
        yield (0, promises_1.writeFile)(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
    });
}
// 保存向导配置时，同时更新当前运行环境配置和另一侧副本，避免 source / dist 配置漂移。
function syncConfigFile(fileName, data) {
    return __awaiter(this, void 0, void 0, function* () {
        const targets = getConfigTargets(fileName);
        for (const targetPath of targets) {
            yield writeJsonFile(targetPath, data);
        }
    });
}
function getLockFileName() {
    return LOCK_FILE_NAME;
}
function getLockFilePath() {
    return path_1.default.join(projectRoot, LOCK_FILE_NAME);
}
function isDatabaseInitialized() {
    return (0, fs_1.existsSync)(getLockFilePath());
}
function getDatabaseConfig() {
    return cloneDatabaseConfig();
}
function hasRegisteredUsers() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!isDatabaseInitialized()) {
            return false;
        }
        try {
            const result = yield (0, utility_1.getDataFromDB)('diary', ['select count(*) as userCount from users'], true);
            return Number((result === null || result === void 0 ? void 0 : result.userCount) || 0) > 0;
        }
        catch (_err) {
            return false;
        }
    });
}
// 已初始化后不再回传明文配置，前端只需要看到锁定状态和后续操作提示即可。
function getSetupStatus() {
    return __awaiter(this, void 0, void 0, function* () {
        const isInitialized = isDatabaseInitialized();
        return {
            isInitialized,
            hasRegisteredUsers: yield hasRegisteredUsers(),
            lockFileName: LOCK_FILE_NAME,
            configFiles: [
                'config/configDatabase.json',
                'dist/config/configDatabase.json'
            ],
            config: isInitialized ? null : {
                databaseConfig: getDatabaseConfig()
            },
            restartTips: [
                '保存后会同步写入配置文件，并立即更新当前服务进程内存中的配置。',
                '项目配置、通用邀请码和七牛后台密钥请在初始化完成后，到系统配置页中维护。',
                '为了确保后续重启后的运行结果与当前一致，建议完成向导后重启 portal 服务。',
                '如果你使用 pm2，可以执行 pm2 restart portal。'
            ]
        };
    });
}
function saveSetupConfig(payload) {
    return __awaiter(this, void 0, void 0, function* () {
        // 安装向导只允许在首次初始化前修改，避免已经上线的数据环境被页面误改。
        if (isDatabaseInitialized()) {
            throw new Error(`系统已初始化，如需重新引导，请先删除 ${LOCK_FILE_NAME} 文件`);
        }
        const databaseConfig = normalizeDatabaseConfig(payload.databaseConfig || {});
        validateDatabaseConfig(databaseConfig);
        yield syncConfigFile('configDatabase.json', databaseConfig);
        // JSON 模块在 Node 进程内会被缓存，这里同步更新内存对象，让当前进程立即使用新配置。
        Object.assign(configDatabase_json_1.default, databaseConfig);
        return {
            databaseConfig: getDatabaseConfig()
        };
    });
}
