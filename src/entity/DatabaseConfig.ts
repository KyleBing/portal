interface DatabaseConfig {
    host: string,
    user: string,
    password: string,
    port: number,
    multipleStatements: boolean, // 允许同时请求多条 sql 语句
    timezone: string
}

export {
    DatabaseConfig
}
