var util = require("util");
var Promise = require("bluebird");
var models  = require("../../models");

exports.audio = {

  info: function(audioFiles, audioMeta) {

    var audioInfo = {};

    if (!!audioFiles) {

      // make sure the screenshot files is an array
      if (!util.isArray(audioFiles)) { audioFiles = [audioFiles]; }
        
      if (audioMeta.length == audioFiles.length) {

        for (i in audioFiles) {

          var timeStampIndex = audioMeta[i][1]; 
       //   audioMeta[i][1] = timeStampToDate(audioMeta[i][1], json.timezone_offset);
      //    var dateString = audioMeta[i][1].toISOString().substr(0,19).replace(/:/g,"-");

          console.log(audioMeta[i]);

          // var timeStamp = screenShotFiles[i].originalname.substr(0,screenShotFiles[i].originalname.lastIndexOf(".png"));
          // var dateString = (new Date(parseInt(timeStamp))).toISOString().substr(0,19).replace(/:/g,"-");
          
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


