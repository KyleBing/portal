const createError = require('http-errors')
const express = require('express')
const path = require('path')
const cookieParser = require('cookie-parser')
const logger = require('morgan')



const app = express()

// view engine setup
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'pug')

app.use(logger('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, 'public')))



let init                 = require('./routes/init')
let indexRouter          = require('./routes/index')
let usersRouter          = require('./routes/user')
let diaryStatisticRouter = require('./routes/statistic')

let routerDiary          = require('./routes/diary')
let routerDiaryCategory  = require('./routes/diary-category')
let routerDict           = require('./routes/dict')
let routerBankCard       = require('./routes/bankCard')
let routerBill           = require('./routes/bill')
let routerQr             = require('./routes/qr')
let routerQrManager      = require('./routes/qr-manager')
let routerVPS            = require('./routes/vps')

let routerThumbsUp       = require('./routes/thumbs-up')



app.use('/'           , indexRouter)
app.use('/init'       , init)
app.use('/user'       , usersRouter)
app.use('/statistic'  , diaryStatisticRouter)

app.use('/diary'          , routerDiary)
app.use('/diary-category' , routerDiaryCategory)
app.use('/dict'           , routerDict)          // 词库保存
app.use('/bank-card'      , routerBankCard)      // 银行卡列表
app.use('/bill'           , routerBill)          // 账单
app.use('/qr'             , routerQr)            // QR 二维码
app.use('/qr-manager'     , routerQrManager)     // QR 二维码
app.use('/vps'            , routerVPS)           // 搬瓦工 VPS
app.use('/thumbs-up'      , routerThumbsUp)      // 获取点赞初始计数





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

module.exports = app
