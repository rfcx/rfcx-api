// could move requirements to an api which is injected to everything

var models  = require('../../models');
var express = require('express');
var router = express.Router();


router.route("/")
  .get(function(req, res) {
    res.json({name:"list users"});
  })
;

router.route("/:user_id")
  .get(function(req, res) {
    res.json({name:"one user: "+req.params.user_id});
  });

module.exports = router;
