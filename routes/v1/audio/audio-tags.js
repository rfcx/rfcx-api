var express = require('express')
var router = express.Router()

// This route is deprecated
router.route('/:audio_id/tags').post(function (req, res) {
  res.sendStatus(501)
})

module.exports = router
