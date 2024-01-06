import {getDataFromDB,} from "../../config/utility";
import express from "express"
const routerDontStarve = express.Router()

import {Response, Request} from "express";
import {ResponseError} from "../../response/ResponseError";
import {ResponseSuccess} from "../../response/ResponseSuccess";

// get list
function getDataList(sqlArray, path){
    routerDontStarve.get(path, (req: Request, res: Response, next) => {
        getDataFromDB(
                'starve',
                sqlArray,
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


function getDataInfo(tableName, path){
    routerDontStarve.get(path, (req: Request, res: Response, next) => {
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



export {routerDontStarve}
