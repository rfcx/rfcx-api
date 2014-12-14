var models  = require('../../models');
var express = require('express');
var router = express.Router();


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
