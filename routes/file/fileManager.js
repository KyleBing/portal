const express = require('express')
const router = express.Router()
const utility = require('../../config/utility')
const ResponseSuccess = require('../../response/ResponseSuccess')
const ResponseError = require('../../response/ResponseError')
const multer = require('multer')
const {adminCount} = require("../../config/configProject");
const fs = require('fs')

const DB_NAME = 'diary' // 数据库名
const TABLE_NAME = 'file_manager' // 数据库名
const TEMP_FOLDER = 'temp' // 临时文件存放文件夹
const DEST_FOLDER = 'upload' // 临时文件存放文件夹
const uploadLocal = multer({dest: TEMP_FOLDER}) // 文件存储在服务器的什么位置
const storage = multer.memoryStorage()

router.post('/upload', uploadLocal.single('file'), (req, res, next) => {
    let fileOriginalName = Buffer.from(req.file.originalname, 'latin1').toString('utf-8');
    const destPath = `${DEST_FOLDER}/${fileOriginalName}`
    utility
        .verifyAuthorization(req)
        .then(userInfo => {
            let connection = utility.getMysqlConnection(DB_NAME)
            connection.beginTransaction(transactionError => {
                if (transactionError){
                    connection.rollback(rollbackError => {
                        res.send(new ResponseError(rollbackError, 'beginTransaction: 事务执行失败，已回滚'))
                    })
                    connection.end()
                } else {
                    let timeNow = utility.dateFormatter(new Date())
                    let sql = `insert into
                                 ${TABLE_NAME}(path, name_original, description, date_create, type, size, uid) 
                                values ('${destPath}', '${fileOriginalName}', '${req.body.note}', '${timeNow}', '${req.file.mimetype}', ${req.file.size}, ${userInfo.uid})`

                    connection.query(sql, [], (queryErr,result) => {
                        if (queryErr){
                            connection.rollback(err => {
                                res.send(new ResponseError(queryErr, 'query: sql 事务执行失败，已回滚'))
                                connection.end()
                            })
                        } else {
                            fs.copyFile(
                                req.file.path,
                                `../${destPath}`,
                                fs.constants.COPYFILE_EXCL,
                                (copyFileError => {
                                    if (copyFileError) {
                                        connection.rollback(rollbackError => {
                                            fs.rm(req.file.path, deleteErr => {})
                                            if (copyFileError.code === 'EEXIST'){
                                                res.send(new ResponseError('', '文件已存在'))
                                            } else {
                                                res.send(new ResponseError(copyFileError, '上传失败'))
                                            }
                                            connection.end()
                                        })

                                    } else {
                                        fs.rm(req.file.path, deleteErr => {
                                            if (deleteErr){
                                                res.send(new ResponseError(deleteErr, '服务器临时文件删除失败'))
                                                connection.end()
                                            } else {
                                                connection.commit(commitError => {
                                                    if (commitError){
                                                        connection.rollback(rollbackError => {
                                                            res.send(new ResponseError(rollbackError, 'transaction.commit: 事务执行失败，已回滚'))
                                                            connection.end()
                                                        })
                                                    } else {
                                                        connection.end()
                                                        res.send(new ResponseSuccess('', '上传成功'))
                                                    }
                                                })
                                            }
                                        })
                                    }
                                }))
                        }
                    })

                }

            })
        })
        .catch(errInfo => {
            res.send(new ResponseError(errInfo, '无权操作'))
        })
})

router.post('/modify', (req, res, next) => {
    // 1. 验证用户信息是否正确
    utility
        .verifyAuthorization(req)
        .then(userInfo => {
            utility
                .getDataFromDB( DB_NAME, [` update ${TABLE_NAME} set description = '${req.body.description}' WHERE id='${req.body.fileId}' and uid='${userInfo.uid}'`])
                .then(data => {
                    if (data.affectedRows > 0) {
                        utility.updateUserLastLoginTime(userInfo.uid)
                        res.send(new ResponseSuccess('', '修改成功'))
                    } else {
                        res.send(new ResponseError('', '修改失败'))
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

// TODO: 用事务处理
router.delete('/delete', (req, res, next) => {
    // 1. 验证用户信息是否正确
    utility
        .verifyAuthorization(req)
        .then(userInfo => {
            utility.getDataFromDB(DB_NAME, [`select * from ${TABLE_NAME} where id='${req.body.fileId}'`], true)
                .then(fileInfo => {
                    utility.getDataFromDB( DB_NAME, [` DELETE from ${TABLE_NAME} WHERE id='${req.body.fileId}' and uid='${userInfo.uid}' `])
                        .then(data => {
                            if (data.affectedRows > 0) {
                                utility.updateUserLastLoginTime(userInfo.uid)
                                fs.rm(`../${fileInfo.path}`, {force: true}, errDeleteFile => {
                                    if (errDeleteFile){
                                        res.send(new ResponseError(errDeleteFile, '删除失败'))
                                    } else {
                                        res.send(new ResponseSuccess('', '删除成功'))
                                    }
                                })
                            } else {
                                res.send(new ResponseError('', '删除失败'))
                            }
                        })
                        .catch(err => {
                            res.send(new ResponseError(err,))
                        })
                })
                .catch(errQuery => {
                    res.send(new ResponseError('', errQuery))
                })

        })
        .catch(errInfo => {
            res.send(new ResponseError('', errInfo))
        })
})

router.get('/list', (req, res, next) => {
    utility
        .verifyAuthorization(req)
        .then(userInfo => {
            let startPoint = (req.query.pageNo - 1) * req.query.pageSize // 文件记录起点
            let sqlArray = []
            sqlArray.push(`SELECT *from ${TABLE_NAME} where uid='${userInfo.uid}'`)
            // keywords
            if (req.query.keywords){
                let keywords = JSON.parse(req.query.keywords).map(item => utility.unicodeEncode(item))
                console.log(keywords)
                if (keywords.length > 0){
                    let keywordStrArray = keywords.map(keyword => `( description like '%${keyword}%' ESCAPE '/' ` )
                    sqlArray.push(' and ' + keywordStrArray.join(' and ')) // 在每个 categoryString 中间添加 'or'
                }
            }


            // date range
            if (req.query.dateFilter){
                let year = req.query.dateFilter.substring(0,4)
                let month = req.query.dateFilter.substring(4,6)
                sqlArray.push(` and  YEAR(date)='${year}' AND MONTH(date)='${month}'`)
            }

            sqlArray.push(` order by date_create desc
                  limit ${startPoint}, ${req.query.pageSize}`)

            utility
                .getDataFromDB( DB_NAME, sqlArray)
                .then(data => {
                    utility.updateUserLastLoginTime(userInfo.uid)
                    res.send(new ResponseSuccess(data, '请求成功'))
                })
                .catch(err => {
                    res.send(new ResponseError(err, err.message))
                })
        })
        .catch(errInfo => {
            res.send(new ResponseError('', errInfo))
        })
})

module.exports = router
