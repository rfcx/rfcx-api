var verbose_logging = (process.env.NODE_ENV !== "production");
var models  = require("../../models");
var express = require("express");
var router = express.Router();
var views = require("../../views/v1");
var passport = require("passport");
passport.use(require("../../middleware/passport-token").TokenStrategy);

router.route("/:event_id/fingerprint")
  .get(passport.authenticate("token",{session:false}), function(req,res) {

    models.GuardianEvent
      .findOne({ 
        where: { guid: req.params.event_id }, 
        include: [ { all: true } ]
      }).then(function(dbEvent){

        res.status(200).json(views.models.guardianEventFingerprints(req,res,dbEvent));

    }).catch(function(err){
      console.log("failed to return event | "+err);
      if (!!err) { res.status(500).json({msg:"failed to return event"}); }
    });

  })
;

module.exports = router;
