var models  = require('../../models');
var express = require('express');
var router = express.Router();
var aws = require("../../config/aws.js").aws();

router.route("/")
  .post(function(req, res) {
    if (!!req.files.audio) {
      var fileInfo = {
        guardian_id: "fedcba",
        checkin_id: "ghijkl",
        created_at: new Date()
      };
      console.log("received checkin request with file");
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
  console.log("uploading file to s3");
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
    if (200 == s3Res.statusCode) {
      callback(req, res, fileInfo);
    } else {
      res.status(500).json({msg:"error saving audio"});
    }
  });
}

function addAudioToIngestionQueue(req, res, fileInfo, callback) {
  console.log("adding job to ingestion queue");
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


