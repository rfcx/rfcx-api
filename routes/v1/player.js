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
        reference_tag: "player-web",
        token_type: "player-web",
        created_by: "player-web",
        minutes_until_expiration: 360,
        allow_garbage_collection: false,
        only_allow_access_to: [ 
          "^/v1/player/web",
          "^/v1/guardians/[012345678abcdef]{12}/audio.json$",
          "^/v1/sites/mbang/images.json",
          "^/v1/sites/tembe/images.json",
          "^/v1/playlists/[012345678abcdef]{8}-[012345678abcdef]{4}-[012345678abcdef]{4}-[012345678abcdef]{4}-[012345678abcdef]{12}/audio.json$"
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
              name: "Amazon (LIVE)",
              location: "",
              urls: {
                audio: "/v1/guardians/0bdbb4a5d567/audio.json",
                slideshow: "/v1/sites/mbang/images.json"
              }
            }

          ],
          
          playlists: [

            {
              name: "Congo Basin",
              location: "Mbang, Cameroon",
              playlists: [

                {
                  name: "Sunrise",
                  urls: {
                    audio: "/v1/playlists/453e6376-d0b9-4ec9-8ebc-55bf336711a3.json",
                    slideshow: "/v1/sites/mbang/images.json"
                  }
                },

                {
                  name: "Sunset",
                  urls: {
                    audio: "/v1/playlists/453e6376-d0b9-4ec9-8ebc-55bf336711a3.json",
                    slideshow: "/v1/sites/mbang/images.json"
                  }
                },

                {
                  name: "Midnight",
                  urls: {
                    audio: "/v1/playlists/453e6376-d0b9-4ec9-8ebc-55bf336711a3.json",
                    slideshow: "/v1/sites/mbang/images.json"
                  }
                }

              ]
            },


            {
              name: "Amazon (Brazil)",
              location: "Tembé Territory, Brazil",
              playlists: [

                {
                  name: "Sunrise",
                  urls: {
                    audio: "/v1/playlists/453e6376-d0b9-4ec9-8ebc-55bf336711a3.json",
                    slideshow: "/v1/sites/tembe/images.json"
                  }
                },

                {
                  name: "Sunset",
                  urls: {
                    audio: "/v1/playlists/453e6376-d0b9-4ec9-8ebc-55bf336711a3.json",
                    slideshow: "/v1/sites/tembe/images.json"
                  }
                },

                {
                  name: "Midnight",
                  urls: {
                    audio: "/v1/playlists/453e6376-d0b9-4ec9-8ebc-55bf336711a3.json",
                    slideshow: "/v1/sites/tembe/images.json"
                  }
                },

                {
                  name: "Tembé Ceremony",
                  urls: {
                    audio: "/v1/playlists/453e6376-d0b9-4ec9-8ebc-55bf336711a3.json",
                    slideshow: "/v1/sites/tembe/images.json"
                  }
                }

              ]
            },


            {
              name: "Amazon (Ecuador)",
              location: "Cerro Blanco, Ecuador",
              playlists: [
              ]
            }




          ]
        });


  })
;

module.exports = router;
