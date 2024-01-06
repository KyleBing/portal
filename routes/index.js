import express from 'express'
const routerIndex = express.Router()

/* GET home page. */
routerIndex.get('/', (req, res, next) => {
  res.render('index', { title: 'Portal for Diary' })
})

export {routerIndex}
