var verbose_logging = (process.env.NODE_ENV !== "production");
var models  = require("../../models");
var express = require("express");
var router = express.Router();
var querystring = require("querystring");
var fs = require("fs");
var aws = require("../../config/aws.js").aws();

router.route("/:guardian_id/audio/latest")
  .get(function(req,res) {

    models.Guardian
      .findOne( { where: { guid: req.params.guardian_id } })
      .then(function(dbGuardian){

        // models.GuardianCheckIn
        //   .findOne( { where: { guid: req.params.checkin_id } })
        //   .then(function(dbCheckIn){

        //   console.log("checkin: "+dbCheckIn.guid);

            models.GuardianAudio
              .findAll({ where: { guardian_id: dbGuardian.id }, order: "measured_at DESC", limit: 1 })
              .then(function(dbAudio){
                
                var audioJson = [];

                for (i in dbAudio) {
                  var aud = dbAudio[i],
                      s3NoProtocol = aud.url.substr(aud.url.indexOf("://")+3),
                      s3Bucket = s3NoProtocol.substr(0,s3NoProtocol.indexOf("/")),
                      s3Path = s3NoProtocol.substr(s3NoProtocol.indexOf("/"));
                  audioJson.push({
                    guid: aud.guid,
                    measured_at: aud.measured_at,
                    analyzed_at: aud.analyzed_at,
                    size: aud.size,
                    length: aud.length,
                    sha1_checksum: aud.sha1_checksum,
                    url: aws.s3SignedUrl(s3Bucket,s3Path,10),
                    guardian: {
                    }
                  });
                }

                res.status(200).json(audioJson);

              }).catch(function(err){
                console.log("failed to find audio reference | "+err);
                if (!!err) { res.status(500).json({msg:"failed to find audio reference"}); }
              });

      }).catch(function(err){
        console.log("failed to find guardian reference | "+err);
        if (!!err) { res.status(500).json({msg:"failed to find guardian reference"}); }
      });

  })
;



module.exports = router;



