import bcrypt from "bcrypt"
import mysql from "mysql2"

import {EnumUserGroup, EntityUser} from "entity/User"
import {ResponseError} from "../response/Response"
import {dateFormatter, getDataFromDB} from "../utility"
import {isDatabaseInitialized} from "../setup/setupService"

export interface SystemConfig {
    admin_email: string
    is_show_demo_account: boolean
    demo_account: string
    demo_account_password: string
    qiniu_img_base_url: string
    qiniu_bucket_name: string
    qiniu_style_suffix: string
    hefeng_weather_api_key: string
    hefeng_weather_api_host: string
    register_tip: string
}

const DB_NAME = 'diary'
const TABLE_NAME = 'system_config'
const USERS_TABLE = 'users'

export const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
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
}

function parseBoolean(value: unknown) {
    return value === true || value === 1 || value === '1' || value === 'true'
}

function normalizeSystemConfig(rawConfig: Partial<SystemConfig> = {}): SystemConfig {
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
    }
}

function escapeString(value: string) {
    return mysql.escape(value)
}

function hashPasswordPlain(plain: string): Promise<string> {
    return new Promise((resolve, reject) => {
        bcrypt.hash(plain, 10, (err, hash) => {
            if (err) {
                reject(err)
            } else {
                resolve(hash)
            }
        })
    })
}

function bcryptCompare(plain: string, hash: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
        bcrypt.compare(plain, hash, (err, ok) => {
            if (err) {
                reject(err)
            } else {
                resolve(!!ok)
            }
        })
    })
}

function deriveDemoNickname(email: string): string {
    const local = email.split('@')[0] || '演示'
    return local.slice(0, 20)
}

function deriveDemoUsernameBase(email: string): string {
    const local = email.split('@')[0] || 'demo'
    const sanitized = local.toLowerCase().replace(/[^a-z0-9_]/g, '')
    const base = (sanitized || 'demo').slice(0, 20)
    return base
}

async function pickUniqueDemoUsername(base: string): Promise<string> {
    const trimmed = base.slice(0, 20)
    for (let i = 0; i < 10000; i++) {
        const suffix = i === 0 ? '' : String(i)
        const maxBaseLen = Math.max(1, 20 - suffix.length)
        const candidate = (trimmed.slice(0, maxBaseLen) + suffix).slice(0, 20)
        const row = await getDataFromDB(
            DB_NAME,
            [`SELECT uid FROM ${USERS_TABLE} WHERE username = ${escapeString(candidate)} LIMIT 1`],
            true
        )
        if (!row) {
            return candidate
        }
    }
    throw new Error('无法为演示账号生成唯一用户名，请更换演示邮箱后重试')
}

/** 保存「显示演示账号」时：无则创建用户；有则若明文密码与库中哈希不一致则更新密码。 */
async function syncDemoAccountUser(systemConfig: SystemConfig) {
    if (!systemConfig.is_show_demo_account) {
        return
    }

    const email = systemConfig.demo_account.trim()
    const plainPassword = systemConfig.demo_account_password

    const row = await getDataFromDB(
        DB_NAME,
        [`SELECT uid, password, group_id FROM ${USERS_TABLE} WHERE email = ${escapeString(email)} LIMIT 1`],
        true
    )

    if (!row) {
        const encryptPassword = await hashPasswordPlain(plainPassword)
        const timeNow = dateFormatter(new Date())
        const nickname = deriveDemoNickname(email)
        const baseUser = deriveDemoUsernameBase(email)
        const username = await pickUniqueDemoUsername(baseUser)

        await getDataFromDB(DB_NAME, [
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
                ${EnumUserGroup.USER}
            )
            `
        ])
        return
    }

    const passwordOk = await bcryptCompare(plainPassword, String(row.password || ''))
    if (passwordOk) {
        return
    }

    const encryptPassword = await hashPasswordPlain(plainPassword)
    await getDataFromDB(
        DB_NAME,
        [
            `UPDATE ${USERS_TABLE} SET password = ${escapeString(encryptPassword)} WHERE uid = ${Number(row.uid)} LIMIT 1`
        ],
        true
    )
}

async function ensureSystemConfigTable() {
    await getDataFromDB(DB_NAME, [
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
    ])

    await getDataFromDB(DB_NAME, [
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
            ${escapeString(DEFAULT_SYSTEM_CONFIG.admin_email)},
            ${DEFAULT_SYSTEM_CONFIG.is_show_demo_account ? 1 : 0},
            ${escapeString(DEFAULT_SYSTEM_CONFIG.demo_account)},
            ${escapeString(DEFAULT_SYSTEM_CONFIG.demo_account_password)},
            ${escapeString(DEFAULT_SYSTEM_CONFIG.qiniu_img_base_url)},
            ${escapeString(DEFAULT_SYSTEM_CONFIG.qiniu_bucket_name)},
            ${escapeString(DEFAULT_SYSTEM_CONFIG.qiniu_style_suffix)},
            ${escapeString(DEFAULT_SYSTEM_CONFIG.hefeng_weather_api_key)},
            ${escapeString(DEFAULT_SYSTEM_CONFIG.hefeng_weather_api_host)},
            ${escapeString(DEFAULT_SYSTEM_CONFIG.register_tip)},
            NULL
        )
        `
    ])
}

function validateSystemConfig(systemConfig: SystemConfig) {
    if (!systemConfig.admin_email) {
        throw new Error('管理员邮箱不能为空')
    }
    if (systemConfig.is_show_demo_account) {
        const demoEmail = systemConfig.demo_account.trim()
        if (!demoEmail) {
            throw new Error('启用演示账号时，演示账号邮箱不能为空')
        }
        if (demoEmail.length > 50) {
            throw new Error('演示账号邮箱长度不能超过 50 个字符')
        }
        if (!systemConfig.demo_account_password) {
            throw new Error('启用演示账号时，演示账号密码不能为空')
        }
    }
}

export async function getSystemConfig() {
    if (!isDatabaseInitialized()) {
        return normalizeSystemConfig(DEFAULT_SYSTEM_CONFIG)
    }

    await ensureSystemConfigTable()
    const data = await getDataFromDB(DB_NAME, [`SELECT * FROM ${TABLE_NAME} WHERE id = 1 LIMIT 1`], true)
    return normalizeSystemConfig(data || DEFAULT_SYSTEM_CONFIG)
}

export async function saveSystemConfig(payload: Partial<SystemConfig>) {
    if (!isDatabaseInitialized()) {
        throw new Error('系统尚未初始化，暂时不能保存系统配置')
    }

    await ensureSystemConfigTable()
    const systemConfig = normalizeSystemConfig(payload)
    validateSystemConfig(systemConfig)
    const dateModify = dateFormatter(new Date())

    await getDataFromDB(DB_NAME, [
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
    ])

    await syncDemoAccountUser(systemConfig)

    return getSystemConfig()
}

export function verifyAdmin(userInfo: EntityUser) {
    if (userInfo.group_id !== EnumUserGroup.ADMIN) {
        throw new ResponseError('', '仅管理员可操作系统配置')
    }
}

/** 是否与当前系统配置中的演示账号邮箱一致（用于限制改资料、改密、注销等）。 */
export async function isConfiguredDemoAccountEmail(email: string): Promise<boolean> {
    const cfg = await getSystemConfig()
    const demo = cfg.demo_account.trim()
    return demo.length > 0 && email === demo
}
