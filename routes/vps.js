const express = require('express')
const router = express.Router()
const utility = require('../config/utility')
const ResponseSuccess = require('../response/ResponseSuccess')
const ResponseError = require('../response/ResponseError')
const configProject = require("../config/configProject")
const axios = require("axios");

// BandwagonHost Command List
const BandwagonHostCommand = {
    start                : "start",
    stop                 : "stop",
    restart              : "restart",
    kill                 : "kill",
    getServiceInfo       : "getServiceInfo",
    getLiveServiceInfo   : "getLiveServiceInfo",
    getAvailableOS       : "getAvailableOS",
    reinstallOS          : "reinstallOS",
    resetRootPassword    : "resetRootPassword",
    getUsageGraphs       : "getUsageGraphs",
    getRawUsageStats     : "getRawUsageStats",
    setHostname          : "setHostname",
    setPTR               : "setPTR",
    getSuspensionDetails : "getSuspensionDetails",
    getRateLimitStatus   : "getRateLimitStatus"
}


router.get('/', (req, res, next) => {
    const url = `https://api.64clouds.com/v1/${BandwagonHostCommand.getLiveServiceInfo}?veid=${configProject.vpsVEID}&api_key=${configProject.apiKey}`

    axios.get(url)
        .then(res => {

        })
        .catch(err => {

        })


    let info =  json_decode(file_get_contents($request));

// 存储单位转换
    let convertG = 1024 * 1024 * 1024;
    let convertM = 1024 * 1024;

    let multi = info.monthly_data_multiplier;

// 流量数据
    let dataUsage = Math.round((info.data_counter * multi / convertG),1);
    let dataFull = Math.round((info.plan_monthly_data * multi / convertG),1);
    let dataRemain = dataFull - dataUsage;
    let dataPercentage = dataRemain / dataFull;

// 硬盘数据
    let diskUsage = Math.round((info.ve_used_disk_space_b / convertG),1);
    let diskFull = Math.round((info.plan_disk / convertG),1);
    let diskRemain = diskFull - diskUsage;
    let diskPercentage = diskRemain / diskFull;

// 内存数据
    let memLeft = Math.round((info.mem_available_kb / 1024),0);
    let memFull = Math.round((info.plan_ram / convertM),0);
    let memUsage = memFull - memLeft;
    let memPercentage = memLeft / memFull;

    let output = Math.round(dataUsage,1) + "G / " + Math.round(dataMonth,1) +"G";



    res.send(new ResponseSuccess(response, '处理成功'))

})

module.exports = router
