import mysql from "mysql2"
import path from "path"
import {readFile, writeFile} from "fs/promises"

import {dateFormatter} from "../utility"
import {getDatabaseConfig, getLockFileName, getLockFilePath, isDatabaseInitialized} from "../setup/setupService"

const DB_NAME = 'diary'

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
        connection.end(() => resolve())
    })
}

// 第一步只连到 MySQL 服务本身，用来确保 diary 数据库存在。
async function createDatabase() {
    const databaseConfig = getDatabaseConfig()
    const connection = mysql.createConnection({
        host: databaseConfig.host,
        user: databaseConfig.user,
        password: databaseConfig.password,
        port: databaseConfig.port,
        timezone: databaseConfig.timezone
    })

    try {
        await connectMysql(connection)
        await queryMysql(connection, `CREATE DATABASE IF NOT EXISTS ${DB_NAME}`)
    } finally {
        await closeMysql(connection)
    }
}

async function createTables() {
    const databaseConfig = getDatabaseConfig()
    const connection = mysql.createConnection({
        host: databaseConfig.host,
        user: databaseConfig.user,
        password: databaseConfig.password,
        port: databaseConfig.port,
        timezone: databaseConfig.timezone,
        database: DB_NAME,
        multipleStatements: true
    })

    try {
        await connectMysql(connection)
        // 初始化 SQL 文件会在构建时一并复制到 dist 中，所以这里始终按当前运行目录读取即可。
        const sqlFilePath = path.join(__dirname, 'init.sql')
        const sqlCreateTables = await readFile(sqlFilePath, 'utf8')
        await queryMysql(connection, sqlCreateTables)
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
    await createLockFile()

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
