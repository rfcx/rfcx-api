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


function createTag(dbTag) {

		return models.GuardianAudio
			.findOne({where: {guid: dbTag.audio_id}})
			.then(function (dbAudio) {
				var guid = dbTag.audio_id;
				dbTag.audio_id = dbAudio.id;
				dbTag.utc_begins_at = new Date(dbAudio.measured_at);
				dbTag.utc_ends_at = new Date(dbAudio.measured_at);
				dbTag.utc_begins_at.setMilliseconds(dbTag.utc_begins_at.getMilliseconds() + dbTag.begins_at);
				dbTag.utc_ends_at.setMilliseconds(dbTag.utc_ends_at.getMilliseconds() + dbTag.ends_at);


				return models.GuardianAudioTag
					.create(dbTag).then(function (dbTag) {
					dbTag.audio_id = guid;
					return dbTag;
				});



			});

}

function createOne(req, res) {
	req.body.data.attributes.taggedByUser = req.rfcx.auth_token_info.owner_id;
	var converter = new ApiConverter("tag", req);
	var dbTag = converter.mapApiToSequelize(req.body);
	createTag(dbTag).then(function (dbTag) {
		var apiTag = converter.mapSequelizeToApi(dbTag);
		apiTag.data.attributes.audioId = dbAudio.guid;
		res.status(201).json(apiTag);
		return dbTag;
	}).catch(function (err) {

		// creation failed... probable cause: uuid already existed, strange!
		console.log('Error while saving Tag | ', err);
		if (!!err) {
			res.status(500).json({msg: "The tag could not be generated. Maybe your id was not unique?"});
		}
	});
}

function createMany(req, res) {
	var promises = [];
	var converter = new ApiConverter("tag", req);
	if (!Array.isArray(req.body.data.attributes)) {
		res.status(400).json({msg: "Attributes must be an array!"});
	}
	// iterate through all classifications inslide `list` attribute
	for (var i = 0; i < req.body.data.attributes.length; i++) {
		var dbTag = converter.mapApiToSequelize(req.body.data.attributes[i]);
		dbTag.taggedByUser = req.rfcx.auth_token_info.owner_id;
		promises.push(createTag(dbTag));
	}
	Promise.all(promises)
		.then(function (dbTags) {
			// TODO: process each db action result and send all data back to client
			// TODO: replace result json object
			res.status(201).json(dbTags.map(function (dbTag) {
				return converter.mapSequelizeToApi(dbTag.dataValues);
			}));
			return dbTags;
		}).catch(function (err) {
		console.log('Error in process of tagging |', err);
		res.status(500).json({msg: "Error in process of tagging save"});
	});
}
router.route("/")
	.post(passport.authenticate("token", {session: false}), requireUser, function (req, res) {
		if (req.body.data.type == 'tags') {
			createMany(req, res);
		} else {
			createOne(req, res);
		}
	});


router.route("/:tag_id")
	.get(passport.authenticate("token", {session: false}), requireUser, function (req, res) {
		var converter = new ApiConverter("tag", req);

		models.GuardianAudioTag
			.findOne({
				where: {guid: req.params.tag_id}
			}).then(function (dbTag) {

			res.status(200).json(converter.mapSequelizeToApi(dbTag));

		}).catch(function (err) {
			if (!!err) {
				res.status(404).json({msg: "Tag with id " + req.params.tag_id + " does not exist."});
			}
		});

	});



module.exports = router;
