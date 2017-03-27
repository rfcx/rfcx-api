var verbose_logging = (process.env.NODE_ENV !== "production");
var models = require("../../../models");
var express = require("express");
var router = express.Router();
var views = require("../../../views/v1");
var httpError = require("../../../utils/http-errors.js");
var guid = require("../../../utils/misc/guid.js");
var passport = require("passport");
passport.use(require("../../../middleware/passport-token").TokenStrategy);
var Promise = require("bluebird");
var ApiConverter = require("../../../utils/api-converter");
var aws = require("../../../utils/external/aws.js").aws();
var moment = require('moment');


function queryData(req) {

  var limit = parseInt(req.query.limit) || 1000,
    offset = parseInt(req.query.offset) || 0;

  // by default all clauses are empty. we will fill them if corresponding params are defined in url
  var whereClauses = {
    event: {
      shadow_latitude: {
        $ne: null
      },
      shadow_longitude: {
        $ne: null
      }
    },
    site: {},
    audio: {},
    type: {},
    value: {}
  };

  if (req.query.updated_after) {
    if (!whereClauses.event.updated_at) {
      whereClauses.event.updated_at = {};
    }
    whereClauses.event.updated_at.$gt = req.query.updated_after;
  }

  if (req.query.updated_before) {
    if (!whereClauses.event.updated_at) {
      whereClauses.event.updated_at = {};
    }
    whereClauses.event.updated_at.$lt = req.query.updated_before;
  }

  if (req.query.created_after) {
    if (!whereClauses.event.created_at) {
      whereClauses.event.created_at = {};
    }
    whereClauses.event.created_at.$gt = req.query.created_after;
  }

  if (req.query.created_before) {
    if (!whereClauses.event.created_at) {
      whereClauses.event.created_at = {};
    }
    whereClauses.event.created_at.$lte = req.query.created_before;
  }

  if (req.query.starting_after) {
    whereClauses.event.begins_at = {
      $gt: req.query.starting_after
    };
  }

  if (req.query.ending_before) {
    whereClauses.event.ends_at = {
      $lte: req.query.ending_before
    };
  }

  if (req.query.minimum_confidence) {
    whereClauses.event.confidence = {
      $gte: req.query.minimum_confidence
    };
  }

  if (req.query.values) {
    whereClauses.value.value = {
      $in: Array.isArray(req.query.values)? req.query.values : [req.query.values]
    };
  }

  if (req.query.sites && Array.isArray(req.query.sites)) {
    whereClauses.site.guid = {
      $in: req.query.sites
    };
  }

  if (req.query.types && Array.isArray(req.query.types)) {
    whereClauses.type.value = {
      $in: req.query.types
    };
  }

  return models.GuardianAudioEvent
    .findAndCountAll({
      where: whereClauses.event,
      limit: limit,
      offset: offset,
      include: [
        {
          model: models.GuardianAudio,
          as: 'Audio',
          where: whereClauses.audio,
          attributes: [
            'guid',
            'measured_at'
          ],
          include: [
            {
              model: models.GuardianSite,
              as: 'Site',
              where: whereClauses.site,
              attributes: [
                'guid'
              ]
            },
            {
              model: models.Guardian,
              as: 'Guardian',
              attributes: [
                'guid',
                'shortname'
              ]
            }
          ]
        },
        {
          model: models.Guardian,
          as: 'Guardian',
          attributes: [
            'guid',
            'shortname',
            'latitude',
            'longitude'
          ]
        },
        {
          model: models.GuardianAudioEventValue,
          as: 'Value',
          where: whereClauses.value
        },
        {
          model: models.GuardianAudioEventType,
          as: 'Type',
          where: whereClauses.type
        }
      ]
    })
}

function processStatsByDates(req, res) {
  var contentType = req.rfcx.content_type;
  var isFile = false;
  if (req.originalUrl.indexOf('.json') !== -1 || req.originalUrl.indexOf('.csv') !== -1) {
    isFile = true;
  }

  queryData(req)
    .then(function (dbEvents) {
      if (contentType === 'json') {
        return views.models.guardianAudioEventsByDatesJson(req, res, dbEvents.rows)
          .then(function (json) {
            // if client requested json file, then respond with file
            // if not, respond with simple json
            res.contentType(isFile ? 'text/json' : 'application/json');
            if (isFile) {
              res.attachment('event.json');
            }
            res.status(200).send(json);
          });
      }
      else if (contentType === 'csv') {
        return views.models.guardianAudioEventsByDatesCSV(req, res, dbEvents.rows)
          .then(function (csv) {
            res.contentType('text/csv');
            res.attachment('event.csv');
            res.status(200).send(csv);
          });
      }
    })
    .catch(function (err) {
      console.log('Error while searching Audio Events', arguments);
      res.status(500).json({msg: err});
    });
}

