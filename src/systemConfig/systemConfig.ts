import express from "express"

import {ResponseError, ResponseSuccess} from "../response/Response"
import {verifyAuthorization} from "../utility"
import {getSystemConfig, saveSystemConfig, verifyAdmin} from "./systemConfigService"

const router = express.Router()

// GET 供全站读取展示信息；写入仅 PUT 且需管理员（verifyAdmin）
router.get('/', async (_req, res) => {
    try {
        const data = await getSystemConfig()
        res.send(new ResponseSuccess(data, '请求成功'))
    } catch (err) {
        const message = err instanceof Error ? err.message : '读取系统配置失败'
        res.send(new ResponseError(err, message))
    }
})

router.put('/', async (req, res) => {
    try {
        const userInfo = await verifyAuthorization(req)
        verifyAdmin(userInfo)

        const data = await saveSystemConfig(req.body || {})
        res.send(new ResponseSuccess(data, '系统配置已保存'))
    } catch (err) {
        if (err instanceof ResponseError) {
            res.send(err)
            return
        }

        const message = err instanceof Error ? err.message : '保存系统配置失败'
        res.send(new ResponseError(err, message))
    }
})

export default router
