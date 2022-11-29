const express = require('express')
const router = express.Router()
const utility = require('../config/utility')
const ResponseSuccess = require("../response/ResponseSuccess");
const ResponseError = require("../response/ResponseError");
const configProject = require("../config/configProject")

// 统计数据
router.get('/', (req, res, next) => {
    utility
        .verifyAuthorization(req)
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
                              (SELECT COUNT(*) FROM diaries where uid = ${userInfo.uid}) as count_diary,
                              (SELECT COUNT(*) FROM qrs where uid = ${userInfo.uid}) as count_qr,
                              (SELECT COUNT(*) FROM wubi_dict where uid = ${userInfo.uid}) as count_dict,
                              (SELECT COUNT(*) FROM users where uid = ${userInfo.uid}) as count_user,
                              (SELECT COUNT(*) FROM diary_category) as count_category,
                              (SELECT COUNT(*) FROM diaries where uid = ${userInfo.uid} and category = 'bill') as count_bill
                        `)
            }
            utility
                .getDataFromDB('diary', sqlArray, true)
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
    utility
        .verifyAuthorization(req)
        .then(userInfo => {
            // 1. get categories list
            utility
                .getDataFromDB('diary', [` select * from diary_category order by sort_id asc`])
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
                    from diaries where uid='${userInfo.uid}'
            `)

                        utility
                            .getDataFromDB('diary', sqlArray, true)
                            .then(data => {
                                res.send(new ResponseSuccess(data))
                            })
                            .catch(err => {
                                res.send(new ResponseError(err))
                            })
                    } else {
                        res.send(new ResponseError('', '类别列表查询出错'))
                    }
                })
                .catch(err => {
                    res.send(new ResponseError(err,))
                })
        })
        .catch(err => {
            res.send(new ResponseError(err, '权限错误'))
        })


})

// 年份月份数据
router.get('/year', (req, res, next) => {
    utility
        .verifyAuthorization(req)
        .then(userInfo => {
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
                and uid = ${userInfo.uid}
                group by month
                order by month desc
        `)
                sqlRequests.push(utility.getDataFromDB('diary', sqlArray))
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
        .catch(err => {
            res.send(new ResponseError(err, '权限错误'))
        })

})

// 用户统计信息
router.get('/users', (req, res, next) => {
    updateUsersInfo()
        .then(() => {
            utility
                .verifyAuthorization(req)
                .then(userInfo => {
                    if (userInfo.email === configProject.adminCount) {
                        let sqlArray = []
                        sqlArray.push(`
                                select uid, email, last_visit_time, nickname, register_time, count_diary, count_dict, sync_count
                                from users
                            `)
                        utility
                            .getDataFromDB('diary', sqlArray)
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
        utility
            .getDataFromDB('diary', [`select * from users`])
            .then(data => {
                let sqlArray = []
                data.forEach(user => {
                    sqlArray.push(`update users set count_diary = (SELECT count(*) from diaries where uid = ${user.uid}) where uid = ${user.uid};`)
                    sqlArray.push(`update users set count_dict  = (SELECT count(*) from wubi_dict where uid = ${user.uid}) where uid = ${user.uid};`)
                    sqlArray.push(`update users set count_qr    = (SELECT count(*) from qrs where uid = ${user.uid}) where uid = ${user.uid};`)
                })
                utility
                    .getDataFromDB('diary', sqlArray, true)
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
