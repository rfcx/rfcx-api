var models  = require("../../../models");
var express = require("express");
var router = express.Router();
var hash = require("../../../utils/misc/hash.js").hash;
var token = require("../../../utils/internal-rfcx/token.js").token;
var views = require("../../../views/v1");
var httpError = require("../../../utils/http-errors.js");
var passport = require("passport");
var moment = require('moment');
var requireUser = require("../../../middleware/authorization/authorization").requireTokenType("user");
passport.use(require("../../../middleware/passport-token").TokenStrategy);
const executeService = require('../../../services/execute-service');
const mailService = require('../../../services/mail/mail-service');
var sensationsService = require("../../../services/sensations/sensations-service");
var ValidationError = require("../../../utils/converter/validation-error");
var usersService = require('../../../services/users/users-service');
var sequelize = require("sequelize");

function removeExpiredResetPasswordTokens() {
  models.ResetPasswordToken
    .destroy({
      where: {expires_at: {$lt: new Date()}}
    })
    .then(function (count) {
      if (!!count) {
        console.log('Deleted ' + count + ' expired "reset password" token(s)');
      }
      return null;
    })
    .catch(function (err) {
      console.log(err);
    });
}

router.route("/login")
  .post(function(req,res) {
    var userInput = {
      email: (req.body.email != null) ? req.body.email.toLowerCase() : null,
      pswd: req.body.password
    };

    var loginExpirationInMinutes = 1440; // 1 day (24 hours)
    if ((req.body.extended_expiration != null) && (parseInt(req.body.extended_expiration) == 1)) {
      loginExpirationInMinutes = 5760; // 4 days
    }

    models.User
      .findOne({
        where: { email: userInput.email }
      }).then(function(dbUser){

        if (dbUser == null) {
          res.status(401).json({
            message: "invalid email or password", error: { status: 401 }
          });
        } else if (dbUser.auth_password_hash == hash.hashedCredentials(dbUser.auth_password_salt,userInput.pswd)) {

          dbUser.last_login_at = new Date();
          dbUser.save();

          return token.createUserToken({
            token_type: "login",
            created_by: req.rfcx.url_path,
            reference_tag: dbUser.guid,
            owner_primary_key: dbUser.id,
            minutes_until_expiration: loginExpirationInMinutes
          }).then(function(tokenInfo){

            dbUser.VisibleToken = {
              token: tokenInfo.token,
              token_expires_at: tokenInfo.token_expires_at
            };

            return res.status(200).json(views.models.users(req,res,dbUser));

          }).catch(function(err){
            console.log(err);
            res.status(500).json({
              message: err.message, error: { status: 500 }
            });
          });

        } else {
          return res.status(401).json({
            message: "invalid email or password", error: { status: 401 }
          });
        }

      }).catch(function(err){
        console.log(err);
        res.status(500).json({
          message: err.message, error: { status: 500 }
        });
      });

  });


router.route("/request-access/app")
  .post(function(req,res){
    const serviceRequest = {
      email_address: req.body.email_address,
      os: req.body.os
    };
    executeService(req, res, serviceRequest, mailService.registerToAppWaitingList, "Failed to subscribe");
  });

router.route("/register")
  .post(passport.authenticate("token",{session:false}), function(req,res) {

    var userInput = {
      type: ((req.body.type == null) ? "unspecified" : req.body.type.toLowerCase()),
      firstname: req.body.firstname || '',
      lastname: req.body.lastname || '',
      email: req.body.email.toLowerCase(),
      pswd: req.body.password
    };
    var loginExpirationInMinutes = 1440;

    models.User
      .findOrCreate({
        where: { email: userInput.email }
      }).spread(function(dbUser, wasCreated){

        if (!wasCreated) {
          res.status(409).json({
            message: "A user with that username or email already exists", error: { status: 409 }
          });
        } else {

          dbUser.type = userInput.type;
          dbUser.firstname = userInput.firstname;
          dbUser.lastname = userInput.lastname;

          var password_salt = hash.randomHash(320);
          dbUser.auth_password_salt = password_salt;
          dbUser.auth_password_hash = hash.hashedCredentials(password_salt,userInput.pswd);
          dbUser.auth_password_updated_at = new Date();
          dbUser.save();

          token.createUserToken({
            token_type: "registration",
            created_by: req.rfcx.url_path,
            reference_tag: dbUser.guid,
            owner_primary_key: dbUser.id,
            minutes_until_expiration: loginExpirationInMinutes
          }).then(function(tokenInfo){

            dbUser.VisibleToken = {
              token: tokenInfo.token,
              token_expires_at: tokenInfo.token_expires_at
            };

            res.status(200).json(views.models.users(req,res,dbUser));

          }).catch(function(err){
            console.log(err);
            res.status(500).json({
              message: err.message, error: { status: 500 }
            });
          });

        }
      }).catch(function(err){
        console.log(err);
        res.status(500).json({
          message: err.message, error: { status: 500 }
        });
      });

  });

