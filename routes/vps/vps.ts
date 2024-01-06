import {
    dateFormatter,
    formatMoney,
    getDataFromDB,
    processBillOfDay,
    unicodeDecode, unicodeEncode,
    updateUserLastLoginTime,
    verifyAuthorization
} from "../../config/utility";
import express = require("express")
const routerVPSBandwagonHost = express.Router()

import {Response, Request} from "express";
import {ResponseError} from "../../response/ResponseError";
import {ResponseSuccess} from "../../response/ResponseSuccess";
import {CONFIG_PROJECT} from "../../config/config";
import crypto from 'crypto'

const axios = require("axios");

// BandwagonHost Command List
const BandwagonHostCommand = {
    start: "start",
    stop: "stop",
    restart: "restart",
    kill: "kill",
    getServiceInfo: "getServiceInfo",
    getLiveServiceInfo: "getLiveServiceInfo",
    getAvailableOS: "getAvailableOS",
    reinstallOS: "reinstallOS",
    resetRootPassword: "resetRootPassword",
    getUsageGraphs: "getUsageGraphs",
    getRawUsageStats: "getRawUsageStats",
    setHostname: "setHostname",
    setPTR: "setPTR",
    getSuspensionDetails: "getSuspensionDetails",
    getRateLimitStatus: "getRateLimitStatus"
}

routerVPSBandwagonHost.get('/bandwagonhost', (req: Request, res: Response, next) => {
    const url = `https://api.64clouds.com/v1/${BandwagonHostCommand.getLiveServiceInfo}?veid=${CONFIG_PROJECT.vpsVEID}&api_key=${CONFIG_PROJECT.vpsApiKey}`

    axios
        .get(url)
        .then(resVps => {
            res.send(new ResponseSuccess(resVps.data, '获取 VPS 信息成功'))
        })
        .catch(err => {
            res.send(new ResponseError(err, err.message))
        })
})


routerVPSBandwagonHost.get('/justmysocks', (req: Request, res: Response, next) => {
    const url = 'https://justmysocks5.net/members/getbwcounter.php?service=622366&id=f6f5ae7c-df75-41e9-8891-ea90292e66ac'



    axios
        .get(url)
        .then(resVps => {
            let data = resVps.data
            // const data = {
            //     "monthly_bw_limit_b": 500000000000,
            //     "bw_counter_b": 560877794,
            //     "bw_reset_day_of_month": 2
            // }

            // const byteUnit = 1024
            const byteUnit = 1000

            let monthAmount = Number((data.monthly_bw_limit_b / byteUnit / byteUnit / byteUnit).toFixed(2) )
            let monthUsage  = Number((data.bw_counter_b / byteUnit / byteUnit / byteUnit).toFixed(2) )
            let monthResetDay = data.bw_reset_day_of_month
            res.send(new ResponseSuccess({
                monthAmount,
                monthUsage,
                monthResetDay
            }, '获取 VPS 信息成功'))
        })
        .catch(err => {
            res.send(new ResponseError(err, err.message))
        })
})

export {routerVPSBandwagonHost}
