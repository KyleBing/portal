import createError from "http-errors"
import path from "path"
import logger from "morgan"

import express from "express"
const app = express()

// view engine setup
// app.set('views', path.join(__dirname, 'views'))
// app.set('view engine', 'pug')

app.use(logger('dev'))
app.use(express.json({limit: '50mb'}))  // 上传文件内容的大小限制
app.use(express.urlencoded({extended: false}))
app.use(express.static(path.join(__dirname, 'public')))

// 基础相关
import routerIndex from "./src/index"
app.use('/', routerIndex)

// 用户
import routerUser from "./src/user/user"
app.use('/user', routerUser)

// 初始化
import routerInit from "./src/init/init"
app.use('/init', routerInit)

// 邀请码
import routerInvitation from "./src/user/invitation"
app.use('/invitation', routerInvitation)


// 二维码-前端
import routerQr from './src/qr/qrFront'
app.use('/qr-front', routerQr)

// 二维码-后台
import routerQrManager from './src/qr/qrManager'
app.use('/qr-manager', routerQrManager)


// 地图 - 路线
import routerMapRoute from './src/map/mapRoute'
app.use('/map-route', routerMapRoute)

// 地图 - 点图
import routerMapPointer from './src/map/mapPointer'
app.use('/map-pointer', routerMapPointer)

// 统计
import routerStatistic from './src/statistic/statistic'
app.use('/statistic', routerStatistic)



// 日记
import routerDiary from './src/diary/diary'
app.use('/diary', routerDiary)

// 日记 - 类别
import routerDiaryCategory from './src/diary/diaryCategory'
app.use('/diary-category', routerDiaryCategory)

// 日记 - 银行卡
import routerBankCard from './src/diary/bankCard'
app.use('/bank-card', routerBankCard)

// 日记 - 账单
import routerBill from './src/diary/bill'
app.use('/bill', routerBill)


// 点赞管理
import routerThumbsUp from './src/thumbsUp/thumbsUp'
app.use('/thumbs-up', routerThumbsUp)

// 邮件操作
import routerMail from './src/mail/mail'
app.use('/mail', routerMail)

// 图片、文件操作
import routerFileManager from './src/file/fileManager'
app.use('/file-manager', routerFileManager)

// 七牛云图片
import routerQiniu from './src/imageQiniu/imageQiniu'
app.use('/image-qiniu', routerQiniu)


// 五笔相关
import routerWubiDict from './src/wubi/wubiDict'
import routerWubiWord from './src/wubi/wubiWord'
import routerWubiCategory from './src/wubi/wubiCategory'

// app.use('/dict', routerWubiDict)      // 词库保存 // 保留是因为之前助手需要这个接口路径
app.use('/wubi/dict', routerWubiDict)     // 词条操作
app.use('/wubi/word', routerWubiWord)     // 词条操作
app.use('/wubi/category', routerWubiCategory)  // 词条类别


// 饥荒
import routerStarve from './src/dontstarve/dontStarve'
import router from "./src/index";
app.use('/starve', routerStarve)


// catch 404 and forward to error handler
app.use((req, res, next) => {
    next(createError(404))
})

// ERROR HANDLER
app.use((err, req, res, next) => {
    // set locals, only providing error in development
    const error = req.app.get('env') === 'development' ? err : {}
    
    // return JSON error response
    res.status(err.status || 500)
    res.json({
        status: 'error',
        message: err.message,
        error: error
    })
})

export default app