router.route("/event")
  .get(passport.authenticate("token", {session: false}), function (req, res) {

    var contentType = req.rfcx.content_type;
    var isFile = false;
    if (req.originalUrl.indexOf('.json') !== -1 || req.originalUrl.indexOf('.csv') !== -1) {
      isFile = true;
    }

    queryData(req)
      .then(function (dbEvents) {
        if (contentType === 'json') {
          return views.models.guardianAudioEventsJson(req, res, dbEvents.rows)
            .then(function (json) {
              // if client requested json file, then respond with file
              // if not, respond with simple json
              res.contentType(isFile ? 'text/json' : 'application/json');
              if (isFile) {
                res.attachment('event.json');
              }
              res.status(200).send(json);
            });
        }
        else if (contentType === 'csv') {
          return views.models.guardianAudioEventsCSV(req, res, dbEvents.rows)
            .then(function (csv) {
              res.contentType('text/csv');
              res.attachment('event.csv');
              res.status(200).send(csv);
            });
        }
      })
      .catch(function (err) {
        console.log('Error while searching Audio Events', arguments);
        res.status(500).json({msg: err});
      });

  });

router.route("/stats/guardian")
  .get(passport.authenticate("token", {session: false}), function (req, res) {

    var contentType = req.rfcx.content_type;
    var isFile = false;
    if (req.originalUrl.indexOf('.json') !== -1 || req.originalUrl.indexOf('.csv') !== -1) {
      isFile = true;
    }

    queryData(req)
      .then(function (dbEvents) {
        if (contentType === 'json') {
          return views.models.guardianAudioEventsByGuardianJson(req, res, dbEvents.rows)
            .then(function (json) {
              // if client requested json file, then respond with file
              // if not, respond with simple json
              res.contentType(isFile ? 'text/json' : 'application/json');
              if (isFile) {
                res.attachment('event.json');
              }
              res.status(200).send(json);
            });
        }
        else if (contentType === 'csv') {
          return views.models.guardianAudioEventsByGuardianCSV(req, res, dbEvents.rows)
            .then(function (csv) {
              res.contentType('text/csv');
              res.attachment('event.csv');
              res.status(200).send(csv);
            });
        }
      })
      .catch(function (err) {
        console.log('Error while searching Audio Events', arguments);
        res.status(500).json({msg: err});
      });

  });

router.route("/stats/dates")
  .get(passport.authenticate("token", {session: false}), processStatsByDates);

router.route("/stats/weekly")
  .get(passport.authenticate("token", {session: false}), function(req, res) {

    if (!req.query) {
      req.query = {};
    }

    var dateStr = moment().subtract(7, 'days').format('YYYY-MM-DD HH:mm:ss');
    req.query.starting_after = dateStr;

    processStatsByDates(req, res);

  });

router.route("/stats/monthly")
  .get(passport.authenticate("token", {session: false}), function(req, res) {

    if (!req.query) {
      req.query = {};
    }

    var dateStr = moment().subtract(1, 'month').format('YYYY-MM-DD HH:mm:ss');
    req.query.starting_after = dateStr;

    processStatsByDates(req, res);

  });

router.route("/stats/half-year")
  .get(passport.authenticate("token", {session: false}), function(req, res) {

    if (!req.query) {
      req.query = {};
    }

    var dateStr = moment().subtract(6, 'month').format('YYYY-MM-DD HH:mm:ss');
    req.query.starting_after = dateStr;

    processStatsByDates(req, res);

  });

router.route("/stats/year")
  .get(passport.authenticate("token", {session: false}), function(req, res) {

    if (!req.query) {
      req.query = {};
    }

    var dateStr = moment().subtract(1, 'year').format('YYYY-MM-DD HH:mm:ss');
    req.query.starting_after = dateStr;

    processStatsByDates(req, res);

  });

