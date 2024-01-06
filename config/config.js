
interface ConfigDatabase{
    host: string,
    user: string,
    password: string,
    port: string,
    multipleStatements: boolean, // 允许同时请求多条 sql 语句
    timezone: string
}
const CONFIG_DATABASE: ConfigDatabase = {
    host:       'localhost',
    user:       '----',
    password:   '----',
    port:       '3306',
    multipleStatements: true, // 允许同时请求多条 sql 语句
    timezone: ''
}

interface ConfigProject {
    invitation: string,
    adminCount: string,

    // 七牛云密钥
    qiniuAccessKey: string,
    qiniuSecretKey: string,

    // 微信小程序开发者信息
    wxMiniAppId: string,
    wxMiniSecret: string,

    // 微信公众号
    wxToken: string,
    wxPublicAppId: string,
    wxPublicSecret: string,
}

const CONFIG_PROJECT: ConfigProject = {
    invitation: '----', // 万能注册邀请码，用这个不需要使用系统生成的邀请码
    adminCount: 'xxxx@163.com', // 超级管理员帐户，该用户可以在统计页面中查看所有用户统计数据

    // 七牛云密钥
    qiniuAccessKey: '',
    qiniuSecretKey: '',

    // 微信小程序开发者信息
    wxMiniAppId: '',
    wxMiniSecret: '',

    // 微信公众号
    wxToken: '',
    wxPublicAppId: '',
    wxPublicSecret: '',
}


export {
    CONFIG_DATABASE, CONFIG_PROJECT,
    type ConfigProject, type ConfigDatabase
}

