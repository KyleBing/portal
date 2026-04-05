import {existsSync} from "fs"
import {mkdir, writeFile} from "fs/promises"
import path from "path"

import configDatabase from "../../config/configDatabase.json"
import {DatabaseConfig} from "entity/DatabaseConfig"
import {getDataFromDB} from "../utility"

export interface SetupStatus {
    isInitialized: boolean  // 是否已初始化
    hasRegisteredUsers: boolean  // 是否已注册用户
    lockFileName: string  // 锁文件名
    configFiles: string[]  // 配置文件列表
    config: null | {
        databaseConfig: DatabaseConfig
    }  // 数据库配置
    restartTips: string[]  // 重启提示
}

const LOCK_FILE_NAME = 'DATABASE_LOCK'

const runtimeRoot = path.resolve(__dirname, '..', '..')
const isDistRuntime = path.basename(runtimeRoot).toLowerCase() === 'dist'
const projectRoot = isDistRuntime ? path.dirname(runtimeRoot) : runtimeRoot

// 运行在源码目录和 dist 目录时，配置文件落点不同，这里统一收口出需要同步写入的目标列表。
function getConfigTargets(fileName: string): string[] {
    const targetSet = new Set<string>()
    targetSet.add(path.join(runtimeRoot, 'config', fileName))

    if (isDistRuntime) {
        const sourceConfigDir = path.join(projectRoot, 'config')
        if (existsSync(sourceConfigDir)) {
            targetSet.add(path.join(sourceConfigDir, fileName))
        }
    } else {
        const distConfigDir = path.join(projectRoot, 'dist', 'config')
        if (existsSync(distConfigDir)) {
            targetSet.add(path.join(distConfigDir, fileName))
        }
    }

    return Array.from(targetSet)
}

function cloneDatabaseConfig(): DatabaseConfig {
    return {
        host: configDatabase.host,
        user: configDatabase.user,
        password: configDatabase.password,
        port: configDatabase.port,
        multipleStatements: configDatabase.multipleStatements,
        timezone: configDatabase.timezone
    }
}

function normalizeDatabaseConfig(rawConfig: Partial<DatabaseConfig>): DatabaseConfig {
    return {
        host: String(rawConfig.host || '').trim(),
        user: String(rawConfig.user || '').trim(),
        password: String(rawConfig.password || ''),
        port: Number(rawConfig.port || 3306),
        multipleStatements:
            rawConfig.multipleStatements !== undefined
                ? Boolean(rawConfig.multipleStatements)
                : configDatabase.multipleStatements,
        timezone: String(rawConfig.timezone || '').trim()
    }
}

function validateDatabaseConfig(databaseConfig: DatabaseConfig) {
    if (!databaseConfig.host) {
        throw new Error('数据库主机不能为空')
    }
    if (!databaseConfig.user) {
        throw new Error('数据库用户名不能为空')
    }
    if (!Number.isInteger(databaseConfig.port) || databaseConfig.port <= 0 || databaseConfig.port > 65535) {
        throw new Error('数据库端口不正确')
    }
}

async function writeJsonFile(filePath: string, data: object) {
    await mkdir(path.dirname(filePath), {recursive: true})
    await writeFile(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8')
}

// 保存向导配置时，同时更新当前运行环境配置和另一侧副本，避免 source / dist 配置漂移。
async function syncConfigFile(fileName: string, data: object) {
    const targets = getConfigTargets(fileName)
    for (const targetPath of targets) {
        await writeJsonFile(targetPath, data)
    }
}

export function getLockFileName() {
    return LOCK_FILE_NAME
}

export function getLockFilePath() {
    return path.join(projectRoot, LOCK_FILE_NAME)
}

export function isDatabaseInitialized() {
    return existsSync(getLockFilePath())
}

export function getDatabaseConfig(): DatabaseConfig {
    return cloneDatabaseConfig()
}

async function hasRegisteredUsers() {
    if (!isDatabaseInitialized()) {
        return false
    }

    try {
        const result = await getDataFromDB('diary', ['select count(*) as userCount from users'], true)
        return Number(result?.userCount || 0) > 0
    } catch (_err) {
        return false
    }
}

// 已初始化后不再回传明文配置，前端只需要看到锁定状态和后续操作提示即可。
export async function getSetupStatus(): Promise<SetupStatus> {
    const isInitialized = isDatabaseInitialized()

    return {
        isInitialized,
        hasRegisteredUsers: await hasRegisteredUsers(),
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
    }
}

export async function saveSetupConfig(payload: {
    databaseConfig?: Partial<DatabaseConfig>
}) {
    // 安装向导只允许在首次初始化前修改，避免已经上线的数据环境被页面误改。
    if (isDatabaseInitialized()) {
        throw new Error(`系统已初始化，如需重新引导，请先删除 ${LOCK_FILE_NAME} 文件`)
    }

    const databaseConfig = normalizeDatabaseConfig(payload.databaseConfig || {})

    validateDatabaseConfig(databaseConfig)

    await syncConfigFile('configDatabase.json', databaseConfig)

    // JSON 模块在 Node 进程内会被缓存，这里同步更新内存对象，让当前进程立即使用新配置。
    Object.assign(configDatabase, databaseConfig)

    return {
        databaseConfig: getDatabaseConfig()
    }
}