router.route("/send-reset-password-link")
  .post(function(req,res) {

    // first of all, check if user with requested e-mail exists
    models.User
      .findOne({
        where: { email: req.body.email }
      })
      .bind({})
      .then(function(dbUser){
        // if doesn't exists, simply do nothing
        // don't tell a client that e-mail doesn't exist in terms of security
        // this will prevent us from brute-force users by e-mails
        if (!dbUser) {
          res.status(200).json({});
          return Promise.reject();
        }
        else {
          this.dbUser = dbUser;
          // create reset password token for founded user which will expire in 1 day
          return models.ResetPasswordToken
            .create({
              user_id: dbUser.id,
              expires_at: moment().add(1, 'day')
            });
        }
      })
      .then(function(dbToken) {
        this.dbToken = dbToken;
        // send an email to user with link to change password
        var url = process.env.CONSOLE_BASE_URL + 'reset-password?token=' + dbToken.guid;
        var text = 'To reset your RFCx account password click the following link: ' + url +
                   ' If you didn\'t request a password change, you can ignore this message.'
        return mailService.sendTextMail({
          email_address: req.body.email,
          recipient_name: this.dbUser.firstname || 'RFCx User',
          subject: 'Password reset',
          message: text
        });
      })
      .then(function(mailServiceRes) {
        // return success to client with the time of token expiration
        res.status(200).json({
          expires_at: this.dbToken.expires_at
        });
      })
      .catch(function(err) {
        if (!!err) {
          console.log(err);
          httpError(res, 500, "database");
        }
      });

  });

router.route("/reset-password")
  .post(function(req,res) {

    // find reset password token by specified guid
    models.ResetPasswordToken
      .findOne({
        where: { guid: req.body.token }
      })
      .bind({})
      .then(function(dbToken) {
        if (!dbToken) {
          // if user specified not existing token, then show a message and cancel password reset
          httpError(res, 404, null, 'Such token doesn\'t exist. It might be expired or invalid.');
          return Promise.reject();
        }
        this.dbToken = dbToken;
        // if token is expired, then show this message to user and cancel password reset. Destroy this token.
        if (new Date(dbToken.expires_at) < new Date()) {
          this.dbToken.destroy();
          httpError(res, 400, null, 'Your token has expired. Please start reset password process once again.');
          return Promise.reject();
        }
        else {
          // if everything is ok, then find user by specified in token id
          return models.User
            .findOne({
              where: { id: dbToken.user_id }
            });
        }
      })
      .then(function(dbUser) {
        // if user was not found, then token has invalid user data. Destroy this token.
        if (!dbUser) {
          this.dbToken.destroy();
          httpError(res, 400, null, 'Invalid token. Please start reset password process once again.');
          return Promise.reject();
        }
        // encrypt user's new password and save it
        var passwordSalt = hash.randomHash(320);
        dbUser.auth_password_salt = passwordSalt;
        dbUser.auth_password_hash = hash.hashedCredentials(passwordSalt, req.body.password);
        dbUser.auth_password_updated_at = new Date();
        return dbUser.save();
      })
      .then(function(dbUser) {
        // token doesn't need anymore, destroy it
        this.dbToken.destroy();
        // and check for other tokens being expired
        removeExpiredResetPasswordTokens();
        return mailService.sendTextMail({
          email_address: dbUser.email,
          recipient_name: dbUser.firstname || 'RFCx User',
          subject: 'Password changed',
          message: 'Your password has been changed. If you didn\'t make any changes, please contact us: contact@rfcx.org'
        });
      })
      .then(function() {
        res.status(200).json({});
      })
      .catch(function(err) {
        if (!!err) {
          console.log(err);
          httpError(res, 500, "database");
        }
      });
  });

