const express = require('express')
const router = express.Router()
const { httpErrorResponse } = require('../../../utils/http-error-handler')
const { ValidationError } = require('../../../common/error-handling/errors')
const Converter = require('../../../utils/converter')

router.route('/:user_id/device/register')
  .post((req, res) => {
    const transformedParams = {}
    const params = new Converter(req.body, transformedParams)

    params.convert('token').toString()
    params.convert('os').optional().toString()

    params.validate()
      .then(() => {
        // return usersService.getUserByGuidOrEmail(req.params.user_id);
      })
      .then((user) => {

      })
      .catch(ValidationError, e => httpErrorResponse(req, res, 400, null, e.message))
      .catch((err) => {
        res.status(500).json({ err })
      })
  })

module.exports = router