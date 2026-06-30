import express from "express"

import {ResponseError, ResponseSuccess} from "../response/Response"
import {verifyAuthorization} from "../utility"
import {getUserConfig, saveUserConfig} from "./userConfigService"

const router = express.Router()

router.get('/', async (req, res) => {
    try {
        const userInfo = await verifyAuthorization(req)
        const data = await getUserConfig(userInfo)
        res.send(new ResponseSuccess(data, '请求成功'))
    } catch (err) {
        const message = err instanceof Error ? err.message : '读取用户配置失败'
        res.send(new ResponseError(err, message))
    }
})

router.put('/', async (req, res) => {
    try {
        const userInfo = await verifyAuthorization(req)
        const data = await saveUserConfig(userInfo, req.body || {})
        res.send(new ResponseSuccess(data, '用户配置已保存'))
    } catch (err) {
        const message = err instanceof Error ? err.message : '保存用户配置失败'
        res.send(new ResponseError(err, message))
    }
})

export default router
