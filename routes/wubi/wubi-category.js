const express = require('express')
const router = express.Router()
const configProject = require('../../config/configProject')
const utility = require('../../config/utility')
const ResponseSuccess = require('../../response/ResponseSuccess')
const ResponseError = require('../../response/ResponseError')

const TABLE_NAME = 'wubi_category'      // 表名
const DATA_NAME = '五笔码表类别'          // 操作的数据名

router.get('/list', (req, res, next) => {
    utility
        .verifyAuthorization(req)
        .then(userInfo => {
            // 1. get categories list
            utility
                .getDataFromDB('diary', [` select * from ${TABLE_NAME} order by sort_id asc`])
                .then(categoryListData => {
                    if (categoryListData) {
                        // categoryListData = [{"id": 1, "name": "主码表", "sort_id": 1, "date_init": "2022-12-09T08:27:08.000Z"}]
                        let tempArray = categoryListData.map(item => {
                            return `count(case when category_id=${item.id} then 1 end) as '${item.id}'`
                        })
                        let sqlArray = []
                        sqlArray.push(`
                                select  
                               ${tempArray.join(', ')},
                                count(*) as amount
                                from wubi_words where user_init=${userInfo.uid}
                        `)

                        utility
                            .getDataFromDB('diary', sqlArray, true)
                            .then(countData => {
                                categoryListData.forEach(category => {
                                    category.count = countData[category.id]
                                })
                                res.send(new ResponseSuccess(categoryListData))
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
router.post('/add', (req, res, next) => {

    checkCategoryExist(req.body.name)
        .then(dataCategoryExistanceArray => {
            // email 记录是否已经存在
            if (dataCategoryExistanceArray.length > 0){
                return res.send(new ResponseError('', `${DATA_NAME}已存在`))
            } else {
                utility
                    .verifyAuthorization(req)
                    .then(userInfo => {
                        if (userInfo.email === configProject.adminCount ){
                            let timeNow = utility.dateFormatter(new Date())
                            // query.name_en
                            let sqlArray = []
                            sqlArray.push(`
                                insert into ${TABLE_NAME}(name, sort_id, date_init)
                                values ('${req.body.name}', ${req.body.sort_id}, '${timeNow}')`
                            )
                            utility
                                .getDataFromDB( 'diary', sqlArray)
                                .then(data => {
                                    if (data) { // 没有记录时会返回  undefined
                                        utility.updateUserLastLoginTime(userInfo.uid)
                                        res.send(new ResponseSuccess({id: data.insertId}, '添加成功')) // 添加成功之后，返回添加后的日记 id
                                    } else {
                                        res.send(new ResponseError('', `${DATA_NAME}查询错误`))
                                    }
                                })
                                .catch(err => {
                                    res.send(new ResponseError(err, `${DATA_NAME}添加失败`))
                                })
                        } else {
                            res.send(new ResponseError('', '无权操作'))
                        }

                    })
                    .catch(err => {
                        res.send(new ResponseError('', err.message))
                    })
            }
        })
})
router.put('/modify', (req, res, next) => {
    utility
        .verifyAuthorization(req)
        .then(userInfo => {
            if (userInfo.email === configProject.adminCount ){
                let timeNow = utility.dateFormatter(new Date())
                // query.name_en
                let sqlArray = []
                sqlArray.push(`
                    update ${TABLE_NAME} set 
                    name = '${req.body.name}',
                    sort_id = '${req.body.sort_id}'
                    where id = '${req.body.id}'
                    `)
                utility
                    .getDataFromDB( 'diary', sqlArray)
                    .then(data => {
                        if (data) { // 没有记录时会返回  undefined
                            utility.updateUserLastLoginTime(userInfo.uid)
                            res.send(new ResponseSuccess({id: data.insertId}, '修改成功')) // 添加成功之后，返回添加后的日记类别 id
                        } else {
                            res.send(new ResponseError('', `${DATA_NAME}操作错误`))
                        }
                    })
                    .catch(err => {
                        res.send(new ResponseError(err, `${DATA_NAME}修改失败`))
                    })
            } else {
                res.send(new ResponseError('', '无权操作'))
            }

        })
        .catch(err => {
            res.send(new ResponseError('', err.message))
        })
})
router.delete('/delete', (req, res, next) => {
    utility
        .verifyAuthorization(req)
        .then(userInfo => {
            if (userInfo.email === configProject.adminCount ){
                let sqlArray = []
                sqlArray.push(`
                    delete from ${TABLE_NAME} 
                               where id = '${req.body.id}'
                    `)
                utility
                    .getDataFromDB( 'diary', sqlArray)
                    .then(data => {
                        if (data) { // 没有记录时会返回  undefined
                            utility.updateUserLastLoginTime(userInfo.uid)
                            res.send(new ResponseSuccess({id: data.insertId}, '删除成功')) // 添加成功之后，返回添加后的日记类别 id
                        } else {
                            res.send(new ResponseError('', '日记类别删除失败'))
                        }
                    })
                    .catch(err => {
                        res.send(new ResponseError(err, '日记类别删除失败'))
                    })
            } else {
                res.send(new ResponseError('', '无权操作'))
            }

        })
        .catch(err => {
            res.send(new ResponseError('', err.message))
        })
})

// 检查类别是否存在
function checkCategoryExist(categoryName){
    let sqlArray = []
    sqlArray.push(`select * from ${TABLE_NAME} where name='${categoryName}'`)
    return utility.getDataFromDB( 'diary', sqlArray)
}



module.exports = router
