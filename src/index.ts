import express from "express"
import exp from "node:constants";
const router = express.Router()

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', { title: 'Portal for Diary' })
})

export default router
