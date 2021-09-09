const router = require('express').Router()

router.post('/', function (req, res) {
  res.send("Successful webhook")
})

module.exports = router
