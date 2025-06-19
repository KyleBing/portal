import express from "express"
const router = express.Router()

/* GET home page. */
router.get('/', function(req, res) {
  res.json({ 
    status: 'success',
    message: 'Portal API is running',
    title: 'Portal for Diary'
  })
})

export default router
