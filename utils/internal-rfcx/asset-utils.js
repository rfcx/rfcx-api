
exports.assetUtils = {

    getGuardianAssetStoragePath: function(assetCategory,assetDateTime,guardianGuid,fileExtension) {

        var dateTimeString = assetDateTime.toISOString().substr(0,19).replace(/:/g,"-");

        var assetStoragePath = "/"+assetCategory
                +"/"+dateTimeString.substr(0,4)+"/"+dateTimeString.substr(5,2)+"/"+dateTimeString.substr(8,2)
                +"/"+guardianGuid
                +"/"+guardianGuid+"-"+dateTimeString+"."+fileExtension;

        return assetStoragePath;
    },

	mimeTypeFromAudioCodec: function(audioCodec) {

	  if (audioCodec.toLowerCase() == "opus") {
	    return "audio/ogg";
	  } else if (audioCodec.toLowerCase() == "flac") {
	    return "audio/flac";
	  } else if (audioCodec.toLowerCase() == "aac") {
	    return "audio/mp4";
	  } else if (audioCodec.toLowerCase() == "mp3") {
	    return "audio/mpeg";
	  } else {
	    return null;
	  }
	},

	deleteLocalFileFromFileSystem: function(filePath) {
	    fs.stat( filePath, function(err, stat) {
	      if (err == null) { fs.unlink( filePath, function(e) { if (e) { console.log(e); } } ); }
	    });
	}

};

