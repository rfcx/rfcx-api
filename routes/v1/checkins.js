var models  = require('../../models');
var express = require('express');
var router = express.Router();
var sqs = require("aws-sqs-promises");


router.route("/")
  .post(function(req, res) {

    res.json({name:"name"});
  
  })
;

router.route("/:checkin_id")
  .get(function(req, res) {
    res.json({name:"one checkin: "+req.params.checkin_id});
  })
;

module.exports = router;
