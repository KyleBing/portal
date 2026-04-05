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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SYSTEM_CONFIG = void 0;
exports.getSystemConfig = getSystemConfig;
exports.getAdminSystemConfig = getAdminSystemConfig;
exports.saveSystemConfig = saveSystemConfig;
exports.verifyAdmin = verifyAdmin;
exports.isConfiguredDemoAccountEmail = isConfiguredDemoAccountEmail;
const bcrypt_1 = __importDefault(require("bcrypt"));
const fs_1 = require("fs");
const mysql2_1 = __importDefault(require("mysql2"));
const path_1 = __importDefault(require("path"));
const User_1 = require("entity/User");
const Response_1 = require("../response/Response");
const utility_1 = require("../utility");
const setupService_1 = require("../setup/setupService");
const DB_NAME = 'diary';
const TABLE_NAME = 'system_config';
const USERS_TABLE = 'users';
const LEGACY_PROJECT_CONFIG_PATHS = [
    path_1.default.resolve(__dirname, '../../config/configProject.json'),
    path_1.default.resolve(__dirname, '../../../config/configProject.json')
];
exports.DEFAULT_SYSTEM_CONFIG = {
    is_show_demo_account: false,
    demo_account: 'test@163.com',
    demo_account_password: 'test',
    invitation_code: '',
    qiniu_img_base_url: 'http://diary-container.kylebing.cn/',
    qiniu_bucket_name: 'diary-container',
    qiniu_style_suffix: 'thumbnail_600px',
    qiniu_access_key: '',
    qiniu_secret_key: '',
    hefeng_weather_api_key: 'c5894aea6ce2495ca0f78a2963c04d57',
    hefeng_weather_api_host: 'pd3fbqjryn.re.qweatherapi.com',
    register_tip: '<p>长期未使用的用户将定期进行清理，大概一年清一次。</p><p>项目已开源</p>'
};
function parseBoolean(value) {
    return value === true || value === 1 || value === '1' || value === 'true';
}
function normalizeSystemConfig(rawConfig = {}) {
    return {
        is_show_demo_account: parseBoolean(rawConfig.is_show_demo_account),
        demo_account: String(rawConfig.demo_account || '').trim(),
        demo_account_password: String(rawConfig.demo_account_password || ''),
        invitation_code: String(rawConfig.invitation_code || '').trim(),
        qiniu_img_base_url: String(rawConfig.qiniu_img_base_url || '').trim(),
        qiniu_bucket_name: String(rawConfig.qiniu_bucket_name || '').trim(),
        qiniu_style_suffix: String(rawConfig.qiniu_style_suffix || '').trim(),
        qiniu_access_key: String(rawConfig.qiniu_access_key || '').trim(),
        qiniu_secret_key: String(rawConfig.qiniu_secret_key || '').trim(),
        hefeng_weather_api_key: String(rawConfig.hefeng_weather_api_key || '').trim(),
        hefeng_weather_api_host: String(rawConfig.hefeng_weather_api_host || '').trim(),
        register_tip: String(rawConfig.register_tip || '').trim()
    };
}
function toPublicSystemConfig(systemConfig) {
    const { invitation_code: _invitationCode, qiniu_access_key: _qiniuAccessKey, qiniu_secret_key: _qiniuSecretKey } = systemConfig, publicConfig = __rest(systemConfig, ["invitation_code", "qiniu_access_key", "qiniu_secret_key"]);
    return publicConfig;
}
function getLegacyProjectConfig() {
    for (const filePath of LEGACY_PROJECT_CONFIG_PATHS) {
        if (!(0, fs_1.existsSync)(filePath)) {
            continue;
        }
        try {
            const raw = JSON.parse((0, fs_1.readFileSync)(filePath, 'utf8'));
            return normalizeSystemConfig({
                invitation_code: raw.invitation_code,
                qiniu_access_key: raw.qiniu_access_key,
                qiniu_secret_key: raw.qiniu_secret_key
            });
        }
        catch (_err) {
            // Ignore malformed legacy config files and fall back to DB/defaults.
        }
    }
    return {};
}
function escapeString(value) {
    return mysql2_1.default.escape(value);
}
function hashPasswordPlain(plain) {
    return new Promise((resolve, reject) => {
        bcrypt_1.default.hash(plain, 10, (err, hash) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(hash);
            }
        });
    });
}
function bcryptCompare(plain, hash) {
    return new Promise((resolve, reject) => {
        bcrypt_1.default.compare(plain, hash, (err, ok) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(!!ok);
            }
        });
    });
}
function deriveDemoNickname(email) {
    const local = email.split('@')[0] || '演示';
    return local.slice(0, 20);
}
function deriveDemoUsernameBase(email) {
    const local = email.split('@')[0] || 'demo';
    const sanitized = local.toLowerCase().replace(/[^a-z0-9_]/g, '');
    const base = (sanitized || 'demo').slice(0, 20);
    return base;
}
function pickUniqueDemoUsername(base) {
    return __awaiter(this, void 0, void 0, function* () {
        const trimmed = base.slice(0, 20);
        for (let i = 0; i < 10000; i++) {
            const suffix = i === 0 ? '' : String(i);
            const maxBaseLen = Math.max(1, 20 - suffix.length);
            const candidate = (trimmed.slice(0, maxBaseLen) + suffix).slice(0, 20);
            const row = yield (0, utility_1.getDataFromDB)(DB_NAME, [`SELECT uid FROM ${USERS_TABLE} WHERE username = ${escapeString(candidate)} LIMIT 1`], true);
            if (!row) {
                return candidate;
            }
        }
        throw new Error('无法为演示账号生成唯一用户名，请更换演示邮箱后重试');
    });
}
/** 保存「显示演示账号」时：无则创建用户；有则若明文密码与库中哈希不一致则更新密码。 */
function syncDemoAccountUser(systemConfig) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!systemConfig.is_show_demo_account) {
            return;
        }
        const email = systemConfig.demo_account.trim();
        const plainPassword = systemConfig.demo_account_password;
        const row = yield (0, utility_1.getDataFromDB)(DB_NAME, [`SELECT uid, password, group_id FROM ${USERS_TABLE} WHERE email = ${escapeString(email)} LIMIT 1`], true);
        if (!row) {
            const encryptPassword = yield hashPasswordPlain(plainPassword);
            const timeNow = (0, utility_1.dateFormatter)(new Date());
            const nickname = deriveDemoNickname(email);
            const baseUser = deriveDemoUsernameBase(email);
            const username = yield pickUniqueDemoUsername(baseUser);
            yield (0, utility_1.getDataFromDB)(DB_NAME, [
                `
            INSERT INTO ${USERS_TABLE}(
                email, nickname, username, password, register_time, last_visit_time, comment,
                wx, phone, homepage, gaode, group_id
            ) VALUES (
                ${escapeString(email)},
                ${escapeString(nickname)},
                ${escapeString(username)},
                ${escapeString(encryptPassword)},
                ${escapeString(timeNow)},
                ${escapeString(timeNow)},
                '',
                '',
                '',
                '',
                '',
                ${User_1.EnumUserGroup.USER}
            )
            `
            ]);
            return;
        }
        const passwordOk = yield bcryptCompare(plainPassword, String(row.password || ''));
        if (passwordOk) {
            return;
        }
        const encryptPassword = yield hashPasswordPlain(plainPassword);
        yield (0, utility_1.getDataFromDB)(DB_NAME, [
            `UPDATE ${USERS_TABLE} SET password = ${escapeString(encryptPassword)} WHERE uid = ${Number(row.uid)} LIMIT 1`
        ], true);
    });
}
function ensureSystemConfigTable() {
    return __awaiter(this, void 0, void 0, function* () {
        yield (0, utility_1.getDataFromDB)(DB_NAME, [
            `
        CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
            id tinyint(1) NOT NULL DEFAULT 1 COMMENT '固定主键，仅保留一行',
            is_show_demo_account tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否显示演示账号',
            demo_account varchar(255) NOT NULL DEFAULT '' COMMENT '演示账号',
            demo_account_password varchar(255) NOT NULL DEFAULT '' COMMENT '演示账号密码',
            invitation_code varchar(255) NOT NULL DEFAULT '' COMMENT '通用邀请码',
            qiniu_img_base_url varchar(255) NOT NULL DEFAULT '' COMMENT '七牛图片访问域名',
            qiniu_bucket_name varchar(255) NOT NULL DEFAULT '' COMMENT '七牛 Bucket 名称',
            qiniu_style_suffix varchar(255) NOT NULL DEFAULT '' COMMENT '七牛样式后缀',
            qiniu_access_key varchar(255) NOT NULL DEFAULT '' COMMENT '七牛 Access Key',
            qiniu_secret_key varchar(255) NOT NULL DEFAULT '' COMMENT '七牛 Secret Key',
            hefeng_weather_api_key varchar(255) NOT NULL DEFAULT '' COMMENT '和风天气 key',
            hefeng_weather_api_host varchar(255) NOT NULL DEFAULT '' COMMENT '和风天气 host',
            register_tip text NULL COMMENT '注册提示 HTML',
            date_modify datetime NULL DEFAULT NULL COMMENT '最后修改时间',
            PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        `
        ]);
        const existingColumns = yield (0, utility_1.getDataFromDB)(DB_NAME, [
            `
        SELECT COLUMN_NAME as column_name
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = ${escapeString(DB_NAME)}
          AND TABLE_NAME = ${escapeString(TABLE_NAME)}
          AND COLUMN_NAME IN ('invitation_code', 'qiniu_access_key', 'qiniu_secret_key')
        `
        ]);
        const existingColumnNameSet = new Set(existingColumns.map((item) => String(item.column_name)));
        const addColumnSqlList = [];
        if (!existingColumnNameSet.has('invitation_code')) {
            addColumnSqlList.push(`
            ALTER TABLE ${TABLE_NAME}
            ADD COLUMN invitation_code varchar(255) NOT NULL DEFAULT '' COMMENT '通用邀请码' AFTER demo_account_password
        `);
        }
        if (!existingColumnNameSet.has('qiniu_access_key')) {
            addColumnSqlList.push(`
            ALTER TABLE ${TABLE_NAME}
            ADD COLUMN qiniu_access_key varchar(255) NOT NULL DEFAULT '' COMMENT '七牛 Access Key' AFTER qiniu_style_suffix
        `);
        }
        if (!existingColumnNameSet.has('qiniu_secret_key')) {
            addColumnSqlList.push(`
            ALTER TABLE ${TABLE_NAME}
            ADD COLUMN qiniu_secret_key varchar(255) NOT NULL DEFAULT '' COMMENT '七牛 Secret Key' AFTER qiniu_access_key
        `);
        }
        if (addColumnSqlList.length > 0) {
            yield (0, utility_1.getDataFromDB)(DB_NAME, addColumnSqlList);
        }
        yield (0, utility_1.getDataFromDB)(DB_NAME, [
            `
        INSERT IGNORE INTO ${TABLE_NAME} (
            id,
            is_show_demo_account,
            demo_account,
            demo_account_password,
            invitation_code,
            qiniu_img_base_url,
            qiniu_bucket_name,
            qiniu_style_suffix,
            qiniu_access_key,
            qiniu_secret_key,
            hefeng_weather_api_key,
            hefeng_weather_api_host,
            register_tip,
            date_modify
        ) VALUES (
            1,
            ${exports.DEFAULT_SYSTEM_CONFIG.is_show_demo_account ? 1 : 0},
            ${escapeString(exports.DEFAULT_SYSTEM_CONFIG.demo_account)},
            ${escapeString(exports.DEFAULT_SYSTEM_CONFIG.demo_account_password)},
            ${escapeString(exports.DEFAULT_SYSTEM_CONFIG.invitation_code)},
            ${escapeString(exports.DEFAULT_SYSTEM_CONFIG.qiniu_img_base_url)},
            ${escapeString(exports.DEFAULT_SYSTEM_CONFIG.qiniu_bucket_name)},
            ${escapeString(exports.DEFAULT_SYSTEM_CONFIG.qiniu_style_suffix)},
            ${escapeString(exports.DEFAULT_SYSTEM_CONFIG.qiniu_access_key)},
            ${escapeString(exports.DEFAULT_SYSTEM_CONFIG.qiniu_secret_key)},
            ${escapeString(exports.DEFAULT_SYSTEM_CONFIG.hefeng_weather_api_key)},
            ${escapeString(exports.DEFAULT_SYSTEM_CONFIG.hefeng_weather_api_host)},
            ${escapeString(exports.DEFAULT_SYSTEM_CONFIG.register_tip)},
            NULL
        )
        `
        ]);
        const legacyProjectConfig = getLegacyProjectConfig();
        if (legacyProjectConfig.invitation_code ||
            legacyProjectConfig.qiniu_access_key ||
            legacyProjectConfig.qiniu_secret_key) {
            yield (0, utility_1.getDataFromDB)(DB_NAME, [
                `
            UPDATE ${TABLE_NAME}
            SET
                invitation_code = CASE
                    WHEN invitation_code = '' THEN ${escapeString(String(legacyProjectConfig.invitation_code || ''))}
                    ELSE invitation_code
                END,
                qiniu_access_key = CASE
                    WHEN qiniu_access_key = '' THEN ${escapeString(String(legacyProjectConfig.qiniu_access_key || ''))}
                    ELSE qiniu_access_key
                END,
                qiniu_secret_key = CASE
                    WHEN qiniu_secret_key = '' THEN ${escapeString(String(legacyProjectConfig.qiniu_secret_key || ''))}
                    ELSE qiniu_secret_key
                END
            WHERE id = 1
            `
            ]);
        }
    });
}
function validateSystemConfig(systemConfig) {
    if (systemConfig.is_show_demo_account) {
        const demoEmail = systemConfig.demo_account.trim();
        if (!demoEmail) {
            throw new Error('启用演示账号时，演示账号邮箱不能为空');
        }
        if (demoEmail.length > 50) {
            throw new Error('演示账号邮箱长度不能超过 50 个字符');
        }
        if (!systemConfig.demo_account_password) {
            throw new Error('启用演示账号时，演示账号密码不能为空');
        }
    }
}
function getSystemConfig() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!(0, setupService_1.isDatabaseInitialized)()) {
            return toPublicSystemConfig(normalizeSystemConfig(exports.DEFAULT_SYSTEM_CONFIG));
        }
        yield ensureSystemConfigTable();
        const data = yield (0, utility_1.getDataFromDB)(DB_NAME, [`SELECT * FROM ${TABLE_NAME} WHERE id = 1 LIMIT 1`], true);
        return toPublicSystemConfig(normalizeSystemConfig(data || exports.DEFAULT_SYSTEM_CONFIG));
    });
}
function getAdminSystemConfig() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!(0, setupService_1.isDatabaseInitialized)()) {
            return normalizeSystemConfig(exports.DEFAULT_SYSTEM_CONFIG);
        }
        yield ensureSystemConfigTable();
        const data = yield (0, utility_1.getDataFromDB)(DB_NAME, [`SELECT * FROM ${TABLE_NAME} WHERE id = 1 LIMIT 1`], true);
        return normalizeSystemConfig(data || exports.DEFAULT_SYSTEM_CONFIG);
    });
}
function saveSystemConfig(payload) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!(0, setupService_1.isDatabaseInitialized)()) {
            throw new Error('系统尚未初始化，暂时不能保存系统配置');
        }
        yield ensureSystemConfigTable();
        const currentConfig = yield getAdminSystemConfig();
        const systemConfig = normalizeSystemConfig(Object.assign(Object.assign({}, currentConfig), payload));
        validateSystemConfig(systemConfig);
        const dateModify = (0, utility_1.dateFormatter)(new Date());
        yield (0, utility_1.getDataFromDB)(DB_NAME, [
            `
        INSERT INTO ${TABLE_NAME} (
            id,
            is_show_demo_account,
            demo_account,
            demo_account_password,
            invitation_code,
            qiniu_img_base_url,
            qiniu_bucket_name,
            qiniu_style_suffix,
            qiniu_access_key,
            qiniu_secret_key,
            hefeng_weather_api_key,
            hefeng_weather_api_host,
            register_tip,
            date_modify
        ) VALUES (
            1,
            ${systemConfig.is_show_demo_account ? 1 : 0},
            ${escapeString(systemConfig.demo_account)},
            ${escapeString(systemConfig.demo_account_password)},
            ${escapeString(systemConfig.invitation_code)},
            ${escapeString(systemConfig.qiniu_img_base_url)},
            ${escapeString(systemConfig.qiniu_bucket_name)},
            ${escapeString(systemConfig.qiniu_style_suffix)},
            ${escapeString(systemConfig.qiniu_access_key)},
            ${escapeString(systemConfig.qiniu_secret_key)},
            ${escapeString(systemConfig.hefeng_weather_api_key)},
            ${escapeString(systemConfig.hefeng_weather_api_host)},
            ${escapeString(systemConfig.register_tip)},
            ${escapeString(dateModify)}
        )
        ON DUPLICATE KEY UPDATE
            is_show_demo_account = VALUES(is_show_demo_account),
            demo_account = VALUES(demo_account),
            demo_account_password = VALUES(demo_account_password),
            invitation_code = VALUES(invitation_code),
            qiniu_img_base_url = VALUES(qiniu_img_base_url),
            qiniu_bucket_name = VALUES(qiniu_bucket_name),
            qiniu_style_suffix = VALUES(qiniu_style_suffix),
            qiniu_access_key = VALUES(qiniu_access_key),
            qiniu_secret_key = VALUES(qiniu_secret_key),
            hefeng_weather_api_key = VALUES(hefeng_weather_api_key),
            hefeng_weather_api_host = VALUES(hefeng_weather_api_host),
            register_tip = VALUES(register_tip),
            date_modify = VALUES(date_modify)
        `
        ]);
        yield syncDemoAccountUser(systemConfig);
        return getAdminSystemConfig();
    });
}
function verifyAdmin(userInfo) {
    if (userInfo.group_id !== User_1.EnumUserGroup.ADMIN) {
        throw new Response_1.ResponseError('', '仅管理员可操作系统配置');
    }
}
/** 是否与当前系统配置中的演示账号邮箱一致（用于限制改资料、改密、注销等）。 */
function isConfiguredDemoAccountEmail(email) {
    return __awaiter(this, void 0, void 0, function* () {
        const cfg = yield getSystemConfig();
        const demo = cfg.demo_account.trim();
        return demo.length > 0 && email === demo;
    });
}
