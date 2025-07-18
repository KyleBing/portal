import express from "express"
import {ResponseError, ResponseSuccess} from "../response/Response";
import {
    getDataFromDB,
    verifyAuthorization
} from "../utility";
import configProject from "../../config/configProject.json"
const router = express.Router()

// 统计数据，后台用的
router.get('/', (req, res) => {
    verifyAuthorization(req)
        .then(userInfo => {
            let sqlArray = []
            if (userInfo.group_id === 1) {
                sqlArray.push(`
                        SELECT
                          (SELECT COUNT(*) FROM diaries) as count_diary,
                          (SELECT COUNT(*) FROM qrs) as count_qr,
                          (SELECT COUNT(*) FROM users) as count_user,
                          (SELECT COUNT(*) FROM diary_category) as count_category,
                          (SELECT COUNT(*) FROM diaries where category = 'bill') as count_bill,
                          (SELECT COUNT(*) FROM wubi.wubi_dict) as count_dict,
                          (SELECT COUNT(*) FROM wubi.wubi_words ) as count_wubi_words,
                          (SELECT COUNT(*) FROM wubi.wubi_words where approved = 0) as count_wubi_words_unapproved,
                          (SELECT COUNT(*) FROM wubi.wubi_words where approved = 0 and user_init = ${userInfo.uid} ) as count_wubi_words_unapproved_user
                    `)
            } else {
                sqlArray.push(`
                            SELECT
                              (SELECT COUNT(*) FROM diaries where uid = ${userInfo.uid}) as count_diary,
                              (SELECT COUNT(*) FROM qrs where uid = ${userInfo.uid}) as count_qr,
                              (SELECT COUNT(*) FROM users where uid = ${userInfo.uid}) as count_user,
                              (SELECT COUNT(*) FROM diary_category) as count_category,
                              (SELECT COUNT(*) FROM diaries where uid = ${userInfo.uid} and category = 'bill') as count_bill,
                              (SELECT COUNT(*) FROM wubi.wubi_dict where uid = ${userInfo.uid}) as count_dict,
                              (SELECT COUNT(*) FROM wubi.wubi_words ) as count_wubi_words,
                              (SELECT COUNT(*) FROM wubi.wubi_words where approved = 0) as count_wubi_words_unapproved,
                              (SELECT COUNT(*) FROM wubi.wubi_words where approved = 0 and user_init = ${userInfo.uid} ) as count_wubi_words_unapproved_user
                        `)
            }
            getDataFromDB('diary', sqlArray, true)
                .then(data => {
                    res.send(new ResponseSuccess(data))
                })
                .catch(err => {
                    res.send(new ResponseError('', err.message))
                })
        })
        .catch(errInfo => {
            res.send(new ResponseError('', errInfo))
        })
})

// 用户统计 - 日记
router.get('/user-data-diary', (req, res) => {
    verifyAuthorization(req)
        .then(userInfo => {
            let sqlArray = []
            sqlArray.push(`SELECT nickname, count_diary FROM users where count_diary > 3 order by count_diary desc`)
            getDataFromDB('diary', sqlArray)
                .then(data => {
                    res.send(new ResponseSuccess(data))
                })
                .catch(err => {
                    res.send(new ResponseError('', err.message))
                })
        })
        .catch(errInfo => {
            res.send(new ResponseError('', errInfo))
        })
})

// 用户统计 - 词条
router.get('/user-data-words', (req, res) => {
    verifyAuthorization(req)
        .then(userInfo => {
            let sqlArray = []
            sqlArray.push(`SELECT nickname, count_words FROM users where count_words != 0 order by count_words desc`)
            getDataFromDB('diary', sqlArray)
                .then(data => {
                    res.send(new ResponseSuccess(data))
                })
                .catch(err => {
                    res.send(new ResponseError('', err.message))
                })
        })
        .catch(errInfo => {
            res.send(new ResponseError('', errInfo))
        })
})

// 日记类别数据
router.get('/category', (req, res) => {
    verifyAuthorization(req)
        .then(userInfo => {
            // 1. get categories list
            getDataFromDB('diary', [` select * from diary_category order by sort_id asc`])
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

                        getDataFromDB('diary', sqlArray, true)
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
        .catch(errInfo => {
            res.send(new ResponseError('', errInfo))
        })
})

// 年份月份数据
router.get('/year', (req, res) => {
    verifyAuthorization(req)
        .then(userInfo => {
            let yearNow = new Date().getFullYear()
            let sqlRequests = []
            for (let year = configProject.year_data_start; year <= yearNow; year++) {
                let sqlArray = []
                sqlArray.push(`
                select 
                    date_format(date,'%m') as month,
                    count(*) as 'count',
                    ${year} as year
                    from diaries 
                where year(date) = ${year}
                    and uid = ${userInfo.uid}
                group by month
                order by month desc
        `)
                sqlRequests.push(getDataFromDB('diary', sqlArray))
            }
            // 这里有个异步运算的弊端，所有结果返回之后，我需要重新给他们排序，因为他们的返回顺序是不定的。难搞哦
            Promise
                .all(sqlRequests)
                .then(results => {
                    let response = []
                    results.forEach(monthDataArray => {
                        if (monthDataArray.length > 0) { // 只统计有数据的年份
                            response.push({
                                year: monthDataArray[0].year,
                                count: monthDataArray.map(item => item.count).reduce((a, b) => a + b),
                                months: monthDataArray.map(item => {
                                    item.id = `${item.year}${item.month}`
                                    delete item.year; 
                                    return item
                                })
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
        .catch(errInfo => {
            res.send(new ResponseError('', errInfo))
        })

})

// 用户统计信息
router.get('/users', (req, res) => {
    verifyAuthorization(req)
    .then(userInfo => {
        let sqlArray = []
        sqlArray.push(`
                            select uid, last_visit_time, nickname, register_time, count_diary, count_dict, count_map_route, sync_count
                            from users where count_diary >= 5 or sync_count >= 5 or count_map_route >=1
                        `)
        getDataFromDB('diary', sqlArray)
            .then(data => {
                res.send(new ResponseSuccess(data))
            })
            .catch(err => {
                res.send(new ResponseError(err, err.message))
            })
    })
    .catch(errInfo => {
        res.send(new ResponseError('', errInfo))
    })
})

// 气温统计
router.get('/weather', (req, res) => {
    verifyAuthorization(req)
        .then(userInfo => {
            let sqlArray = [`select temperature, temperature_outside, date from diaries where category = 'life' and uid = '${userInfo.uid}'`]
            getDataFromDB('diary', sqlArray)
                .then(weatherData => {
                    res.send(new ResponseSuccess(weatherData, '请求成功'))
                })
                .catch(err => {
                    res.send(new ResponseError(err, '数据库请求错误'))
                })
        })
        .catch(errInfo => {
            res.send(new ResponseError('', errInfo))
        })

})

export default router
