const express = require('express');
const router = express.Router();

/* GET users listing. */
router.get('/:username', (req, res, next) => {
  res.send(req.params.username);
});

module.exports = router;
