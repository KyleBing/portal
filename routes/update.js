const express = require('express')
const router = express.Router()
const utility = require('../config/utility')
const ResponseSuccess = require("../response/ResponseSuccess");
const ResponseError = require("../response/ResponseError");


// 更新用户的日记和码表数量统计
router.get('/count', (req, res, next) => {
    utility.getDataFromDB([`select * from users`])
        .then(data => {
            let sqlArray = []
            data.forEach(user => {
                sqlArray.push(`update users set count_diary = (SELECT count(*) from diaries where uid = ${user.uid}) where uid = ${user.uid};`)
                sqlArray.push(`update users set count_dict  = (SELECT count(*) from wubi_dict where uid = ${user.uid}) where uid = ${user.uid};`)

            })
            utility.getDataFromDB(sqlArray, true)
                .then(data => {
                    console.log(`success: user's count diary|dict has updated`)
                    res.send(new ResponseSuccess(null, '用户统计信息更新成功'))
                })
                .catch(err => {
                    console.log(`error:  user count diary|dict update`)
                    res.send(new ResponseError(err, '用户统计信息更新失败'))
                })
        })
        .catch(err => {
            console.log('error: get users info')
        })
})




module.exports = router
