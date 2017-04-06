
exports.assetUtils = {

    getGuardianAssetStoragePath: function(assetCategory,assetDateTime,guardianGuid,fileExtension) {

        var dateTimeString = assetDateTime.toISOString().substr(0,19).replace(/:/g,"-");

        var assetStoragePath = "/"+assetCategory
                +"/"+dateTimeString.substr(0,4)+"/"+dateTimeString.substr(5,2)+"/"+dateTimeString.substr(8,2)
                +"/"+guardianGuid
                +"/"+guardianGuid+"-"+dateTimeString+"."+fileExtension;

        return assetStoragePath;

    }


};

