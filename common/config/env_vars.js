exports.env = {

  NODE_ENV: 'development',

  // PLATFORM: "google", // "amazon" or "google"

  CACHE_DIRECTORY: process.cwd() + '/tmp/',

  FFMPEG_PATH: '/usr/local/bin/ffmpeg',
  SOX_PATH: '/usr/local/bin/sox',
  IMAGEMAGICK_PATH: '/usr/bin/convert',
  PNGCRUSH_PATH: '/usr/bin/pngcrush',

  // if PLATFORM is set to "amazon"
  AWS_ACCESS_KEY_ID: 'AKIAJ2EUNGZ4RMEMMWMA',
  AWS_SECRET_KEY: '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',
  AWS_REGION_ID: 'eu-west-1',
  AWS_ACCOUNT_ID: '887044485231',

  // if PLATFORM is set to "google"
  GOOGLE_APPLICATION_CREDENTIALS: './config/service-account.json',
  PUBSUB_ENABLED: 'true',

  MESSAGE_QUEUE_ENABLED: 'true',
  MESSAGE_QUEUE_PREFIX: '',
  MESSAGE_QUEUE_ENDPOINT: 'http://127.0.0.1:9324',

  BUCKET_ANALYSIS: 'rfcx-analysis',

  ASSET_BUCKET_AUDIO: 'rfcx-guardian-ark-staging',
  ASSET_BUCKET_META: 'rfcx-guardian-meta-staging',
  ASSET_BUCKET_ZIP: 'rfcx-zip',
  ASSET_BUCKET_REPORT: 'rfcx-report-staging',
  ASSET_BUCKET_ATTACHMENT: 'rfcx-attachment-staging',
  ASSET_BUCKET_AI: 'rfcx-ai-staging',
  ASSET_URLBASE: 'https://staging-api.rfcx.org/v1/assets',

  PLAYER_PASSCODES: '0000,1111',

  DB_HOSTNAME: '127.0.0.1',
  DB_NAME: 'rfcx_api',
  DB_USERNAME: 'root',
  DB_PASSWORD: 'test',
  DB_PORT: 3306,

  POSTGRES_PORT: '5432',
  POSTGRES_HOSTNAME: '127.0.0.1',
  POSTGRES_SSL_ENABLED: 'false',
  POSTGRES_DB: 'postgres',
  POSTGRES_USER: 'postgres',
  POSTGRES_PASSWORD: 'test',

  SQS_PERCEPTION_BATCH: 'rfcx-perception-batch',
  SQS_ENDPOINT: 'http://sqs:9324',

  NEW_RELIC_KEY: '',
  MANDRILL_KEY: '',

  MAILCHIMP_KEY: '',
  MAILCHIMP_API_URL: '',
  MAILCHIMP_APP_WAITING_LIST: '',

  SEQUELIZE_VERBOSE: true,

  // it must have /#/ at the end
  CONSOLE_BASE_URL: 'http://localhost:3000/#/',
  DASHBOARD_BASE_URL: 'http://localhost:5555/#/',
  MEDIA_API_BASE_URL: 'https://media-api.rfcx.org/',

  NODE_LOG_LEVEL: 'info', // error, warn, info, debug
  CLOUDWATCH_ENABLED: false, // cloudwatch should be disabled for developers by default
  CLOUDWATCH_LOGS_GROUP_NAME: '',

  AUTH0_DOMAIN: 'auth.rfcx.org',
  AUTH0_EXTENSION_URL: 'rfcx.eu.webtask.io/adf6e2f2b84784b57522e3b19dfc9201/api',
  AUTH0_CLIENT_ID: 'vmdkOtTJgKsB5RI2bgjBz3bgwACA3iJP',
  AUTH0_CLIENT_SECRET: 'rpo0b0jKcYFdL-zstEnC8O6pDnwFkq9sPrbEgetXmUKZ9fRuqU2IDemKZkUGRJf3',
  AUTH0_AUTHZ_AUDIENCE: 'urn:auth0-authz-api',
  AUTH0_CLOUD_AUDIENCE: 'https://rfcx.org',
  AUTH0_DEFAULT_DB_CONNECTION: 'Username-Password-Authentication',

  MQTT_BROKER_PORT: '1883',
  MQTT_BROKER_HOST: 'internal-a2a2a5117a2a011e9a61606be5e8eb7c-1105056411.eu-west-1.elb.amazonaws.com',
  MQTT_BROKER_USER: 'rfcx-guardian',
  MQTT_BROKER_PASSWORD: '1AbgQrSrK91KH2hyn5TSY4SFp',

  KAFKA_HOST: '',

  REDIS_HOST: '127.0.0.1',
  REDIS_PORT: '6379',

  /// Neo4j database is required for endpoints related to legacy AIs, events, tags, sensations.
  /// When `NEO4J_ENABLED` is set to true then URL, user and password are required.
  NEO4J_ENABLED: 'false',
  NEO4J_URL: 'bolt://neo4j.tools.rfcx.org:7688',
  NEO4J_USER: 'neo4j',
  NEO4J_PASSWORD: 'LF8sjbP4Dmz6jfHEaBSagwBG33dGRbFDDe8Kuqn4BM',

  /// Firebase features for sending notifications (not enabled by default)
  /// When `FIREBASE_ENABLED` is set to `true` then the other env vars are required.
  // FIREBASE_ENABLED: "true",
  // FIREBASE_PRIVATE_KEY_RANGER_APP: "",
  // FIREBASE_CLIENT_EMAIL_RANGER_APP: "",
  // FIREBASE_PRIVATE_KEY_PLAYER_APP: "",
  // FIREBASE_CLIENT_EMAIL_PLAYER_APP: "",

  STRIPE_SECRET_KEY: '',
  CLASSY_CLIENT_ID: '',
  CLASSY_CLIENT_SECRET: '',

  RECAPTCHA_V3_SECRET_KEY: '6Lcu2usUAAAAAJppyWhX_X0joyTN1YDmu4cr17w9',

  GUARDIAN_BROKER_HOSTNAME: '', // environment mqtt hostname for checkins/pings
  GUARDIAN_API_SMS_ADDRESS: '', // environment SMS Twilio Phone Number for SMS-based interaction with the Guardians
  GUARDIAN_KEYSTORE_PASSPHRASE: '' // passphrase which is used for guardian registration
}
