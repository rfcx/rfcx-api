
function returnConnection(Sequelize, Env) {
  return new Sequelize(
    Env.RDS_DB_NAME,
    Env.RDS_USERNAME,
    Env.RDS_PASSWORD,
    {
      host: Env.RDS_HOSTNAME,
      port: Env.RDS_PORT,
      maxConcurrentQueries: 100,
      dialect: "mysql",
      define: {
        underscored: true,
        charset: "utf8",
        collate: "utf8_general_ci",
        timestamps: true
      },
      pool: {
        maxConnections: 5,
        maxIdleTime: 30
      },
      logging: false
    }
  );
};

exports.createConnection = function(Sequelize, Env) {
  var db = returnConnection(Sequelize, Env);

  db.authenticate()
    .complete(function(err) {
      if (!!err) {
        console.log('Failed to connect to database: ', err);
      } else {
        console.log("Successfully connected to database: "+Env.RDS_HOSTNAME);
      }
    });

  return db;
};
