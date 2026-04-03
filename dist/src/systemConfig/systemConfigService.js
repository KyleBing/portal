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
exports.DEFAULT_SYSTEM_CONFIG = void 0;
exports.getSystemConfig = getSystemConfig;
exports.saveSystemConfig = saveSystemConfig;
exports.verifyAdmin = verifyAdmin;
const mysql2_1 = __importDefault(require("mysql2"));
const User_1 = require("entity/User");
const Response_1 = require("../response/Response");
const utility_1 = require("../utility");
const setupService_1 = require("../setup/setupService");
const DB_NAME = 'diary';
const TABLE_NAME = 'system_config';
exports.DEFAULT_SYSTEM_CONFIG = {
    admin_email: 'kylebing@163.com',
    is_show_demo_account: true,
    demo_account: 'test@163.com',
    demo_account_password: 'test',
    qiniu_img_base_url: 'http://diary-container.kylebing.cn/',
    qiniu_bucket_name: 'diary-container',
    qiniu_style_suffix: 'thumbnail_600px',
    hefeng_weather_api_key: 'c5894aea6ce2495ca0f78a2963c04d57',
    hefeng_weather_api_host: 'pd3fbqjryn.re.qweatherapi.com',
    register_tip: '<p>长期未使用的用户将定期进行清理，大概一年清一次。</p><p>项目已开源</p>'
};
function parseBoolean(value) {
    return value === true || value === 1 || value === '1' || value === 'true';
}
function normalizeSystemConfig(rawConfig = {}) {
    return {
        admin_email: String(rawConfig.admin_email || '').trim(),
        is_show_demo_account: parseBoolean(rawConfig.is_show_demo_account),
        demo_account: String(rawConfig.demo_account || '').trim(),
        demo_account_password: String(rawConfig.demo_account_password || ''),
        qiniu_img_base_url: String(rawConfig.qiniu_img_base_url || '').trim(),
        qiniu_bucket_name: String(rawConfig.qiniu_bucket_name || '').trim(),
        qiniu_style_suffix: String(rawConfig.qiniu_style_suffix || '').trim(),
        hefeng_weather_api_key: String(rawConfig.hefeng_weather_api_key || '').trim(),
        hefeng_weather_api_host: String(rawConfig.hefeng_weather_api_host || '').trim(),
        register_tip: String(rawConfig.register_tip || '').trim()
    };
}
function escapeString(value) {
    return mysql2_1.default.escape(value);
}
function ensureSystemConfigTable() {
    return __awaiter(this, void 0, void 0, function* () {
        yield (0, utility_1.getDataFromDB)(DB_NAME, [
            `
        CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
            id tinyint(1) NOT NULL DEFAULT 1 COMMENT '固定主键，仅保留一行',
            admin_email varchar(255) NOT NULL DEFAULT '' COMMENT '管理员联系邮箱',
            is_show_demo_account tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否显示演示账号',
            demo_account varchar(255) NOT NULL DEFAULT '' COMMENT '演示账号',
            demo_account_password varchar(255) NOT NULL DEFAULT '' COMMENT '演示账号密码',
            qiniu_img_base_url varchar(255) NOT NULL DEFAULT '' COMMENT '七牛图片访问域名',
            qiniu_bucket_name varchar(255) NOT NULL DEFAULT '' COMMENT '七牛 Bucket 名称',
            qiniu_style_suffix varchar(255) NOT NULL DEFAULT '' COMMENT '七牛样式后缀',
            hefeng_weather_api_key varchar(255) NOT NULL DEFAULT '' COMMENT '和风天气 key',
            hefeng_weather_api_host varchar(255) NOT NULL DEFAULT '' COMMENT '和风天气 host',
            register_tip text NULL COMMENT '注册提示 HTML',
            date_modify datetime NULL DEFAULT NULL COMMENT '最后修改时间',
            PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        `
        ]);
        yield (0, utility_1.getDataFromDB)(DB_NAME, [
            `
        INSERT IGNORE INTO ${TABLE_NAME} (
            id,
            admin_email,
            is_show_demo_account,
            demo_account,
            demo_account_password,
            qiniu_img_base_url,
            qiniu_bucket_name,
            qiniu_style_suffix,
            hefeng_weather_api_key,
            hefeng_weather_api_host,
            register_tip,
            date_modify
        ) VALUES (
            1,
            ${escapeString(exports.DEFAULT_SYSTEM_CONFIG.admin_email)},
            ${exports.DEFAULT_SYSTEM_CONFIG.is_show_demo_account ? 1 : 0},
            ${escapeString(exports.DEFAULT_SYSTEM_CONFIG.demo_account)},
            ${escapeString(exports.DEFAULT_SYSTEM_CONFIG.demo_account_password)},
            ${escapeString(exports.DEFAULT_SYSTEM_CONFIG.qiniu_img_base_url)},
            ${escapeString(exports.DEFAULT_SYSTEM_CONFIG.qiniu_bucket_name)},
            ${escapeString(exports.DEFAULT_SYSTEM_CONFIG.qiniu_style_suffix)},
            ${escapeString(exports.DEFAULT_SYSTEM_CONFIG.hefeng_weather_api_key)},
            ${escapeString(exports.DEFAULT_SYSTEM_CONFIG.hefeng_weather_api_host)},
            ${escapeString(exports.DEFAULT_SYSTEM_CONFIG.register_tip)},
            NULL
        )
        `
        ]);
    });
}
function validateSystemConfig(systemConfig) {
    if (!systemConfig.admin_email) {
        throw new Error('管理员邮箱不能为空');
    }
}
function getSystemConfig() {
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
        const systemConfig = normalizeSystemConfig(payload);
        validateSystemConfig(systemConfig);
        const dateModify = (0, utility_1.dateFormatter)(new Date());
        yield (0, utility_1.getDataFromDB)(DB_NAME, [
            `
        INSERT INTO ${TABLE_NAME} (
            id,
            admin_email,
            is_show_demo_account,
            demo_account,
            demo_account_password,
            qiniu_img_base_url,
            qiniu_bucket_name,
            qiniu_style_suffix,
            hefeng_weather_api_key,
            hefeng_weather_api_host,
            register_tip,
            date_modify
        ) VALUES (
            1,
            ${escapeString(systemConfig.admin_email)},
            ${systemConfig.is_show_demo_account ? 1 : 0},
            ${escapeString(systemConfig.demo_account)},
            ${escapeString(systemConfig.demo_account_password)},
            ${escapeString(systemConfig.qiniu_img_base_url)},
            ${escapeString(systemConfig.qiniu_bucket_name)},
            ${escapeString(systemConfig.qiniu_style_suffix)},
            ${escapeString(systemConfig.hefeng_weather_api_key)},
            ${escapeString(systemConfig.hefeng_weather_api_host)},
            ${escapeString(systemConfig.register_tip)},
            ${escapeString(dateModify)}
        )
        ON DUPLICATE KEY UPDATE
            admin_email = VALUES(admin_email),
            is_show_demo_account = VALUES(is_show_demo_account),
            demo_account = VALUES(demo_account),
            demo_account_password = VALUES(demo_account_password),
            qiniu_img_base_url = VALUES(qiniu_img_base_url),
            qiniu_bucket_name = VALUES(qiniu_bucket_name),
            qiniu_style_suffix = VALUES(qiniu_style_suffix),
            hefeng_weather_api_key = VALUES(hefeng_weather_api_key),
            hefeng_weather_api_host = VALUES(hefeng_weather_api_host),
            register_tip = VALUES(register_tip),
            date_modify = VALUES(date_modify)
        `
        ]);
        return getSystemConfig();
    });
}
function verifyAdmin(userInfo) {
    if (userInfo.group_id !== User_1.EnumUserGroup.ADMIN) {
        throw new Response_1.ResponseError('', '仅管理员可操作系统配置');
    }
}
