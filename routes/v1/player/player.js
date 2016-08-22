var models  = require("../../../models");
var express = require("express");
var router = express.Router();
var hash = require("../../../utils/misc/hash.js").hash;
var token = require("../../../utils/internal-rfcx/token.js").token;
var views = require("../../../views/v1");
var httpError = require("../../../utils/http-errors.js");
var passport = require("passport");
passport.use(require("../../../middleware/passport-token").TokenStrategy);

router.route("/login")
  .post(function(req,res) {

    var userInput = {
      pswd: (req.body.password != null) ? req.body.password.toLowerCase() : null
    };

    if ( process.env.PLAYER_PASSCODES.split(",").indexOf(userInput.pswd) > -1 ) {
    
      return token.createAnonymousToken({
        reference_tag: "stream-web",
        token_type: "stream-web",
        created_by: "stream-web",
        minutes_until_expiration: 1440, // tokens last for a full day
        allow_garbage_collection: false,
        only_allow_access_to: [ 
          "^/v1/player/web",
          "^/v1/guardians/[012345678abcdef]{12}/audio.json$",
          "^/v1/audio/[012345678abcdef]{8}-[012345678abcdef]{4}-[012345678abcdef]{4}-[012345678abcdef]{4}-[012345678abcdef]{12}/audio.json$"
          ]
      }).then(function(tokenInfo){

        res.status(200).json({
          token: {
            guid: tokenInfo.token_guid,
            token: tokenInfo.token,
            expires_at: tokenInfo.token_expires_at.toISOString()
          }
        });

        return null;
       
      }).catch(function(err){
        console.log("error creating access token for audio player | "+err);
        res.status(500).json({});
      });

    } else {
      res.status(401).json({ 
        message: "invalid password", error: { status: 401 }
      });
    }

  })
;


router.route("/web")
  .get(passport.authenticate("token",{session:false}), function(req,res) {



    return models.GuardianAudioHighlight
      .findAll({ 
        where: { group: "web-player" },
        include: [ { all: true } ], 
        order: [ ["order", "ASC"] ]
      }).then(function(dbAudioHighlights){

        if (dbAudioHighlights.length < 1) {
          httpError(res, 404, "database");
        } else {
          res.status(200).json({ streams: views.models.guardianAudioHighlights(req,res,dbAudioHighlights) });
        }

        return null;

      }).catch(function(err){
        console.log("failed to find guardian audio highlights | "+err);
        if (!!err) { res.status(500).json({msg:"failed to find guardian audio highlights"}); }
      });


  })
;

module.exports = router;
