var models  = require("../../../models");
var express = require("express");
var router = express.Router();
var views = require("../../../views/v1");
var passport = require("passport");
var httpError = require("../../../utils/http-errors.js");
var Promise = require("bluebird");
passport.use(require("../../../middleware/passport-token").TokenStrategy);
var ApiConverter = require("../../../utils/api-converter");

function filterExcludedGuids(originalArray, foundedArray) {
  return originalArray.filter(function(item) {
    return foundedArray.indexOf(item) === -1;
  });
}

router.route("/audio-collections/by-guids")
  .post(passport.authenticate("token", {session: false}), function (req, res) {

    var converter = new ApiConverter("audio-collection", req);

    var body = req.body;

    if (!body.audios || !body.audios.length) {
      return httpError(res, 400, null, 'Request does not contain audio guids');
    }

    // Convert array of objects to object with keys
    /*
       {
          "guid": "7cdee0b4-892d-4cbd-b23a-6a62b24cffe4",
          "note": "first note"
       },
       {
          "guid": "c03b78ad-1b82-4447-87ae-c2a903e98d34",
          "note": "second note"
       },
       {
          "guid": "dca1d906-f5ac-4ee2-8b1b-a6c5d4f70c2d",
          "delete": true
       },
     */
    // to
    /*
       {
          "7cdee0b4-892d-4cbd-b23a-6a62b24cffe4": {
            "note": "first note"
          },
          "c03b78ad-1b82-4447-87ae-c2a903e98d34": {
            "note": "second note"
          },
          "dca1d906-f5ac-4ee2-8b1b-a6c5d4f70c2d": {
            "delete": true
          }
       }
     */
    var audioDataObj = {};
    body.audios.forEach(function(audio) {
      audioDataObj[audio.guid] = {
        note: audio.note,
        delete: !!audio.delete
      }
    });

    // get array of all audio guids
    var audioGuids = Object.keys(audioDataObj);

    return models.GuardianAudio
      // first of all check if audio files with given guids exist
      .findAll({
        where: { guid: { $in: audioGuids } }
      })
      // bind to empty object, so we can save our callback results into it
      .bind({})
      .then(function(dbAudio) {
        if (!dbAudio.length) {
          return httpError(res, 400, null, 'Database does not contain following guids');
        }

        this.dbAudio = dbAudio;

        // get array of all founded audios
        var guids = dbAudio.map(function (item) {
          return item.guid;
        });

        // get array of all not founded audios
        this.excluded = filterExcludedGuids(audioGuids, guids);

        return models.GuardianAudioCollection
          .findOrCreate({
            where: { guid: body.guid }
          });
      })
      .spread(function (dbGuardianAudioCollection, created) {
        // save collection object
        this.dbGuardianAudioCollection = dbGuardianAudioCollection;
        var promises = [];
        this.dbAudio.forEach(function(audio) {
          if (audioDataObj[audio.guid].delete) {
            promises.push(dbGuardianAudioCollection.removeGuardianAudio(audio));
          }
          else {
            promises.push(dbGuardianAudioCollection.addGuardianAudio(audio, {note: audioDataObj[audio.guid].note? audioDataObj[audio.guid].note : null}));
          }
        });
        return Promise.all(promises);
      })
      .then(function() {
        return models.GuardianAudioCollection
          .findOne({
            where: { guid: this.dbGuardianAudioCollection.guid },
            include: [{ all: true } ]});
      })
      .then(function(dbGuardianAudioCollection) {
        return views.models.guardianAudioCollection(req,res,dbGuardianAudioCollection)
      })
      .then(function(data) {

        var api = converter.cloneSequelizeToApi(data);

        api.data.id = this.dbGuardianAudioCollection.guid;
        api.data.attributes.excluded = this.excluded.length? this.excluded : null;

        res.status(200).json(apiEvent);

      })
      .catch(function(err){
        console.log("failed to create audio collection | "+err);
        if (!!err) { res.status(500).json({ message: "failed to create audio collection", error: { status: 500 } }); }
      });

  });

router.route("/audio-collections/:id")
  .get(passport.authenticate("token", {session: false}), function (req, res) {

    var converter = new ApiConverter("audio-collection", req);

    return models.GuardianAudioCollection
      .findOne({
        where: { guid: req.params.id },
        include: [{ all: true } ]
      })
      .bind({})
      .then(function(dbGuardianAudioCollection) {
        this.dbGuardianAudioCollection = dbGuardianAudioCollection;
        return views.models.guardianAudioCollection(req,res,dbGuardianAudioCollection)
      })
      .then(function(data) {

        var api = converter.cloneSequelizeToApi(data);

        api.data.id = this.dbGuardianAudioCollection.guid;
        api.links.self += this.dbGuardianAudioCollection.guid;

        res.status(200).json(api);

      })
      .catch(function(err){
        console.log("failed to return audio collection | "+err);
        if (!!err) { res.status(500).json({ message: "failed to return audio collection", error: { status: 500 } }); }
      });

  });

module.exports = router;