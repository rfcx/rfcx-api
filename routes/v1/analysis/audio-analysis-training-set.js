var models  = require("../../../models");
var express = require("express");
var router = express.Router();
var views = require("../../../views/v1");
var passport = require("passport");
var httpError = require("../../../utils/http-errors.js");
var Promise = require("bluebird");
passport.use(require("../../../middleware/passport-token").TokenStrategy);
var ApiConverter = require("../../../utils/api-converter");

router.route("/training-sets")
  .post(passport.authenticate("token", {session: false}), function (req, res) {

    var converter = new ApiConverter("training-set", req);

    var body = req.body;

    if (!body.name) {
      return httpError(res, 400, null, 'Request does not contain set name');
    }

    if (!body.event_value) {
      return httpError(res, 400, null, 'Request does not contain event value');
    }

    var dataObj = {
      name: body.name,
      event_value: body.event_value
    };

    // first of all, let's find event value
    //return models.GuardianAudioEventValue
    //  .findOne({
    //    where: { value: body.event_value }
    //  })
      // bind to empty object, so we can save our callback results into it
      //.bind({})
      //.then(function(dbGuardianAudioEventValue) {
      //  if (!dbGuardianAudioEventValue) {
      //    return new Promise(function(resolve, reject) {
      //      reject(new Error('Cannot find event value with given name'));
      //    });
      //  }
      //  else {
          // update data object with event value id
          //dataObj.event_value = dbGuardianAudioEventValue.id;

          // then create Training Set model and two Audio Collections models: one for Training Set and one for Test Set
          var promises = [];
          promises.push(models.AudioAnalysisTrainingSet
            .findOrCreate({
              where: { guid: body.guid },
              defaults: dataObj
            })
          );
          promises.push(models.GuardianAudioCollection.create());
          // create audio collection for test set
          promises.push(models.GuardianAudioCollection.create());
          //return Promise.all(promises);
        //}
      //})
    Promise.all(promises)
      .spread(function(trainingSetResults, trainingCollection, testCollection) {
        this.guid = trainingSetResults[0].guid;
        this.trainingCollection = trainingCollection;
        this.testCollection = testCollection;
        // update data object with Audio Collections ids
        dataObj.training_set = trainingCollection.id;
        dataObj.test_set = testCollection.id;
        // save all data to brand new Training Set
        return models.AudioAnalysisTrainingSet
          .update(dataObj, { where: {guid: trainingSetResults[0].guid}});
      })
      .spread(function() {
        return models.AudioAnalysisTrainingSet
          .findOne({
            where: {guid: this.guid},
            include: [{ all: true }]
          });
      })
      .then(function(dbAudioAnalysisTrainingSet) {
        return views.models.audioAnalysisTrainingSet(req, res, dbAudioAnalysisTrainingSet, this.trainingCollection, this.testCollection);
      })
      .then(function(data) {
        var api = converter.cloneSequelizeToApi(data);
        api.data.id = this.guid;
        res.status(200).json(api);
      })
      .catch(function(err){
        console.log("Failed to save training set | " + err);
        if (!!err) { res.status(500).json({ message: err? err.message : "Failed to save training set", error: { status: 500 } }); }
      });

  });

router.route("/training-sets")
  .get(passport.authenticate("token", {session: false}), function (req, res) {

    var converter = new ApiConverter("training-set", req);

    return models.AudioAnalysisTrainingSet
      .findAll({
        include: [{ all: true } ]
      })
      .then(function(dbAudioAnalysisTrainingSets) {
        return views.models.audioAnalysisTrainingSets(req, res, dbAudioAnalysisTrainingSets);
      })
      .then(function(data) {
        var api = converter.cloneSequelizeToApi(data);
        res.status(200).json(api);

      })
      .catch(function(err){
        console.log("Failed to return training sets | "+err);
        if (!!err) { res.status(500).json({ message: "Failed to return training sets", error: { status: 500 } }); }
      });

  });

router.route("/training-sets/:id")
  .get(passport.authenticate("token", {session: false}), function (req, res) {

    var converter = new ApiConverter("training-set", req);

    return models.AudioAnalysisTrainingSet
      .findOne({
        where: { guid: req.params.id },
        include: [{ all: true } ]
      })
      .bind({})
      .then(function(dbAudioAnalysisTrainingSet) {
        this.dbAudioAnalysisTrainingSet = dbAudioAnalysisTrainingSet;
        var promises = [];
        promises.push(dbAudioAnalysisTrainingSet.TrainingSet.getGuardianAudios());
        promises.push(dbAudioAnalysisTrainingSet.TestSet.getGuardianAudios());
        return Promise.all(promises);
      })
      .then(function(data) {
        return views.models.audioAnalysisTrainingSet(req, res, this.dbAudioAnalysisTrainingSet, data[0], data[1]);
      })
      .then(function(data) {

        var api = converter.cloneSequelizeToApi(data);

        api.data.id = this.dbAudioAnalysisTrainingSet.guid;
        api.links.self += this.dbAudioAnalysisTrainingSet.guid;

        res.status(200).json(api);

      })
      .catch(function(err){
        console.log("Failed to return training set | "+err);
        if (!!err) { res.status(500).json({ message: "Failed to return training set", error: { status: 500 } }); }
      });

  });


module.exports = router;