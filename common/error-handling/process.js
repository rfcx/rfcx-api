process.on('uncaughtException', (error) => {
  console.error(error)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at ', promise, `reason: ${reason.message}`)
})

module.exports = {}