router.route("/tuning")
  .get(passport.authenticate("token", {session: false}), function (req, res) {

    var converter = new ApiConverter("event", req);

    var opts = {
      type: req.query.type,
      modelGuid: req.query.modelGuid,
      minWindows: parseInt(req.query.minWindows),
      minProbability: parseFloat(req.query.minProbability),
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo
    };

    var sql = "SELECT g.shortname, a.guid as audio_guid, a.measured_at, count(t.audio_id) as count, avg(t.confidence) as prob, s.timezone_offset, s.timezone FROM GuardianAudioTags t " +
      "INNER JOIN AudioAnalysisModels m on m.guid=:modelGuid " +
      "INNER JOIN GuardianAudio a on audio_id=a.id " +
      "INNER JOIN GuardianSites s on site_id=s.id " +
      "INNER JOIN Guardians g on g.id=a.guardian_id " +
      "WHERE tagged_by_model=m.id and tagged_by_model is not null and confidence>=:minProbability and value=:type and a.measured_at>=:dateFrom and a.measured_at<:dateTo " +
      "GROUP BY t.audio_id " +
      "HAVING COUNT(t.audio_id)>=:minWindows " +
      "ORDER BY a.measured_at DESC;";

    models.sequelize.query(sql,
      {replacements: opts, type: models.sequelize.QueryTypes.SELECT})
      .then(function (data) {
        var apiEvent = converter.cloneSequelizeToApi(data);
        res.status(200).json(apiEvent);
      })
      .catch(function (err) {
        res.status(500).json({msg: err});
      });

  });

router.route("/:event_id")
  .get(passport.authenticate("token", {session: false}), function (req, res) {

    return models.GuardianEvent
      .findAll({
        where: {guid: req.params.event_id},
        include: [{all: true}],
        limit: 1
      }).then(function (dbEvent) {

        if (dbEvent.length < 1) {
          httpError(res, 404, "database");
        } else {
          views.models.guardianEvents(req, res, dbEvent)
            .then(function (json) {
              res.status(200).json(json);
            });
        }

      }).catch(function (err) {
        console.log(err);
        if (!!err) {
          httpError(res, 500, "database");
        }
      });

  })
;

