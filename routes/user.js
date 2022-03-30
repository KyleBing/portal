const express = require('express')
const router = express.Router()

/* GET users listing. */
router.get('/:username', (req, res, next) => {
  res.send(req.params.username)
})

router.post('/login', (req, res, next) => {
  res.send(req.body)
})

module.exports = router
