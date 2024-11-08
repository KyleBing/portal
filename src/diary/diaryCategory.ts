import express from "express"
import {ResponseError, ResponseSuccess} from "../response/Response";
import configProject from "../../config/configProject.json"
import {
    dateFormatter,
    getDataFromDB, operate_db_and_return_added_id, operate_db_without_return,
    verifyAuthorization
} from "../utility";
const router = express.Router()

const DB_NAME = 'diary'
const DATA_NAME = '日记类别'
const CURRENT_TABLE = 'diary_category'

router.get('/list', (req, res) => {
    // query.name_en
    let sqlArray = []
    sqlArray.push(` select * from ${CURRENT_TABLE} order by sort_id asc`)
    getDataFromDB( DB_NAME, sqlArray)
        .then(data => {
            if (data) { // 没有记录时会返回  undefined
                res.send(new ResponseSuccess(data))
            } else {
                res.send(new ResponseError('', `${DATA_NAME}查询错误`))
            }
        })
        .catch(err => {
            res.send(new ResponseError(err, err.message))
        })
})
router.post('/add', (req, res) => {
    checkCategoryExist(req.body.name_en)
        .then(dataCategoryExistenceArray => {
            // email 记录是否已经存在
            if (dataCategoryExistenceArray.length > 0){
                return res.send(new ResponseError('', `${DATA_NAME}已存在`))
            } else {
                verifyAuthorization(req)
                    .then(userInfo => {
                        if (userInfo.email === configProject.adminCount ){
                            let timeNow = dateFormatter(new Date())
                            // query.name_en
                            let sqlArray = []
                            sqlArray.push(`
                                insert into ${CURRENT_TABLE}(name, name_en, color, sort_id, date_init) 
                                values('${req.body.name}', '${req.body.name_en}', '${req.body.color}', '${req.body.sort_id}', '${timeNow}')`
                            )
                            operate_db_and_return_added_id(userInfo.uid, DB_NAME, DATA_NAME, sqlArray, '添加', res,)
                        } else {
                            res.send(new ResponseError('', '无权操作'))
                        }

                    })
                    .catch(errInfo => {
                        res.send(new ResponseError('', errInfo))
                    })

            }
        })

})
router.put('/modify', (req, res) => {
    verifyAuthorization(req)
        .then(userInfo => {
            if (userInfo.email === configProject.adminCount ){
                let timeNow = dateFormatter(new Date())
                // query.name_en
                let sqlArray = []
                sqlArray.push(`
                    update ${CURRENT_TABLE} set 
                    name = '${req.body.name}',
                    count = '${req.body.count}',
                    color = '${req.body.color}',
                    sort_id = ${req.body.sort_id}
                    where name_en = '${req.body.name_en}'
                    `)
                operate_db_without_return(userInfo.uid, DB_NAME, DATA_NAME, sqlArray, '修改', res)

            } else {
                res.send(new ResponseError('', '无权操作'))
            }

        })
        .catch(errInfo => {
            res.send(new ResponseError('', errInfo))
        })
})
router.delete('/delete', (req, res) => {
    verifyAuthorization(req)
        .then(userInfo => {
            if (userInfo.email === configProject.adminCount ){
                // query.name_en
                let sqlArray = []
                sqlArray.push(` delete from ${CURRENT_TABLE} where name_en = '${req.body.name_en}' `)
                operate_db_without_return(userInfo.uid, DB_NAME, DATA_NAME, sqlArray, '删除', res)
            } else {
                res.send(new ResponseError('', '无权操作'))
            }

        })
        .catch(errInfo => {
            res.send(new ResponseError('', errInfo))
        })
})

// 检查类别是否存在
function checkCategoryExist(categoryName: string){
    let sqlArray = []
    sqlArray.push(`select * from ${CURRENT_TABLE} where name_en='${categoryName}'`)
    return getDataFromDB( DB_NAME, sqlArray)
}

export default router
