import createError from "http-errors"
import path from "path"
import logger from "morgan"

import express from "express"


const app = express()

// view engine setup
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'pug')

app.use(logger('dev'))
app.use(express.json({limit: '50mb'}))
app.use(express.urlencoded({extended: false}))
app.use(express.static(path.join(__dirname, 'public')))

// 基础相关
import routerIndex from "./routes"
app.use('/', routerIndex)

// 用户
import routerUser from "./routes/user/user"
app.use('/user', routerUser)

// 初始化
import routerInit from "./routes/init"
app.use('/init', routerInit)

// 邀请码
import routerInvitation from "./routes/user/invitation"
app.use('/invitation', routerInvitation)

// // 微信小程序
// let routerWx = require('./routes/wx/wx')
// app.use('/wx', routerWx)
//
// // 微信公众号
// let routerWxPublic = require('./routes/wx/wx-public')
// app.use('/wx-public', routerWxPublic)
//
// // 二维码-前端
// let routerQr = require('./routes/qr/qr-front')
// app.use('/qr-front', routerQr)            // QR 二维码
//
// // 二维码-后台
// let routerQrManager = require('./routes/qr/qr-manager')
// app.use('/qr-manager', routerQrManager)     // QR 二维码
//
// // 地图管理
// let routerMapRoute = require('./routes/map/map-route')
// let routerMapPointer = require('./routes/map/map-pointer')
// app.use('/map-route', routerMapRoute)
// app.use('/map-pointer', routerMapPointer)
//
// // 统计
// let diaryStatisticRouter = require('./routes/statistic/statistic')
// app.use('/statistic', diaryStatisticRouter)
//
// // 搬瓦工 VPS
// let routerVPS = require('./routes/vps/vps')
// app.use('/vps', routerVPS)

// 日记相关
import routerDiary from './routes/diary/diary'
import routerDiaryCategory from './routes/diary/diaryCategory'
import routerBankCard from './routes/diary/bankCard'
import routerBill from './routes/diary/bill'

app.use('/diary', routerDiary)
app.use('/diary-category', routerDiaryCategory)
app.use('/bank-card', routerBankCard)      // 银行卡列表
app.use('/bill', routerBill)          // 账单

// // 点赞管理
// let routerThumbsUp = require('./routes/thumbs-up/thumbs-up')
// app.use('/thumbs-up', routerThumbsUp)
//
// // 邮件操作
// let routerMail = require('./routes/mail/mail')
// app.use('/mail', routerMail)
//
// // 图片、文件操作
// let routerFileManager = require('./routes/file/fileManager')
// app.use('/file-manager', routerFileManager)
//
// // 七牛云图片
// let routerImageQiniu = require('./routes/image-qiniu/image-qiniu')
// app.use('/image-qiniu', routerImageQiniu)
//
//
// // 五笔相关
// let routerWubiDict = require('./routes/wubi/wubi-dict')
// let routerWubiWord = require('./routes/wubi/wubi-word')
// let routerWubiCategory = require('./routes/wubi/wubi-category')
//
// app.use('/dict', routerWubiDict)      // 词库保存 // 保留是因为之前助手需要这个接口路径
// app.use('/wubi/dict', routerWubiDict)     // 词条操作
// app.use('/wubi/word', routerWubiWord)     // 词条操作
// app.use('/wubi/category', routerWubiCategory)  // 词条类别
//
//
// // don't starve
// let routerStarve = require('./routes/dontstarve/dont-starve')
// app.use('/dont-starve', routerStarve)      // 饥荒


// catch 404 and forward to error handler
app.use((req, res, next) => {
    next(createError(404))
})

// error handler
app.use((err, req, res, next) => {
    // set locals, only providing error in development
    res.locals.message = err.message
    res.locals.error = req.app.get('env') === 'development' ? err : {}

    // render the error page
    res.status(err.status || 500)
    res.render('error')
})

export default app
