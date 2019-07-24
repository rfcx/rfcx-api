const neo4j = require('neo4j-driver').v1;
const env   = process.env.NODE_ENV || 'development';

let config = {
  disableLosslessIntegers: true,
};

if (env === 'development') {
  config.logging = neo4j.logging.console('debug');
}

const driver = neo4j.driver(
  process.env.NEO4J_URL,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD),
  config
);

module.exports = driver;