router.route('/')
  .post(passport.authenticate("token", {session: false}), function (req, res) {

    var converter = new ApiConverter("event", req);

    var body = req.body;

    var attrs = {
      confidence: body.confidence,
      windows: body.windows,
      audio_id: body.audio_id,
      type: body.type,
      value: body.value,
      begins_at: body.begins_at,
      ends_at: body.ends_at,
      model: body.model
    };

    // default windows to 0 if none are provided
    // Todo: delete windows altogether
    if (! attrs.windows) {
      attrs.windows = 0;
    }

    function checkAttrValidity() {
      var missingAttrs = '';

      for (var key in attrs) {
        if (attrs.hasOwnProperty(key)) {
          if(key == 'begins_at' || key == 'ends_at'){
            continue;
          }
          if (attrs[key] === undefined || attrs[key] === null) {
            missingAttrs += (' ' + key);
          }
        }
      }

      return {
        status: !missingAttrs.length,
        missingAttrsStr: missingAttrs.length ? 'Missing required attributes:' + missingAttrs : null
      };
    }

    var attrsValidity = checkAttrValidity();
    if (!attrsValidity.status) {
      return httpError(res, 400, null, attrsValidity.missingAttrsStr);
    }
    if (body.guid && !guid.isValid(body.guid)) {
      return httpError(res, 400, null, 'Guardian Audio Event guid has incorrect format');
    }

    var promises = [];

    promises.push(models.GuardianAudio.findOne({
      where: {guid: attrs.audio_id},
      include: {model: models.Guardian, as: 'Guardian'}
    }));
    promises.push(models.AudioAnalysisModel.findOne({where: {$or: {shortname: attrs.model, guid: attrs.model}}}));
    promises.push(models.GuardianAudioEventType.findOrCreate({
      where: {$or: {value: attrs.type, id: attrs.type}},
      defaults: {value: attrs.type}
    }));
    promises.push(models.GuardianAudioEventValue.findOrCreate({
      where: {$or: {value: attrs.value, id: attrs.value}},
      defaults: {value: attrs.value}
    }));

    Promise.all(promises)
      .then(function (data) {

        if (!data[0]) {
          httpError(res, 404, null, 'Audio with given guid not found');
          return Promise.reject();
        }
        if (!data[0].Guardian) {
          httpError(res, 500, null, 'Audio is not associated with any Guardians');
          return Promise.reject();
        }
        if (!data[1]) {
          httpError(res, 404, null, 'Model with given shortname/guid not found');
          return Promise.reject();
        }

        if (attrs['begins_at'] === undefined || attrs['begins_at'] === null) {
            attrs.begins_at = data[0].measured_at;
        }
        if (attrs['ends_at'] === undefined || attrs['ends_at'] === null) {
            attrs.ends_at = new Date(data[0].measured_at.getTime() + 1000*90);
        }

        // replace names with ids
        attrs.audio_id = data[0].id;
        this.audio_guid = data[0].guid;
        attrs.model = data[1].id;
        this.model = data[1].shortname;
        attrs.type = data[2][0].id;
        this.type = data[2][0].value;
        attrs.value = data[3][0].id;
        this.value = data[3][0].value;

        attrs.guardian = data[0].Guardian.id;
        this.guardian = data[0].Guardian.shortname;
        this.guardian_id = data[0].Guardian.id;
        attrs.shadow_latitude = data[0].Guardian.latitude;
        attrs.shadow_longitude = data[0].Guardian.longitude;

        return models.GuardianAudioEvent
          .findOrCreate({
            where: {
              guid: body.guid
            },
            defaults: attrs
          })
      })
      .spread(function (dbGuardianAudioEvent, created) {
        if (created) {
          return Promise.resolve(dbGuardianAudioEvent);
        }
        else {
          return models.GuardianAudioEvent
            .update(attrs, {where: {guid: dbGuardianAudioEvent.guid}})
            .spread(function () {
              return models.GuardianAudioEvent.findOne({where: {guid: dbGuardianAudioEvent.guid}});
            });
        }
      })
      .then(function (data) {
        var apiEvent = converter.mapSequelizeToApi(data);
        res.status(200).json(apiEvent);
      })
      .then(function () {
        var msg = {
          type: this.type,
          detected: this.value,
          guardian: this.guardian,
          model: this.model,
          audio_guid: this.audio_guid,
          // Todo: generate a proper url string, need some sleep but will replace it tomorrow
          listen: 'https://console.rfcx.org/#/classification/altomayo?guid=' + this.audio_guid +  '&typevalue=chainsaw&access=read'
        };

        // currently we only send out alerts.
        // Todo: this needs to be replaced by a general alert handler that allows for more configuration.
        var excludedGuardians = [];
        if( ! excludedGuardians.includes(guardian_id) ){
          return aws.publish("rfcx-detection-alerts", msg);
        }
        })
        .catch(function (err) {
          if (!!err) {
            console.log(err);
            if (err.name && err.name === 'SequelizeValidationError') {
              httpError(res, 400, null, 'Input data has incorrect format');
            }
            else {
              httpError(res, 500, "database");
            }
          }
        });

  });

router.route("/:event_id/review")
  .post(passport.authenticate("token", {session: false}), function (req, res) {

    models.GuardianEvent
      .findAll({
        where: {guid: req.params.event_id},
        include: [{all: true}],
        limit: 1
      }).then(function (dbEvent) {

      if (dbEvent.length < 1) {
        httpError(res, 404, "database");
      } else {

        var reviewerInput = {
          classification: (req.body.classification != null) ? req.body.classification.toLowerCase() : null,
          begins_at: (req.body.begins_at != null) ? new Date(req.body.begins_at) : null,
          duration: (req.body.duration != null) ? parseInt(req.body.duration) : null,
          invalidated: (req.body.invalidated != null) ? req.body.invalidated : null
        };

        if (reviewerInput.classification != null) {
          dbEvent[0].classification_reviewer = reviewerInput.classification;
        }
        if (reviewerInput.begins_at != null) {
          dbEvent[0].begins_at_reviewer = reviewerInput.begins_at;
        }
        if (reviewerInput.duration != null) {
          dbEvent[0].duration_reviewer = reviewerInput.duration;
        }
        if (reviewerInput.invalidated != null) {
          if (reviewerInput.invalidated == "true") {
            dbEvent[0].invalidated_reviewer = true;
          } else if (reviewerInput.invalidated == "false") {
            dbEvent[0].invalidated_reviewer = false;
          }
        }


        dbEvent[0].reviewed_at = new Date();
        dbEvent[0].reviewer_id = req.rfcx.auth_token_info.owner_id;

        dbEvent[0].save();

        views.models.guardianEvents(req, res, dbEvent)
          .then(function (json) {
            res.status(200).json(json);
          });

      }

    }).catch(function (err) {
      console.log(err);
      if (!!err) {
        httpError(res, 500, "database");
      }
    });

  })
;

module.exports = router;
