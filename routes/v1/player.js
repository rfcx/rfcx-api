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

    var userInput = {
      pswd: (req.body.password != null) ? req.body.password.toLowerCase() : null
    };

    if ((userInput.pswd == process.env.PLAYER_PASSWORD_ALT) || (userInput.pswd == process.env.PLAYER_PASSWORD)) {

      token.createAnonymousToken({
        reference_tag: "stream-web",
        token_type: "stream-web",
        created_by: "stream-web",
        minutes_until_expiration: 720,
        allow_garbage_collection: false,
        only_allow_access_to: [ 
          "^/v1/player/web",
          "^/v1/guardians/[012345678abcdef]{12}/audio.json$",
          "^/v1/sites/mbang/images.json",
          "^/v1/sites/tembe/images.json",
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

        res.status(200).json({

          streams: [

            {
              type: "playlist",
              shortname: "Amazon (Sundown)",
              name: "Sundown, Tembé Indigenous Territory",
              description: "Sundown, Tembé Indigenous Territory, Amazon Rainforest, Pará, Brazil",
              location: "Amazon, Pará, Brazil",
              timezone_offset: -3,
              flickr_photoset_id: "72157644507563608",
              urls: {
                audio: "/v1/guardians/0bdbb4a5d567/audio.json"
                      +"?starting_after=2016-03-12T21:49:00Z"
                      +"&order=ascending"
                      +"&limit=3"
              }
            },


            {
              type: "playlist",
              shortname: "Amazon (Morning)",
              name: "Afternoon, Tembé Indigenous Territory",
              description: "Afternoon, Tembé Indigenous Territory, Amazon Rainforest, Pará, Brazil",
              location: "Amazon, Pará, Brazil",
              timezone_offset: -3,
              flickr_photoset_id: "72157637624534696",
              urls: {
                audio: "/v1/guardians/0bdbb4a5d567/audio.json"
                      +"?starting_after=2015-12-22T09:53:00Z"
                      +"&order=ascending"
                      +"&limit=3"
              }
            },


            {
              type: "playlist",
              shortname: "Amazon (Midnight)",
              name: "Midnight, Tembé Indigenous Territory",
              description: "Midnight, Tembé Indigenous Territory, Amazon Rainforest, Pará, Brazil",
              location: "Amazon, Pará, Brazil",
              timezone_offset: -3,
              flickr_photoset_id: "72157637625796744",
              urls: {
                audio: "/v1/guardians/0bdbb4a5d567/audio.json"
                      +"?starting_after=2016-03-16T03:15:00Z"
                      +"&order=ascending"
                      +"&limit=3"
              }
            },


            {
              type: "stream",
              shortname: "Amazon (LIVE)",
              name: "Live Stream, Tembé Indigenous Territory",
              description: "Live Stream, Tembé Indigenous Territory, Amazon Rainforest, Pará, Brazil",
              location: "Amazon, Pará, Brazil",
              timezone_offset: -3,
              flickr_photoset_id: "72157637623902166",
              urls: {
                audio: "/v1/guardians/0bdbb4a5d567/audio.json"
              }
            }

          ]
          
        });


  })
;

module.exports = router;
