const express = require('express')
const router = express.Router()

router.route('/groups').get((req, res) => { res.json([]) })

module.exports = router
