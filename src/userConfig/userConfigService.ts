import mysql from "mysql2"

import {EntityUser} from "entity/User"
import {dateFormatter, getDataFromDB} from "../utility"

const DB_NAME = 'diary'
const TABLE_NAME = 'user_config'

export interface UserConfig {
    uid: number
    theme: string
    default_diary_category: string
    editor_mode: string
    config_json: Record<string, unknown>
    date_modify: string | null
}

export interface UserConfigPayload {
    theme?: unknown
    default_diary_category?: unknown
    editor_mode?: unknown
    config_json?: unknown
}

const DEFAULT_USER_CONFIG: Omit<UserConfig, 'uid' | 'date_modify'> = {
    theme: '',
    default_diary_category: '',
    editor_mode: '',
    config_json: {}
}

function escapeString(value: string) {
    return mysql.escape(value)
}

function parseConfigJson(value: unknown): Record<string, unknown> {
    if (!value) {
        return {}
    }
    if (typeof value === 'object' && !Array.isArray(value)) {
        return value as Record<string, unknown>
    }
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value)
            return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
        } catch (_err) {
            return {}
        }
    }
    return {}
}

function normalizeUserConfig(uid: number, rawConfig: Partial<UserConfig> = {}): UserConfig {
    return {
        uid,
        theme: String(rawConfig.theme || '').trim(),
        default_diary_category: String(rawConfig.default_diary_category || '').trim(),
        editor_mode: String(rawConfig.editor_mode || '').trim(),
        config_json: parseConfigJson(rawConfig.config_json),
        date_modify: rawConfig.date_modify || null
    }
}

function normalizePayload(payload: UserConfigPayload): Partial<UserConfig> {
    const normalized: Partial<UserConfig> = {}
    if (Object.prototype.hasOwnProperty.call(payload, 'theme')) {
        normalized.theme = String(payload.theme || '').trim()
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'default_diary_category')) {
        normalized.default_diary_category = String(payload.default_diary_category || '').trim()
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'editor_mode')) {
        normalized.editor_mode = String(payload.editor_mode || '').trim()
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'config_json')) {
        normalized.config_json = parseConfigJson(payload.config_json)
    }
    return normalized
}

function validateUserConfig(userConfig: UserConfig) {
    if (userConfig.theme.length > 20) {
        throw new Error('主题长度不能超过 20 个字符')
    }
    if (userConfig.default_diary_category.length > 50) {
        throw new Error('默认日记分类长度不能超过 50 个字符')
    }
    if (userConfig.editor_mode.length > 20) {
        throw new Error('编辑器模式长度不能超过 20 个字符')
    }
}

async function ensureUserConfigTable() {
    await getDataFromDB(DB_NAME, [
        `
        CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
            uid int(11) NOT NULL COMMENT '用户 ID',
            theme varchar(20) NOT NULL DEFAULT '' COMMENT '主题',
            default_diary_category varchar(50) NOT NULL DEFAULT '' COMMENT '默认日记分类',
            editor_mode varchar(20) NOT NULL DEFAULT '' COMMENT '编辑器模式',
            config_json json DEFAULT NULL COMMENT '扩展配置',
            date_modify datetime DEFAULT NULL COMMENT '最后修改时间',
            PRIMARY KEY (uid) USING BTREE,
            CONSTRAINT user_config_uid FOREIGN KEY (uid) REFERENCES users (uid) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        `
    ])
}

export async function getUserConfig(userInfo: EntityUser): Promise<UserConfig> {
    await ensureUserConfigTable()
    const data = await getDataFromDB(
        DB_NAME,
        [`SELECT * FROM ${TABLE_NAME} WHERE uid = ${Number(userInfo.uid)} LIMIT 1`],
        true
    )
    return normalizeUserConfig(userInfo.uid, data || DEFAULT_USER_CONFIG)
}

export async function saveUserConfig(userInfo: EntityUser, payload: UserConfigPayload): Promise<UserConfig> {
    await ensureUserConfigTable()
    const currentConfig = await getUserConfig(userInfo)
    const userConfig = normalizeUserConfig(userInfo.uid, {
        ...currentConfig,
        ...normalizePayload(payload)
    })
    validateUserConfig(userConfig)

    const dateModify = dateFormatter(new Date())
    await getDataFromDB(DB_NAME, [
        `
        INSERT INTO ${TABLE_NAME} (
            uid,
            theme,
            default_diary_category,
            editor_mode,
            config_json,
            date_modify
        ) VALUES (
            ${Number(userConfig.uid)},
            ${escapeString(userConfig.theme)},
            ${escapeString(userConfig.default_diary_category)},
            ${escapeString(userConfig.editor_mode)},
            ${escapeString(JSON.stringify(userConfig.config_json))},
            ${escapeString(dateModify)}
        )
        ON DUPLICATE KEY UPDATE
            theme = VALUES(theme),
            default_diary_category = VALUES(default_diary_category),
            editor_mode = VALUES(editor_mode),
            config_json = VALUES(config_json),
            date_modify = VALUES(date_modify)
        `
    ])

    return getUserConfig(userInfo)
}
