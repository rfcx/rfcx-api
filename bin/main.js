console.log('----------------------------------\nRFCX | main started')

const startTime = new Date()

// Ensure unhandled promises are handled by the process
require('../utils/process')

// check that all required env vars are set
require('../config/inspector')

const app = require('../app')

console.log('Execution time (app load): %dms', new Date() - startTime)

console.log('RFCX | Starting server')
app.listen(app.get('port'), function () {
  console.log(
    app.get('title') + ' (port ' + app.get('port') + ') (' + process.env.NODE_ENV + ')'
  )
})
