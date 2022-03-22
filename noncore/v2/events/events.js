const express = require('express')
const router = express.Router()

router.route('/').get((req, res) => {
  res.status(200).send({ events: [] })
})

// TODO: delete this call from Prediction Service and then delete this endpoint
router.route('/:guid/trigger').post((req, res) => {
  res.status(200).send({ success: true })
})

module.exports = router
