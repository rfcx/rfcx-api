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
var sqlUtils = require("../../../utils/misc/sql");
var urls = require('../../../utils/misc/urls');

function createOrUpdateTag(dbTag) {

    return models.GuardianAudio
      .findOne({
        where: {guid: dbTag.audio_id},
        include: [{ all: true }]
      })
      .then(function (dbAudio) {
        var guid = dbTag.audio_id;

        // if begins_at_offset is not presented in request, then set it to 0
        dbTag.begins_at_offset = dbTag.begins_at_offset || 0;
        // if ends_at_offset is not presented in request, then check if duration presented, if not set to audio file duration
        dbTag.ends_at_offset   = dbTag.ends_at_offset || dbTag.duration ||
        (Math.round(1000*dbAudio.dataValues.capture_sample_count/dbAudio.Format.sample_rate));

        dbTag.audio_id = dbAudio.id;
        dbTag.begins_at = new Date(dbAudio.dataValues.measured_at);
        dbTag.ends_at = new Date(dbAudio.dataValues.measured_at);
        dbTag.begins_at.setMilliseconds(dbTag.begins_at.getMilliseconds() + dbTag.begins_at_offset);
        dbTag.ends_at.setMilliseconds(dbTag.ends_at.getMilliseconds() + dbTag.ends_at_offset);

        return models.GuardianAudioTag
          .findOrCreate({where: {guid: dbTag.guid}, defaults: dbTag})
          .spread(function (dbTagResult, created) {
            if (created) {
              return models.User
                .findOne({where: {id: dbTagResult.tagged_by_user}})
                .then(function (dbUser) {
                  dbTagResult.audio_id = guid;
                  dbTagResult.tagged_by_user = dbUser.guid;
                  return dbTagResult;
                });
            }
            else {
              return models.GuardianAudioTag
                .update(dbTag, {where: {guid: dbTagResult.guid}})
                .spread(function() {
                  return dbTagResult;
                });
            }
          });
      });
}

function processOne(req, res) {
	var guid = req.body.data.attributes.audioId;
	req.body.data.attributes.taggedByUser = req.rfcx.auth_token_info.owner_id;
	var converter = new ApiConverter("tag", req);
	var dbTag = converter.mapApiToSequelize(req.body);
	dbTag.audio_id = guid;
  createOrUpdateTag(dbTag).then(function (dbTag) {
		var apiTag = converter.mapSequelizeToApi(dbTag);
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

function processMany(req, res) {
	var promises = [];
	var converter = new ApiConverter("tag", req);
	if (!Array.isArray(req.body.data.attributes)) {
		res.status(400).json({msg: "Attributes must be an array!"});
	}
	// iterate through all classifications inside `list` attribute
	for (var i = 0; i < req.body.data.attributes.length; i++) {
		var dbTag = converter.mapApiToSequelize(req.body.data.attributes[i]);
		dbTag.tagged_by_user = req.rfcx.auth_token_info.owner_id;
		promises.push(createOrUpdateTag(dbTag));
	}
	Promise.all(promises)
		.then(function (dbTags) {
			var api = { type: "tags"};
			api.data = dbTags.map(function (dbTag) {
				return converter.mapSequelizeToApi(dbTag.dataValues);
			});
			res.status(201).json(api);
			return dbTags;
		}).catch(function (err) {
		console.log('Error in process of tagging |', err);
		res.status(500).json({msg: "Error in process of tagging save"});
	});
}
router.route("/")
	.post(passport.authenticate("token", {session: false}), requireUser, function (req, res) {
		if (req.body.data.type == 'tags') {
			processMany(req, res);
		} else {
			processOne(req, res);
		}
	});

router.route("/audio/:audio_guid")
  .get(passport.authenticate("token", {session: false}), requireUser, function (req, res) {

    var opts = {
      audioGuid: req.params.audio_guid
    };

    var sql = 'SELECT t.begins_at_offset, t.ends_at_offset, t.confidence, t.tagged_by_user as user, t.tagged_by_model as model, t.type, ' +
                'CASE WHEN u.id=t.tagged_by_user THEN u.email ' +
                'WHEN m.id=t.tagged_by_model THEN m.shortname ' +
                'END as annotator ' +
              'FROM GuardianAudioTags t ' +
              'LEFT JOIN GuardianAudio a ON a.guid=:audioGuid ' +
              'LEFT JOIN Users u ON u.id=t.tagged_by_user ' +
              'LEFT JOIN AudioAnalysisModels m ON m.id=t.tagged_by_model ' +
              'WHERE a.id=t.audio_id and t.type in ("label", "classification") ' +
              'group by t.tagged_by_user, t.tagged_by_model, t.begins_at_offset order by t.begins_at_offset ASC, annotator ASC';

    models.sequelize.query(sql,
      { replacements: opts, type: models.sequelize.QueryTypes.SELECT})
        .then(function(data) {
          return views.models.groupTagsByCreator(req,res,data)
            .then(function(json) {
              res.status(200).json(json);
            });
        })
        .catch(function (err) {
          res.status(500).json({msg: err});
        });

  });

router.route('/labels')
  .get(passport.authenticate("token", {session: false}), requireUser, function(req, res) {
    var converter = new ApiConverter("labels", req);

    var sql = "SELECT DISTINCT value FROM GuardianAudioTags where type='label'";

    return models.sequelize.query(sql, { type: models.sequelize.QueryTypes.SELECT })
      .then(function(data) {
        var api = converter.mapSequelizeToApi({
          labels: data
        });
        api.links.self = urls.getApiUrl(req) + '/tags/labels';
        res.status(200).json(api);
      })
      .catch(function(err) {
        console.log("failed to return labels | "+err);
        if (!!err) { res.status(500).json({msg:"failed to return labels"}); }
      });

  });

router.route("/:tag_id")
	.get(passport.authenticate("token", {session: false}), requireUser, function (req, res) {
		var converter = new ApiConverter("tag", req);

		models.GuardianAudioTag
			.findOne({
				where: {guid: req.params.tag_id},
				include: [models.User]
			}).then(function (dbTag) {
			var api = converter.mapSequelizeToApi(dbTag);
			api.data.attributes.taggedByUser = dbTag.User.guid;
			delete api.data.attributes.User;
			res.status(200).json(api);

		}).catch(function (err) {
			if (!!err) {
				res.status(404).json({msg: "Tag with id " + req.params.tag_id + " does not exist."});
			}
		});

	});



module.exports = router;
