var models  = require('../../models');
var express = require('express');
var router = express.Router();
var middleware_v1 = require("../../middleware/v1.js").middleware;
for (m in middleware_v1) { router.use(middleware_v1[m]); }


router.route("/register")
  .post(function(req, res) {
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
        // } else {
        //   res.status(500).json({message: "failure"});
        // }
    
      // .create({
      //   name: reqMappingUser.name
      // }).complete(function(err,dbMappingUser){
      // if (!!err) {
      //   console.log(err);
      //   
      // } else {
      //   res.status(200).json({message: "success"});
      // }
    });
    // models.MappingUser
    //   .findOrCreate({ name: reqMappingUser.name }).complete(function(err,dbMappingUser){
    //     if (!!err) {
    //       console.log("yes!");
    //       res.send({message:"good"}, 200);
    //     } else {
    //       console.log(e);
    //       res.send({message:"error"}, 500);
    //     }
    //   });
  })
;

router.route("/checkin")
  .post(function(req, res) {
    res.json({name:"one user: "+req.params.user_id});
  })
;

module.exports = router;
