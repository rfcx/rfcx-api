var models  = require('../../models');
var express = require('express');
var router = express.Router();
var middleware_v1 = require("../../middleware/v1.js").middleware;
for (m in middleware_v1) { router.use(middleware_v1[m]); }


router.route("/register")
  .post(function(req, res) {
//    var user = JSON.parse(req.body.user);
    
    console.log(models.User);
    res.json({name:"asdf"});
  })
;

router.route("/checkin")
  .post(function(req, res) {
    res.json({name:"one user: "+req.params.user_id});
  })
;

module.exports = router;
