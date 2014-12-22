var models  = require('../../models');
var express = require('express');
var router = express.Router();
var aws = require("../../config/aws.js").aws(process.env);


router.route("/")
  .post(function(req, res) {
    if (!!req.files.audio) {
      var fileInfo = {
        guardian_id: "fedcba",
        checkin_id: "ghijkl",
        created_at: new Date()
      };
      saveCheckInAudio(req, res, fileInfo, function(req, res, fileInfo){
        addAudioToIngestionQueue(req, res, fileInfo, function(req, res, fileInfo){
          res.json(fileInfo);
        });
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

// Special Callbacks

function saveCheckInAudio(req, res, fileInfo, callback) {
  fileInfo.s3Path = 
    "/"+process.env.NODE_ENV
    +"/guardians/"+fileInfo.guardian_id
    +"/"+fileInfo.created_at.toISOString().substr(0,10).replace(/-/g,"/")
    +"/"+fileInfo.guardian_id
    +"-"+fileInfo.created_at.toISOString().substr(0,19).replace(/:/g,"-")
    +req.files.audio.originalname.substr(req.files.audio.originalname.indexOf("."));
  aws.s3("rfcx-ark").putFile(
  req.files.audio.path, fileInfo.s3Path, 
  function(err, s3Res){
    var s3Info = {  };
    s3Res.resume();
    if (!!err) {
      res.status(500).json({msg:"error saving audio"});
    } else {
      callback(req, res, fileInfo);
    }
  });
}

function addAudioToIngestionQueue(req, res, fileInfo, callback) {
  fileInfo.created_at = fileInfo.created_at.toISOString();
  console.log(fileInfo);
  aws.sqs("rfcx-ingestion").sendMessage(fileInfo)
    .then(function(sqsResponse) {    
      console.log(sqsResponse);
      callback(req, res, fileInfo);
//      res.json(messageArray);
    }).catch(function(err){
      res.status(500).json({msg:"error adding audio to ingestion queue"});
    });
}


