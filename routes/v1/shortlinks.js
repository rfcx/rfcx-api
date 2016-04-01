var verbose_logging = (process.env.NODE_ENV !== "production");
var models  = require("../../models");
var express = require("express");
var router = express.Router();
var httpError = require("../../utils/http-errors.js");


router.route("/:shortlink_id")
  .get(function(req,res) {

    res.status(200).json({ shortlink: req.params.shortlink_id });

    // models.GuardianSite
    //   .findOne({ 
    //     where: { guid: req.params.site_id },
    //     include: [ { all: true } ]
    //   }).then(function(dbSite){
        
    //     res.status(200).json(views.models.guardianSites(req,res,dbSite));

    //   }).catch(function(err){
    //     console.log("failed to return site | "+err);
    //     if (!!err) { res.status(500).json({msg:"failed to return site"}); }
    //   });

  })
;

router.route("/")
  .get(function(req,res) {
    res.redirect(301, "https://rfcx.org/");
  })
;



module.exports = router;



