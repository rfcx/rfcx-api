var models  = require('../../models');
var express = require('express');
var router = express.Router();
var middleware_v1 = require("../../middleware/v1.js").middleware;
for (m in middleware_v1) { router.use(middleware_v1[m]); }


router.route("/")
  .get(function(req,res) {
    res.json({name:"list guardians"});
  })
  .post(function(req,res){
  })
;

router.route("/:guardian_id")
  .get(function(req,res) {
    res.json({name:"one guardian: "+req.params.guardian_id});
  })
;

module.exports = router;
