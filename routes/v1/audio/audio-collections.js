var models  = require("../../../models");
var express = require("express");
var router = express.Router();
var views = require("../../../views/v1");
var passport = require("passport");
var httpError = require("../../../utils/http-errors.js");
var Promise = require("bluebird");
passport.use(require("../../../middleware/passport-token").TokenStrategy);
var ApiConverter = require("../../../utils/api-converter");
var datafiltersService = require('../../../services/datafilters/datafilters-service');
var csvUtils = require("../../../utils/misc/csv");

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
      return httpError(req, res, 400, null, 'Request does not contain audio guids');
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
        position: audio.position,
        delete: !!audio.delete
      }
    });

    // get array of all audio guids
    var audioGuids = Object.keys(audioDataObj);

    return models.GuardianAudio
      // first of all check if audio files with given guids exist
      .findAll({
        where: { guid: { [models.Sequelize.Op.in]: audioGuids } }
      })
      // bind to empty object, so we can save our callback results into it
      .bind({})
      .then(function(dbAudio) {
        if (!dbAudio.length) {
          return httpError(req, res, 400, null, 'Database does not contain following guids');
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

        // get all audios related to current collection to get their count
        return dbGuardianAudioCollection.getGuardianAudios();
      })
      .then(function(dbGuardianAudios) {
        // variable to store new audio file position
        var currentIndex = 0,
        // variable to store all existing audio guids
            existingAudioGuids = [];
        // go through all existing audio files, collect their guids and calculate the latest position
        dbGuardianAudios.forEach(function(item) {
          existingAudioGuids.push(item.guid);
          if (item.GuardianAudioCollectionsRelation.position >= currentIndex) {
            currentIndex = item.GuardianAudioCollectionsRelation.position + 1;
          }
        });
        var promises = [];
        this.dbAudio.forEach(function(audio) {
          // if file need to be deleted, then create delete promise
          if (audioDataObj[audio.guid].delete) {
            promises.push(this.dbGuardianAudioCollection.removeGuardianAudio(audio));
          }
          else if (existingAudioGuids.indexOf(audio.guid) !== -1) {
            var obj = {};
            if (audioDataObj[audio.guid].note !== undefined) {
              obj.note = audioDataObj[audio.guid].note;
            }
            if (audioDataObj[audio.guid].position !== undefined) {
              obj.position = audioDataObj[audio.guid].position;
            }
            if (Object.keys(obj).length) {
              promises.push(this.dbGuardianAudioCollection.addGuardianAudio(audio, obj));
            }
          }
          // if file need to be added, then check if it's already exist. if not, create create promise
          else if (existingAudioGuids.indexOf(audio.guid) === -1) {
            promises.push(this.dbGuardianAudioCollection.addGuardianAudio(audio, {
              note: audioDataObj[audio.guid].note? audioDataObj[audio.guid].note : null,
              position: currentIndex++
            }));
          }
        }.bind(this));
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


        res.status(200).json(api);

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

router.route("/audio-collections/:id/data")
  .get(passport.authenticate("token", {session: false}), function (req, res) {

    return models.GuardianAudioCollection
      .findOne({
        where: { guid: req.params.id },
        include: [{ all: true } ]
      })
      .bind({})
      .then(function(dbGuardianAudioCollection) {
        if (!dbGuardianAudioCollection) {
          return httpError(req, res, 404, null, 'Database does not contain following audio collection.');
        }
        this.guids = dbGuardianAudioCollection.GuardianAudios.map(function(audio) {
          return audio.guid;
        });
        return models.AudioAnalysisTrainingSet.findOne({
          where: {
            [models.Sequelize.Op.or]: {
              training_set: dbGuardianAudioCollection.id,
              test_set: dbGuardianAudioCollection.id
            }
          }
        });
      })
      .then(function(dbAudioAnalysisTrainingSet) {
        if (!dbAudioAnalysisTrainingSet) {
          return httpError(req, res, 404, null, 'Audio Collection is not associated with any Training Sets.');
        }
        this.eventValue = dbAudioAnalysisTrainingSet.event_value;
        return datafiltersService.getLabelsData({
          tagType: 'label',
          tagValues: this.eventValue,
          audioGuids: this.guids
        });
      })
      .then(function(labels) {
        return views.models.DataFilterAudioGuidToJson(req, res, {
          guids: this.guids,
          labels: labels
        });
      })
      .then(function(dataObj) {
        return csvUtils.generateCSV(dataObj.data.attributes.labels, this.eventValue);
      })
      .then(function(csv) {
        res.contentType('text/csv');
        res.attachment('event.csv');
        res.status(200).send(csv);
      });

  });

module.exports = router;
