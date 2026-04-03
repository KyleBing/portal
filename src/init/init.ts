import express from "express"
import {ResponseError} from "../response/Response"
import {formatInitResultHtml, initializeDatabase} from "./initService"

const router = express.Router()

router.get('/', async (_req, res) => {
    try {
        const initResult = await initializeDatabase()
        res.send(formatInitResultHtml(initResult))
    } catch (err) {
        const message = err instanceof Error ? err.message : '初始化失败'
        res.send(new ResponseError(err, message))
    }
})

export default router
