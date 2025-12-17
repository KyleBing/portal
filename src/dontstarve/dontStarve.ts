import express from "express"
import {ResponseError, ResponseSuccess} from "../response/Response";
import {
    getDataFromDB,
    verifyAuthorization,
    operate_db_and_return_added_id,
    operate_db_without_return,
    unicodeEncode
} from "../utility";
const router = express.Router()

// get list
function getDataList(sqlArray: Array<string>, path: string) {
    router.get(path, (_, res) => {
        getDataFromDB('starve', sqlArray,)
            .then(data => {
                if (data) { // 没有记录时会返回  undefined
                    res.send(new ResponseSuccess(data))
                } else {
                    res.send(new ResponseError('', '无数据'))
                }
            })
            .catch(err => {
                res.send(new ResponseError(err, err.message))
            })
    })
}


const ListGet = [
    {
        path: '/character/list',
        sqlArray: [` select * from characters`]
    },
    {
        path: '/mob/list',
        sqlArray: [` select * from mobs`]
    },
    {
        path: '/log/list',
        sqlArray: [` select * from logs`]
    },
    {
        path: '/plant/list',
        sqlArray: [` select * from plants`]
    },
    {
        path: '/thing/list',
        sqlArray: [` select * from things`]
    },
    {
        path: '/material/list',
        sqlArray: [` select * from materials`]
    },
    {
        path: '/craft/list',
        sqlArray: [` select * from crafts`]
    },
    {
        path: '/cookingrecipe/list',
        sqlArray: [` select * from cookingrecipes`]
    },
    {
        path: '/coder/list',
        sqlArray: [` select * from coders`]
    },
]

ListGet.forEach(item => {
    getDataList(item.sqlArray, item.path)
})



// get infos
const ListGetInfo = [
    {
        path: '/character/info',
        tableName: 'characters'
    },
    {
        path: '/mob/info',
        tableName: 'mobs'
    },
    {
        path: '/log/info',
        tableName: 'logs'
    },
    {
        path: '/plant/info',
        tableName: 'plants'
    },
    {
        path: '/thing/info',
        tableName: 'things'
    },
    {
        path: '/material/info',
        tableName: 'materials'
    },
    {
        path: '/craft/info',
        tableName: 'crafts'
    },
    {
        path: '/cookreceipe/info',
        tableName: 'cookreceipes'
    },
    {
        path: '/coder/info',
        tableName: 'coders'
    },
]

ListGetInfo.forEach(item => {
    getDataInfo(item.tableName, item.path)
})


function getDataInfo(tableName: string, path: string){
    router.get(path, (req, res) => {
        getDataFromDB(
                'starve',
                [`select * from ${tableName} where id = ${req.query.id}`],
                true
            )
            .then(data => {
                if (data) { // 没有记录时会返回  undefined
                    res.send(new ResponseSuccess(data))
                } else {
                    res.send(new ResponseError('', '无数据'))
                }
            })
            .catch(err => {
                res.send(new ResponseError(err, err.message))
            })
    })

}

// SQL 转义函数
function escapeMySQLString(str: string): string {
    if (!str) return '';
    return str
        .replace(/\\/g, '\\\\')  // Backslash
        .replace(/'/g, "\\'")    // Single quote
        .replace(/"/g, '\\"')    // Double quote
        .replace(/\n/g, '\\n')   // New line
        .replace(/\r/g, '\\r')   // Carriage return
        .replace(/\t/g, '\\t')   // Tab
        .replace(/\0/g, '\\0')   // Null character
        .replace(/\x1a/g, '\\Z'); // Ctrl+Z
}

const DB_NAME = 'starve'
const DATA_NAME = 'logs'

// logs 表的相关接口
// 添加日志
router.post('/log/add', (req, res) => {
    verifyAuthorization(req)
        .then(userInfo => {
            let sqlArray = []
            let parsedDetail = escapeMySQLString(unicodeEncode(req.body.detail || ''))
            let date = req.body.date || ''
            
            if (!date || !req.body.detail) {
                res.send(new ResponseError('', '日期和详情不能为空'))
                return
            }
            
            sqlArray.push(`
                INSERT INTO logs(date, detail)
                VALUES('${date}', '${parsedDetail}')
            `)
            
            operate_db_and_return_added_id(userInfo.uid, DB_NAME, DATA_NAME, sqlArray, '添加', res)
        })
        .catch(errInfo => {
            res.send(new ResponseError('', errInfo))
        })
})

// 编辑日志
router.put('/log/modify', (req, res) => {
    verifyAuthorization(req)
        .then(userInfo => {
            let sqlArray = []
            let parsedDetail = escapeMySQLString(unicodeEncode(req.body.detail || ''))
            let date = req.body.date || ''
            let id = req.body.id
            
            if (!id) {
                res.send(new ResponseError('', 'ID不能为空'))
                return
            }
            
            if (!date || !req.body.detail) {
                res.send(new ResponseError('', '日期和详情不能为空'))
                return
            }
            
            sqlArray.push(`
                UPDATE logs
                SET date = '${date}',
                    detail = '${parsedDetail}'
                WHERE id = ${id}
            `)
            
            operate_db_without_return(userInfo.uid, DB_NAME, DATA_NAME, sqlArray, '修改', res)
        })
        .catch(errInfo => {
            res.send(new ResponseError('', errInfo))
        })
})

// 删除日志
router.delete('/log/delete', (req, res) => {
    verifyAuthorization(req)
        .then(userInfo => {
            let id = req.body.id || req.query.id
            
            if (!id) {
                res.send(new ResponseError('', 'ID不能为空'))
                return
            }
            
            let sqlArray = []
            sqlArray.push(`
                DELETE FROM logs
                WHERE id = ${id}
            `)
            
            operate_db_without_return(userInfo.uid, DB_NAME, DATA_NAME, sqlArray, '删除', res)
        })
        .catch(errInfo => {
            res.send(new ResponseError('', errInfo))
        })
})

export default router
