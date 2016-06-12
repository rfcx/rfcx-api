var verbose_logging = (process.env.NODE_ENV !== "production");
var models  = require("../../../models");
var express = require("express");
var router = express.Router();
var views = require("../../../views/v1");
var httpError = require("../../../utils/http-errors.js");
var passport = require("passport");
passport.use(require("../../../middleware/passport-token").TokenStrategy);


router.route("/")
  .post(passport.authenticate("token",{session:false}), function(req,res) {
      console.log("I received a Report request: " + JSON.stringify(req.body));

      var data = req.body.data.attribues; 
      var id = req.body.data.id; 


      models.Report
          .create({
              guid: id
              start_time: data.startTime, 
              end_time: data.endTime,
              long: data.long,
              lat: data.lat,
              type: data.type,
              reporter: req.rfcx.auth_token_info.owner_id
          }).then(function(dbReport){
            res.status(200).json(
              {data: {
                type: "report",
                id: id,
                attribues: dbReport,
                links: {
                  self: "http://localhost:8080/reports/" + id
                }
              }}
            )
          });

});



module.exports = router;
