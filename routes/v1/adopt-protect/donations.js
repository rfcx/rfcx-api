var models  = require("../../../models");
var express = require("express");
var router = express.Router();
var hash = require("../../../utils/misc/hash.js").hash;
var views = require("../../../views/v1");
var httpError = require("../../../utils/http-errors.js");
var passport = require("passport");
var Promise = require("bluebird");
passport.use(require("../../../middleware/passport-token").TokenStrategy);
var hasRole = require('../../../middleware/authorization/authorization').hasRole;


router.route("/donations/:donation_id")
  .get(passport.authenticate("token",{session:false}), function(req,res) {

    models.AdoptProtectDonation
      .findAll({
        where: { guid: req.params.donation_id },
        include: [ { all: true } ],
        limit: 1
      }).then(function(dbAdoptProtectDonation){

        if (dbAdoptProtectDonation.length < 1) {
          httpError(req, res, 404, "database");
        } else {
          res.status(200).json(views.models.adoptProtectDonations(req,res,dbAdoptProtectDonation));
        }

      }).catch(function(err){
        console.log("failed to return adopt protect donation | "+err);
        if (!!err) { res.status(500).json({msg:"failed to return adopt protect donation"}); }
      });

  })
;



module.exports = router;
