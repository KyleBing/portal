import mysql from "mysql2"
import path from "path"
import {readFile, writeFile} from "fs/promises"

import {dateFormatter} from "../utility"
import {getDatabaseConfig, getLockFileName, getLockFilePath, isDatabaseInitialized} from "../setup/setupService"

const DB_NAME = 'diary'
const MYSQL_CONNECT_TIMEOUT_MS = 5000

type InitStage = 'connect_mysql' | 'create_database' | 'create_tables' | 'create_lock_file'

type MysqlErrorLike = Error & {
    code?: string
    errno?: number
    sqlState?: string
}

const INIT_STAGE_LABEL: Record<InitStage, string> = {
    connect_mysql: '连接数据库',
    create_database: '创建数据库',
    create_tables: '创建数据表',
    create_lock_file: '创建锁文件'
}

export class InitDatabaseError extends Error {
    readonly data: {
        stage: InitStage
        step: string
        code: string | null
        errno: number | null
        sqlState: string | null
        detail: string
    }

    constructor(stage: InitStage, err: unknown) {
        const detail = err instanceof Error ? err.message : '未知错误'
        const mysqlError = err as MysqlErrorLike
        super(`${INIT_STAGE_LABEL[stage]}失败：${detail}`)
        this.name = 'InitDatabaseError'
        this.data = {
            stage,
            step: INIT_STAGE_LABEL[stage],
            code: mysqlError?.code || null,
            errno: typeof mysqlError?.errno === 'number' ? mysqlError.errno : null,
            sqlState: mysqlError?.sqlState || null,
            detail
        }
    }
}

function createInitDatabaseError(stage: InitStage, err: unknown) {
    return new InitDatabaseError(stage, err)
}

function getMysqlConnectionConfig(options?: {
    database?: string
    multipleStatements?: boolean
}) {
    const databaseConfig = getDatabaseConfig()
    return {
        host: databaseConfig.host,
        user: databaseConfig.user,
        password: databaseConfig.password,
        port: databaseConfig.port,
        timezone: databaseConfig.timezone,
        connectTimeout: MYSQL_CONNECT_TIMEOUT_MS,
        database: options?.database,
        multipleStatements: options?.multipleStatements
    }
}

// mysql2 仍是回调风格，这里做一层 Promise 包装，方便初始化流程串行执行和统一错误处理。
function connectMysql(connection: mysql.Connection) {
    return new Promise<void>((resolve, reject) => {
        connection.connect(err => {
            if (err) {
                reject(err)
            } else {
                resolve()
            }
        })
    })
}

function queryMysql(connection: mysql.Connection, sql: string) {
    return new Promise((resolve, reject) => {
        connection.query(sql, [], (err, result) => {
            if (err) {
                reject(err)
            } else {
                resolve(result)
            }
        })
    })
}

function closeMysql(connection: mysql.Connection) {
    return new Promise<void>((resolve) => {
        if (!connection.threadId) {
            connection.destroy()
            resolve()
            return
        }

        try {
            connection.end(() => resolve())
        } catch (_err) {
            connection.destroy()
            resolve()
        }
    })
}

// 第一步只连到 MySQL 服务本身，用来确保 diary 数据库存在。
async function createDatabase() {
    const connection = mysql.createConnection(getMysqlConnectionConfig())

    try {
        try {
            await connectMysql(connection)
        } catch (err) {
            throw createInitDatabaseError('connect_mysql', err)
        }

        try {
            await queryMysql(connection, `CREATE DATABASE IF NOT EXISTS ${DB_NAME}`)
        } catch (err) {
            throw createInitDatabaseError('create_database', err)
        }
    } finally {
        await closeMysql(connection)
    }
}

async function createTables() {
    const connection = mysql.createConnection(getMysqlConnectionConfig({
        database: DB_NAME,
        multipleStatements: true
    }))

    try {
        try {
            await connectMysql(connection)
        } catch (err) {
            throw createInitDatabaseError('connect_mysql', err)
        }

        try {
            // 初始化 SQL 文件会在构建时一并复制到 dist 中，所以这里始终按当前运行目录读取即可。
            const sqlFilePath = path.join(__dirname, 'init.sql')
            const sqlCreateTables = await readFile(sqlFilePath, 'utf8')
            await queryMysql(connection, sqlCreateTables)
        } catch (err) {
            throw createInitDatabaseError('create_tables', err)
        }
    } finally {
        await closeMysql(connection)
    }
}

async function createLockFile() {
    await writeFile(
        getLockFilePath(),
        `Database has been locked, file add in ${dateFormatter(new Date())}`,
        'utf8'
    )
}

// 对外暴露统一初始化入口，供旧的 /init 页面和新的安装向导接口复用。
export async function initializeDatabase() {
    if (isDatabaseInitialized()) {
        return {
            alreadyInitialized: true,
            message: `该数据库已被初始化过，如果想重新初始化，请先删除项目中 ${getLockFileName()} 文件`,
            data: {
                dbName: DB_NAME,
                lockFileName: getLockFileName()
            }
        }
    }

    await createDatabase()
    await createTables()

    try {
        await createLockFile()
    } catch (err) {
        throw createInitDatabaseError('create_lock_file', err)
    }

    return {
        alreadyInitialized: false,
        message: '数据库初始化成功',
        data: {
            dbName: DB_NAME,
            tableNames: ['users', 'user_group', 'diaries', 'diary_category', 'qrs', 'invitations'],
            lockFileName: getLockFileName()
        }
    }
}

export function formatInitResultHtml(initResult: Awaited<ReturnType<typeof initializeDatabase>>) {
    // 旧接口直接返回 HTML 文本，这里保留格式化函数，避免老入口行为变化。
    if (initResult.alreadyInitialized) {
        return `该数据库已被初始化过，如果想重新初始化，请先删除项目中 <b>${initResult.data.lockFileName}</b> 文件`
    }

    return (
        '数据库初始化成功：<br>' +
        `数据库名： ${initResult.data.dbName}<br>` +
        `创建 6 张表：${initResult.data.tableNames.join('、')} <br>` +
        `已创建数据库锁定文件： ${initResult.data.lockFileName}`
    )
}
