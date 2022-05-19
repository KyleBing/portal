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
    const url = `https://api.64clouds.com/v1/${BandwagonHostCommand.getLiveServiceInfo}?veid=${configProject.vpsVEID}&api_key=${configProject.vpsApiKey}`

    axios.get(url)
        .then(resVps => {
            res.send(new ResponseSuccess(resVps.data, '获取 VPS 信息成功'))
        })
        .catch(err => {
            res.send(new ResponseError(err, err.message))
        })
})

module.exports = router
