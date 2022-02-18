const router = require('express').Router()

// TODO Remove - replaced by v2/streams
router.get('/:id', (req, res) => {
  res.json({ type: 'cell' })
})

module.exports = router
