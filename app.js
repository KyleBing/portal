const createError = require('http-errors')
const express = require('express')
const path = require('path')
const cookieParser = require('cookie-parser')
const logger = require('morgan')

let init                 = require('./routes/init')
let indexRouter          = require('./routes/index')
let usersRouter          = require('./routes/user')
let diaryRouter          = require('./routes/diary')
let diaryStatisticRouter = require('./routes/statistic')
let dictRouter           = require('./routes/dict')
let bankCardRouter       = require('./routes/bankCard')
let billRouter           = require('./routes/bill')

const app = express()

// view engine setup
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'pug')

app.use(logger('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, 'public')))


app.use('/',          indexRouter)
app.use('/init',      init)
app.use('/user',      usersRouter)
app.use('/diary',     diaryRouter)
app.use('/statistic', diaryStatisticRouter)

app.use('/dict',          dictRouter) // 词库保存
app.use('/bank-card',     bankCardRouter) // 银行卡列表
app.use('/bill',          billRouter) // 账单



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