router.route("/change-password")
  .post(passport.authenticate("token", {session: false}), requireUser, function(req,res) {

    if (!req.body.guid) {
      return httpError(res, 400, null, 'You need to specify user guid in request payload.');
    }
    if (!req.body.password) {
      return httpError(res, 400, null, 'You need to specify current password in request payload.');
    }
    if (!req.body.newPassword) {
      return httpError(res, 400, null, 'You need to specify new password in request payload.');
    }
    // user must be logged in with his account to change the password
    if (req.body.guid !== req.rfcx.auth_token_info.guid) {
      return httpError(res, 403, null, 'You are not allowed to change stranger\'s password.');
    }
    models.User
      .findOne({
        where: { guid: req.body.guid }
      })
      .then(function(dbUser) {
        if (!dbUser) {
          httpError(res, 404, null, 'User with specified guid not found.');
          return Promise.reject();
        }
        if (dbUser.auth_password_hash !== hash.hashedCredentials(dbUser.auth_password_salt, req.body.password)) {
          httpError(res, 403, null, 'Password is incorrect.');
          return Promise.reject();
        }
        var passwordSalt = hash.randomHash(320);
        dbUser.auth_password_salt = passwordSalt;
        dbUser.auth_password_hash = hash.hashedCredentials(passwordSalt, req.body.newPassword);
        dbUser.auth_password_updated_at = new Date();
        return dbUser.save();
      })
      .then(function(dbUser) {
        return mailService.sendTextMail({
          email_address: dbUser.email,
          recipient_name: dbUser.firstname || 'RFCx User',
          subject: 'Password changed',
          message: 'Your password has been changed. If you didn\'t make any changes, please contact us: contact@rfcx.org'
        });
      })
      .then(function() {
        res.status(200).json({});
        return true;
      })
      .catch(function(err) {
        if (!!err) {
          console.log(err);
          httpError(res, 500, "database");
        }
      });
  });

router.route("/checkin")
  .post(passport.authenticate("token", {session: false}), requireUser, function(req,res) {

    // map HTTP params to service params
    var serviceParams = {
      source_type: 2,
      data_type: '0',
      data_id: '0',
      latitude: req.body.latitude,
      longitude: req.body.longitude,
      starting_after: req.body.time,
      ending_before: req.body.time
    };

    usersService.getUserByGuid(req.rfcx.auth_token_info.guid)
      .then((user) => {
        serviceParams.source_id = user.id;
        return true;
      })
      .then(() => {
        return sensationsService.createSensations(serviceParams);
      })
      .then(result => res.status(200).json(result))
      .catch(sequelize.EmptyResultError, e => httpError(res, 404, null, e.message))
      // if the user supplied wrong arguments we want to give an error message and have a 400 error code
      .catch(ValidationError, e => httpError(res, 400, null, e.message))
      // catch-all for any other that is not based on user input
      .catch(e => httpError(res, 500, e, "Checkin couldn't be created."));

  });

// TO DO security measure to ensure that not any user can see any other user
router.route("/:user_id")
  .get(passport.authenticate("token",{session:false}), function(req,res) {

    models.User
      .findAll({
        where: { guid: req.params.user_id },
        limit: 1
      }).then(function(dbUser){

        if (dbUser.length < 1) {
          httpError(res, 404, "database");
        } else {
          res.status(200).json(views.models.users(req,res,dbUser));
        }

        return null;

      }).catch(function(err){
        console.log("failed to return user | "+err);
        if (!!err) { res.status(500).json({msg:"failed to return user"}); }
      });

  })
;

// TO DO security measure to ensure that not any user can see any other user
router.route("/:user_id")
  .post(passport.authenticate("token",{session:false}), function(req,res) {

    if (req.rfcx.auth_token_info.guid === req.params.user_id) {
      models.User
        .findAll({
          where: { guid: req.params.user_id },
          limit: 1
        }).then(function(dbUser){

          if (dbUser.length < 1) {
            httpError(res, 404, "database");
          } else {

            // now let's update the user info....

            res.status(200).json(views.models.users(req,res,dbUser));
          }

        }).catch(function(err){
          console.log("failed to update user | "+err);
          if (!!err) { res.status(500).json({msg:"failed to update user"}); }
        });
    } else {
      res.status(401).json({msg:"not allowed to edit another user's profile"});
    }
  })
;

module.exports = router;
