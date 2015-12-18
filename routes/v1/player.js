var models  = require("../../models");
var express = require("express");
var router = express.Router();
var hash = require("../../utils/misc/hash.js").hash;
var token = require("../../utils/internal-rfcx/token.js").token;
var views = require("../../views/v1");
var httpError = require("../../utils/http-errors.js");
var passport = require("passport");
passport.use(require("../../middleware/passport-token").TokenStrategy);

router.route("/login")
  .post(function(req,res) {

    token.createAnonymousToken({
      reference_tag: "player-anonymous",
      token_type: "player-anonymous",
      created_by: "player-anonymous",
      minutes_until_expiration: 360,
      allow_garbage_collection: false,
      only_allow_access_to: [ "^"+"/v1/guardians/[012345678abcdef]{12}/audio.json"+"$" ]
    }).then(function(tokenInfo){

      res.status(200).json({
        token: {
          guid: tokenInfo.token_guid,
          token: tokenInfo.token,
          expires_at: tokenInfo.token_expires_at.toISOString()
        }
      });
     
    }).catch(function(err){
      console.log("error creating access token for analysis worker | "+err);
    });

  })
;

module.exports = router;
