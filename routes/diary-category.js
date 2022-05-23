const express = require('express')
const router = express.Router()
const configProject = require('../config/configProject')
const utility = require('../config/utility')
const ResponseSuccess = require('../response/ResponseSuccess')
const ResponseError = require('../response/ResponseError')


router.get('/', (req, res, next) => {
    // query.hash
    let sqlArray = []
    sqlArray.push(` select * from diary_category`)
    // 1. 先查询出 QR 结果
    utility.getDataFromDB(sqlArray)
        .then(data => {
            if (data) { // 没有记录时会返回  undefined
                res.send(new ResponseSuccess(data))
            } else {
                res.send(new ResponseError('', '日记类别查询错误'))
            }
        })
        .catch(err => {
            res.send(new ResponseError(err, err.message))
        })
})
router.post('/add', (req, res, next) => {
    checkCategoryExist(req.body.name_en)
        .then(dataCategoryExistanceArray => {
            // email 记录是否已经存在
            if (dataCategoryExistanceArray.length > 0){
                return res.send(new ResponseError('', '类别名已存在'))
            } else {
                utility.verifyAuthorization(req)
                    .then(userInfo => {
                        if (userInfo.email === configProject.adminCount ){
                            // query.hash
                            let sqlArray = []
                            sqlArray.push(`insert into diary_category(name, name_en) values('${req.body.name}', '${req.body.name_en}')`)
                            // 1. 先查询出 QR 结果
                            utility.getDataFromDB(sqlArray)
                                .then(data => {
                                    if (data) { // 没有记录时会返回  undefined
                                        utility.updateUserLastLoginTime(req.query.email)
                                        res.send(new ResponseSuccess({id: data.insertId}, '添加成功')) // 添加成功之后，返回添加后的日记 id
                                    } else {
                                        res.send(new ResponseError('', '日记类别查询错误'))
                                    }
                                })
                                .catch(err => {
                                    res.send(new ResponseError(err, '类别添加失败'))
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


// 检查类别是否存在
function checkCategoryExist(categoryName){
    let sqlArray = []
    sqlArray.push(`select * from diary_category where name_en='${categoryName}'`)
    return utility.getDataFromDB(sqlArray)
}



module.exports = router
