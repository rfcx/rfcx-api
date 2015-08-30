var verbose_logging = (process.env.NODE_ENV !== "production");
var models  = require("../../models");
var express = require("express");
var router = express.Router();
var views = require("../../views/v1");
var passport = require("passport");
passport.use(require("../../middleware/passport-token").TokenStrategy);

router.route("/")
  .get(passport.authenticate("token",{session:false}), function(req,res) {

    models.GuardianSite
      .findAll({ 
        where: { is_active: true },
//        include: [ { all: true } ], 
//        order: [ ["last_check_in", "DESC"] ],
        limit: req.rfcx.limit,
        offset: req.rfcx.offset
      }).then(function(dbSite){
        
        res.status(200).json(views.models.guardianSites(req,res,dbSite));

      }).catch(function(err){
        console.log("failed to return site | "+err);
        if (!!err) { res.status(500).json({msg:"failed to return site"}); }
      });

  })
;

router.route("/:site_id")
  .get(passport.authenticate("token",{session:false}), function(req,res) {

    models.GuardianSite
      .findOne({ 
        where: { guid: req.params.site_id },
        include: [ { all: true } ]
      }).then(function(dbSite){
        
        res.status(200).json(views.models.guardianSites(req,res,dbSite));

      }).catch(function(err){
        console.log("failed to return site | "+err);
        if (!!err) { res.status(500).json({msg:"failed to return site"}); }
      });

  })
;



module.exports = router;



