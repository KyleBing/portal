import express from "express"
import {ResponseError} from "../response/Response"
import {formatInitResultHtml, InitDatabaseError, initializeDatabase} from "./initService"

const router = express.Router()

router.get('/', async (_req, res) => {
    try {
        const initResult = await initializeDatabase()
        res.send(formatInitResultHtml(initResult))
    } catch (err) {
        const message = err instanceof Error ? err.message : '初始化失败'
        const data = err instanceof InitDatabaseError ? err.data : err
        res.send(new ResponseError(data, message))
    }
})

export default router
