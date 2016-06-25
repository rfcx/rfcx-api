var verbose_logging = (process.env.NODE_ENV !== "production");
var models = require("../../../models");
var express = require("express");
var router = express.Router();
var views = require("../../../views/v1");
var passport = require("passport");
passport.use(require("../../../middleware/passport-token").TokenStrategy);
var ApiConverter = require("../../../utils/api-converter");
var requireUser = require("../../../middleware/authorization/authorization").requireTokenType("user");


// create new report 
router.route("/")
	.post(passport.authenticate("token", {session: false}), requireUser, function (req, res) {
		var converter = new ApiConverter("report", req);
		var apiReport = converter.mapApiToSequelize(req.body);
		apiReport.reporter = req.rfcx.auth_token_info.owner_id;
		return models.Report
			.create(apiReport).then(function (dbReport) {
				return models.User.findOne({where: {id: dbReport.reporter}})
					.then(function (dbUser) {
						var api = converter.mapSequelizeToApi(dbReport);
						api.data.attributes.reporter = dbUser.guid;
						res.status(201).json(api);

					});


				}).catch(function (err) {
				// creation failed... probable cause: uuid already existed, strange!
				if (!!err) {
					res.status(500).json({title: "The Report could not be generated. Maybe your id was not unique?"});
				}
			});

	});

// retrieve one report 
router.route("/:report_id")
	.get(passport.authenticate("token", {session: false}), requireUser, function (req, res) {
		var converter = new ApiConverter("report", req);

		models.Report
			.findOne({
				where: {guid: req.params.report_id},
				include: [models.User]
			}).then(function (dbReport) {
			if (dbReport.reporter != req.rfcx.auth_token_info.owner_id) {
				res.status(403).json({title: "You are only allowed to access your own reports. This report was created by someone else."});
			} else {
				var api = converter.mapSequelizeToApi(dbReport);
				api.data.attributes.reporter = dbReport.User.guid;
				res.status(200).json(api);
			}
		}).catch(function (err) {
			if (!!err) {
				res.status(404).json({title: "Report with id " + req.params.report_id + " does not exist."});
			}
		});

	});


module.exports = router;
