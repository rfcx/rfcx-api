var util = require("util");
var Promise = require("bluebird");
var models  = require("../../models");

exports.audio = {

  info: function(audioFiles, audioMeta, guardianGuid, checkInGuid) {

    var audioInfo = {};

    if (!!audioFiles) {

      // make sure the screenshot files is an array
      if (!util.isArray(audioFiles)) { audioFiles = [audioFiles]; }
        
      if (audioMeta.length == audioFiles.length) {

        for (i in audioFiles) {

          var timeStamp = audioMeta[i][1]; 
          var dateString = (new Date(parseInt(timeStamp))).toISOString().substr(0,19).replace(/:/g,"-");

          audioInfo[timeStamp] = {
            guardian_id: guardianGuid,
            checkin_id: checkInGuid,
            guardianSha1Hash: audioMeta[i][3],
            uploadLocalPath: audioFiles[i].path,
            unzipLocalPath: audioFiles[i].path.substr(0,audioFiles[i].path.lastIndexOf("."))+"."+audioMeta[i][2],
            size: null, // to be calculated following the uncompression
            sha1Hash: null, // to be calculated following the uncompression
            duration: null,
            timeStamp: timeStamp,
            measured_at: new Date(parseInt(timeStamp)),
            api_token_guid: null,
            api_token: null,
            api_token_expires_at: null,
            api_url: null,
            isSaved: { db: false, s3: false, sqs: false },
            s3Path: "/"+process.env.NODE_ENV
                   +"/"+dateString.substr(0,7)+"/"+dateString.substr(8,2)
                   +"/"+guardianGuid
                   +"/"+guardianGuid+"-"+dateString+"."+audioMeta[i][2]
          };
          
          // screenShotInfo[timeStamp] = {
          //   guardian_id: guardianId,
          //   checkin_id: checkInId,
          //   screenshot_id: null, 
          //   uploadLocalPath: screenShotFiles[i].path,
          //   size: fs.statSync(screenShotFiles[i].path).size,
          //   sha1Hash: hash.fileSha1(screenShotFiles[i].path),
          //   guardianSha1Hash: screenShotMeta[i][3],
          //   origin_id: timeStamp,
          //   timeStamp: new Date(parseInt(timeStamp)),
          //   isSaved: false,
          //   s3Path: "/screenshots/"+process.env.NODE_ENV
          //            +"/"+dateString.substr(0,7)+"/"+dateString.substr(8,2)
          //            +"/"+guardianGuid
          //            +"/"+guardianGuid+"-"+dateString+".png"
          // };
          // console.log(screenShotInfo);


        }


      } else {
        console.log("couldn't match audio meta to uploaded content | "+audioMeta);
      }

    }
    return audioInfo;
  },



};


