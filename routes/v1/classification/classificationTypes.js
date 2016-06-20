var verbose_logging = (process.env.NODE_ENV !== "production");
var models = require("../../../models");
var express = require("express");
var router = express.Router();
var views = require("../../../views/v1");
var passport = require("passport");
passport.use(require("../../../middleware/passport-token").TokenStrategy);
var ApiConverter = require("../../../utils/api-converter");
var requireUser = require("../../../middleware/authorization/authorization").requireTokenType("user");
var Sequelize = require('sequelize');


router.route("/types")
	.post(passport.authenticate("token", {session: false}), requireUser, function (req, res) {
		var converter = new ApiConverter("classificationType", req);
		var request = converter.mapApiToPojo(req.body);

		var Promise = Sequelize.Promise;
		var queries = [];

		for (var i = 0; i < request.classes.length; i++) {
			var currentClass = request.classes[i];
			var query = models.ClassificationClasses.findOrCreate({where: {class: currentClass}})
				.spread(function (cls, created) {
					return cls;
				});
			queries.push(query);
		}


		Promise.all(queries).then(function (dbClasses) {

			models.ClassificationTypes.create({
				name: request.name,
				classLengthMs: request.classLengthMs
			}).then(function (dbType) {
				// update request id to database id
				request.id = dbType.id;
				dbType.setClassificationClasses(dbClasses).then(function () {
					res.status(201).json(converter.mapPojoToApi(request));
				}).catch(function (err) {
					if (!!err) {
						res.status(500).json({title: "The classification type could not be generated. Maybe your id was not unique?"});
					}
				})
			});
		});
	});

router.route("/types/:types_id")
	.get(passport.authenticate("token", {session: false}), requireUser, function (req, res) {
		var converter = new ApiConverter("classificationType", req);

		models.ClassificationTypes
			.findOne({
				where: {id: req.params.types_id}
			}).then(function (dbTypes) {
			dbTypes.getClassificationClasses().then(function (dbClasses) {
				var api = converter.mapSequelizeToApi(dbTypes);
				api.data.attributes.classes = dbClasses.map(function (cls) {
					return cls.class;
				});
				res.status(200).json(api);
			})


		}).catch(function (err) {
			if (!!err) {
				res.status(404).json({title: "Classsification type with id " + req.params.types_id + " does not exist."});
			}
		});

	});


module.exports = router;
