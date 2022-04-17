const express = require('express')
const router = express.Router()

// This endpoint is called from Android Ranger App (legacy)
router.route('/').get((req, res) => {
  res.status(200).send({ events: [] })
})

module.exports = router
