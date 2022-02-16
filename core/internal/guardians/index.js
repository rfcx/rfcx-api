const router = require('express').Router()

router.get('/:id', (req, res) => {
  res.json({ type: 'cell' })
})

module.exports = router
