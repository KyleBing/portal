const express = require('express')
const router = express.Router()
const utility = require('../config/utility')
const ResponseSuccess = require("../response/ResponseSuccess");
const ResponseError = require("../response/ResponseError");
const configProject = require("../config/configProject")

// 统计数据
router.get('/', (req, res, next) => {
    if (!req.query.uid || !req.query.token) {
        res.send(new ResponseError('', '参数错误：uid 未定义'))
        return
    }

    utility.verifyAuthorization(req)
        .then(userInfo => {
            updateUsersInfo()
            let sqlArray = []
            if (userInfo.group_id === 1) {
                sqlArray.push(`
                        SELECT
                          (SELECT COUNT(*) FROM diaries) as count_diary,
                          (SELECT COUNT(*) FROM qrs) as count_qr,
                          (SELECT COUNT(*) FROM wubi_dict) as count_dict,
                          (SELECT COUNT(*) FROM users) as count_user,
                          (SELECT COUNT(*) FROM diary_category) as count_category,
                          (SELECT COUNT(*) FROM diaries where category = 'bill') as count_bill
                    `)
            } else {
                sqlArray.push(`
                            SELECT
                              (SELECT COUNT(*) FROM diaries where uid = ${req.query.uid}) as count_diary,
                              (SELECT COUNT(*) FROM qrs where uid = ${req.query.uid}) as count_qr,
                              (SELECT COUNT(*) FROM wubi_dict where uid = ${req.query.uid}) as count_dict,
                              (SELECT COUNT(*) FROM users where uid = ${req.query.uid}) as count_user,
                              (SELECT COUNT(*) FROM diary_category) as count_category,
                              (SELECT COUNT(*) FROM diaries where uid = ${req.query.uid} and category = 'bill') as count_bill
                        `)
            }
            utility.getDataFromDB(sqlArray, true)
                .then(data => {
                    res.send(new ResponseSuccess(data))
                })
                .catch(err => {
                    res.send(new ResponseError('', err.message))
                })
        })
        .catch(err => {
            res.send(new ResponseError('', '用户信息错误'))
        })
})

// 日记类别数据
router.get('/category', (req, res, next) => {
    if (!req.query.uid || !req.query.token) {
        res.send(new ResponseError('', '参数错误：uid 未定义'))
        return
    }

    // 1. get categories list
    utility.getDataFromDB([` select * from diary_category order by id asc`])
        .then(categoryListData => {
            if (categoryListData) {
                // categoryListData = [{"id": 1, "name_en": "life", "name": "生活", "count": 0, "color": "#FF9500", "date_init": "2022-03-23T13:23:02.000Z"}]
                let tempArray = categoryListData.map(item => {
                    return `count(case when category='${item.name_en}' then 1 end) as ${item.name_en}`
                })
                let sqlArray = []
                sqlArray.push(`
                    select  
                   ${tempArray.join(', ')},
                    count(case when is_public='1' then 1 end) as shared,
                    count(*) as amount
                    from diaries where uid='${req.query.uid}'
            `)

                utility.getDataFromDB(sqlArray, true)
                    .then(data => {
                        res.send(new ResponseSuccess(data))
                    })
                    .catch(err => {
                        res.send(new ResponseError(err,))
                    })
            } else {
                res.send(new ResponseError('', '类别列表查询出错'))
            }
        })
        .catch(err => {
            res.send(new ResponseError(err,))
        })


})

// 年份月份数据
router.get('/year', (req, res, next) => {
    if (!req.query.uid || !req.query.token) {
        res.send(new ResponseError('', '参数错误：uid 未定义'))
        return
    }
    let yearNow = new Date().getFullYear()
    let sqlRequests = []
    for (let year = 1991; year <= yearNow; year++) {
        let sqlArray = []
        sqlArray.push(`
                select 
                date_format(date,'%Y%m') as id,
                date_format(date,'%m') as month,
                count(*) as 'count'
                from diaries 
                where year(date) = ${year}
                and uid = ${req.query.uid}
                group by month
                order by month desc
        `)
        sqlRequests.push(utility.getDataFromDB(sqlArray))
    }
    // 这里有个异步运算的弊端，所有结果返回之后，我需要重新给他们排序，因为他们的返回顺序是不定的。难搞哦
    Promise.all(sqlRequests)
        .then(values => {
            let response = []
            values.forEach(data => {
                if (data.length > 0) { // 只统计有数据的年份
                    response.push({
                        year: data[0].id.substring(0, 4),
                        count: data.map(item => item.count).reduce((a, b) => a + b),
                        months: data
                    })
                }
            })
            response.sort((a, b) => a.year > b.year ? 1 : -1)
            res.send(new ResponseSuccess(response))
        })
        .catch(err => {
            res.send(new ResponseError(err, err.message))
        })
})

// 用户统计信息
router.get('/users', (req, res, next) => {
    if (!req.query.uid || !req.query.token) {
        res.send(new ResponseError('参数错误：uid 未定义'))
        return
    }

    updateUsersInfo()
        .then(() => {
            utility.verifyAuthorization(req)
                .then(verified => {
                    if (req.query.email === configProject.adminCount) {
                        let sqlArray = []
                        sqlArray.push(`
                                select uid, email, last_visit_time, nickname, register_time, count_diary, count_dict
                                from users
                            `)

                        utility.getDataFromDB(sqlArray)
                            .then(data => {
                                res.send(new ResponseSuccess(data))
                            })
                            .catch(err => {
                                res.send(new ResponseError(err, err.message))
                            })
                    } else {
                        res.send(new ResponseError('', '没有权限查看此信息'))
                    }

                })
                .catch(err => {
                    res.send(new ResponseError(err, err.message))
                })
        })
})

// 更新所有用户统计数据
function updateUsersInfo() {
    return new Promise((resolve, reject) => {
        utility.getDataFromDB([`select * from users`])
            .then(data => {
                let sqlArray = []
                data.forEach(user => {
                    sqlArray.push(`update users set count_diary = (SELECT count(*) from diaries where uid = ${user.uid}) where uid = ${user.uid};`)
                    sqlArray.push(`update users set count_dict  = (SELECT count(*) from wubi_dict where uid = ${user.uid}) where uid = ${user.uid};`)
                    sqlArray.push(`update users set count_qr  = (SELECT count(*) from qrs where uid = ${user.uid}) where uid = ${user.uid};`)
                })
                utility.getDataFromDB(sqlArray, true)
                    .then(data => {
                        console.log(`success: user's count diary|dict has updated`)
                        resolve()
                    })
                    .catch(err => {
                        console.log(`error:  user count diary|dict update`)
                        reject()
                    })
            })
            .catch(err => {
                console.log('error: get users info')
                reject()
            })
    })
}

module.exports = router
