const redis = require('redis')
const bluebird = require('bluebird')

bluebird.promisifyAll(redis)

const client = redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT
})

client.on('ready', () => {
  console.info('Redis: ready')
})

client.on('connect', () => {
  console.info(`Redis: connected to ${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`)
})

client.on('reconnecting', () => {
  console.info(`Redis: reconnecting to ${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`)
})

client.on('error', (err) => {
  console.error('Redis: error', { err })
  console.error('Redis: error', { err })
})

module.exports = client
