var models  = require('../models');
var querystring = require("querystring");

module.exports = {

		/**
	 * Store/Update a record of the new software version and make it 'available' if a file was uploaded
	 *
	 * @param {String} softwareVersion
	 * @param {String} softwarePath
	 * @return {Promise} Promise with entity
	 * @api public
	 */
	upsertGuardianSoftware: function(softwareVersion, fileHash) {
    return models.GuardianSoftware
      .findOrCreate({ where: { number: softwareVersion, role: "xguardian" } })
      .spread(function(dbSoftware, wasCreated){
        if (!!fileHash) {
          dbSoftware.release_date = new Date();
          dbSoftware.is_available = true;
          dbSoftware.sha1_checksum = fileHash;
          dbSoftware.url = process.env.GUARDIAN_DOWNLOAD_PATH+dbSoftware.number+".apk";
          return dbSoftware.save();
        }
        return dbSoftware;
      });
  },

  /**
  * Delete the guardian software record with the matching software version
  *
  * @param {String} softwareVersion
  * @return {Promise} with outcome
  * @api public
  */
  deleteGuardianSoftware: function(softwareVersion) {
    return models.GuardianSoftware
      .destroy({ where: { number: softwareVersion, role: "xguardian" } });
  },

  /**
  * find the guardian software record with the matching software version
  *
  * @param {String} softwareVersion
  * @return {Promise} with entity
  * @api public
  */
  findGuardianSoftware: function(softwareVersion) {
    return models.GuardianSoftware
      .find({ where: { number: softwareVersion, role: "xguardian" } });
  }
};