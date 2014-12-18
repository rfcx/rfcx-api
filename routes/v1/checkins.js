var models  = require('../../models');
var express = require('express');
var router = express.Router();
var aws = require("../../config/aws.js").aws(process.env);


router.route("/")
  .post(function(req, res) {
    if (req.files.audio.length > 0) {
      aws.s3("rfcx-ark").putFile(
      req.files.audio[0].path,
      "/test/"+req.files.audio[0].originalname, 
      function(err, s3Res){
        var jsonObj = { name: "thisName" };      
        if (!!err) {
          aws.sqs("rfcx-ingestion").sendMessage(jsonObj)
            .then(function(messageArray) {
              res.json(messageArray);
            }).catch(function(err){
              res.json(jsonObj);
            });
        } else {
          res.json(err);
        }

      });
    }
  })
;

router.route("/:checkin_id")
  .get(function(req, res) {
    res.json({name:"one checkin: "+req.params.checkin_id});
  })
;

module.exports = router;
