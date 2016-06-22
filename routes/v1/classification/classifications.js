var verbose_logging = (process.env.NODE_ENV !== "production");
var models = require("../../../models");
var express = require("express");
var router = express.Router();
var views = require("../../../views/v1");
var passport = require("passport");
passport.use(require("../../../middleware/passport-token").TokenStrategy);
var ApiConverter = require("../../../utils/api-converter");
var requireUser = require("../../../middleware/authorization/authorization").requireTokenType("user");
var Promise = require("bluebird");


router.route("/")
	.post(passport.authenticate("token", {session: false}), requireUser, function (req, res) {
		var converter = new ApiConverter("classification", req);
		var apiClassification = converter.mapApiToSequelize(req.body);
		apiClassification.analyst = req.rfcx.auth_token_info.owner_id;
		models.Classifications
			.create(apiClassification).then(function (dbApiClassification) {
				res.status(201).json(converter.mapSequelizeToApi(dbApiClassification));
		}).catch(function (err) {
			// creation failed... probable cause: uuid already existed, strange!
        console.log('Error while saving Classification | ', err);
			if (!!err) {
				res.status(500).json({title: "The classification could not be generated. Maybe your id was not unique?"});
			}
		});

	});

router.route("/multiple")
  .post(passport.authenticate("token", {session: false}), requireUser, function (req, res) {
    var promises = [];
    var converter = new ApiConverter("classification", req);
    // iterate through all classifications inslide `list` attribute
    for (var i = 0; i < req.body.data.attributes.list.length; i++) {
      var apiClassification = converter.mapApiToSequelize(req.body.data.attributes.list[i]);
      apiClassification.analyst = req.rfcx.auth_token_info.owner_id;
      promises.push(models.Classifications.create(apiClassification));
    }
    Promise.all(promises)
      .then(function(dbApiClassifications) {
        // TODO: process each db action result and send all data back to client
        // TODO: replace result json object
        res.status(201).json({});
      }, function(err) {
        console.log('Error in process of classifications save |', err);
        res.status(500).json({title: "Error in process of classifications save"});
      });

  });


router.route("/:classification_id")
	.get(passport.authenticate("token", {session: false}), requireUser, function (req, res) {
		var converter = new ApiConverter("classification", req);

		models.Classifications
			.findOne({
				where: {id: req.params.classification_id}
			}).then(function (dbClassification) {

				res.status(200).json(converter.mapSequelizeToApi(dbClassification));

		}).catch(function (err) {
			if (!!err) {
				res.status(404).json({title: "Classification with id " + req.params.classification_id + " does not exist."});
			}
		});

	});


module.exports = router;
