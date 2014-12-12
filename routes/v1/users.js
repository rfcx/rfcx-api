var express = require('express');
var router = express.Router();
var middleware_v1 = require("../../middleware/v1.js").middleware;
for (m in middleware_v1) { router.use(middleware_v1[m]); }

/* GET users listing. */
router.get('/', function(req, res) {
  res.send('respond with a resource');
});

module.exports = router;
