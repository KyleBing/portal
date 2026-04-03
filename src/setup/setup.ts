import express from "express"

import {ResponseError, ResponseSuccess} from "../response/Response"
import {initializeDatabase} from "../init/initService"
import {getSetupStatus, saveSetupConfig} from "./setupService"

const router = express.Router()

// 安装向导首页先读取当前状态，决定是继续配置、执行初始化还是直接提示已完成。
router.get('/status', (_req, res) => {
    res.send(new ResponseSuccess(getSetupStatus(), '请求成功'))
})

// 写入数据库配置和项目配置，但只允许在初始化前执行。
router.post('/config', async (req, res) => {
    try {
        const data = await saveSetupConfig(req.body || {})
        res.send(new ResponseSuccess(data, '配置已保存，当前服务已同步新配置，建议随后重启服务'))
    } catch (err) {
        const message = err instanceof Error ? err.message : '保存配置失败'
        res.send(new ResponseError(err, message))
    }
})

// 初始化接口复用旧逻辑服务，便于页面调用和后续扩展。
router.post('/init', async (_req, res) => {
    try {
        const initResult = await initializeDatabase()
        if (initResult.alreadyInitialized) {
            res.send(new ResponseError(initResult.data, initResult.message))
            return
        }
        res.send(new ResponseSuccess(initResult.data, initResult.message))
    } catch (err) {
        const message = err instanceof Error ? err.message : '初始化失败'
        res.send(new ResponseError(err, message))
    }
})

export default router
