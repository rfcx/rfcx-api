var models  = require('../../models');
var express = require('express');
var router = express.Router();

router.route("/register")
  .post(function(req, res) {

    if (!!req.body.user) {
      var reqMappingUser = JSON.parse(req.body.user);
      console.log(req.body.user);
      models.MappingUser
        .findOrCreate({ where: { guid: reqMappingUser.guid, name: reqMappingUser.name } })
        .spread(function(dbMappingUser, wasCreated){
          
          res.status(200).json({
            guid: dbMappingUser.guid,
            name: dbMappingUser.name,
            lastCheckIn: dbMappingUser.last_check_in,
            carrier: dbMappingUser.carrier
          });
      });
    } else {
      res.status(500).json({});
    }
  })
;

router.route("/checkin")
  .post(function(req, res) {
    res.json({name:"one user: "+req.params.user_id});
  })
;

module.exports = router;
