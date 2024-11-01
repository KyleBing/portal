import express from "express"
import {ResponseError, ResponseSuccess} from "../../response/Response";
import {getDataFromDB,} from "../../config/utility";
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

export default router
