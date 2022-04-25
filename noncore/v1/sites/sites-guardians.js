const express = require('express')
const router = express.Router()

router.route('/:site_id/guardians').get((req, res) => { res.json([]) })

module.exports = router
