var models  = require("../../models");
var express = require("express");
var router = express.Router();
var views = require("../../views/v1/models/_all.js").views;
var passport = require("passport");
passport.use(require("../../middleware/auth/passport-token.js").TokenStrategy);

router.route("/:user_id")
  .get(passport.authenticate("token",{session:false}), function(req, res) {
    res.json({name:"one user: "+req.params.user_id});
  });

module.exports = router;
