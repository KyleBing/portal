import createError from "http-errors"
import express from "express"
import logger from "morgan"
import path from "path"


const app = express()

// view engine setup
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'pug')

app.use(logger('dev'))
app.use(express.json({limit: '50mb'}))
app.use(express.urlencoded({ extended: false }))
app.use(express.static(path.join(__dirname, 'public')))


// 基础相关
import {routerIndex} from './routes'
import {routerInit} from './routes/init'
import {routerUser} from './routes/user/user'
app.use('/'           , routerIndex)
app.use('/init'       , routerInit)
app.use('/user'       , routerUser)

// 邀请码
import {routerInvitation} from './routes/user/invitation'
app.use('/invitation'       , routerInvitation)

// 微信小程序
import {routerWX} from './routes/wx/wx'
app.use('/wx'         , routerWX)

// 微信公众号
import {routerWXPublic} from './routes/wx/wx-public'
app.use('/wx-public'  , routerWXPublic)

// 二维码-前端
import {routerQrFront} from './routes/qr/qr-front'
app.use('/qr-front'       , routerQrFront)            // QR 二维码

// 二维码-后台
import {routerQrBack} from './routes/qr/qr-manager'
app.use('/qr-manager'     , routerQrBack)     // QR 二维码

// 地图管理
import {routerMapRoute} from './routes/map/map-route'
import {routerMapPointer} from './routes/map/map-pointer'
app.use('/map-route'       , routerMapRoute)
app.use('/map-pointer'     , routerMapPointer)

// 统计
import {routerDiaryStatistic} from './routes/statistic/statistic'
app.use('/statistic'  , routerDiaryStatistic)

// 搬瓦工 VPS
import {routerVPSBandwagonHost} from './routes/vps/vps'
app.use('/vps'            , routerVPSBandwagonHost)

// 日记相关
import {routerDiary} from './routes/diary/diary'
import {routerDiaryCategory} from './routes/diary/diary-category'
import {routerDiaryBankCard} from './routes/diary/bankCard'
import {routerDiaryBill} from './routes/diary/bill'
app.use('/diary'          , routerDiary)
app.use('/diary-category' , routerDiaryCategory)
app.use('/bank-card'      , routerDiaryBankCard)      // 银行卡列表
app.use('/bill'           , routerDiaryBill)          // 账单

// 点赞管理
import {routerThumbUp} from './routes/thumbs-up/thumbs-up'
app.use('/thumbs-up', routerThumbUp)

// 邮件操作
import {routerMail} from './routes/mail/mail'
app.use('/mail', routerMail)

// 图片、文件操作
import {routerFileManager} from './routes/file/fileManager'
app.use('/file-manager', routerFileManager)

// 七牛云图片
import {routerImageQiniu} from './routes/image-qiniu/image-qiniu'
app.use('/image-qiniu', routerImageQiniu)


// 五笔相关
import {routerWubiDict} from './routes/wubi/wubi-dict'
import {routerWubiWord} from './routes/wubi/wubi-word'
import {routerWubiCategory} from './routes/wubi/wubi-category'

app.use('/dict'           , routerWubiDict)      // 词库保存 // 保留是因为之前助手需要这个接口路径
app.use('/wubi/dict'      , routerWubiDict)     // 词条操作
app.use('/wubi/word'      , routerWubiWord)     // 词条操作
app.use('/wubi/category'  , routerWubiCategory)  // 词条类别


// don't starve
import {routerDontStarve} from './routes/dontstarve/dont-starve'
app.use('/dont-starve'      , routerDontStarve)      // 饥荒





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

export {
  app
}
