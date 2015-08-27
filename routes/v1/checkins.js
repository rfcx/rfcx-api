var verbose_logging = (process.env.NODE_ENV !== "production");
var models  = require("../../models");
var express = require("express");
var router = express.Router();
var views = require("../../views/v1");
var passport = require("passport");
passport.use(require("../../middleware/passport-token").TokenStrategy);

router.route("/:checkin_id")
  .get(passport.authenticate("token",{session:false}), function(req,res) {

    models.GuardianCheckIn
      .findOne({ 
        where: { guid: req.params.checkin_id },
        include: [ { all: true } ]
      }).then(function(dbCheckIn){
        
        res.status(200).json(views.models.guardianCheckIns(req,res,dbCheckIn));

      }).catch(function(err){
        console.log("failed to return checkin | "+err);
        if (!!err) { res.status(500).json({msg:"failed to return checkin"}); }
      });

  })
;



module.exports = router;



