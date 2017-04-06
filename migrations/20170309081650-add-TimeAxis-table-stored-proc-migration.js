module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.sequelize.query("CREATE TABLE `TimeAxis` (\n" +
      "  `time` datetime(3) NOT NULL,\n" +
      "  PRIMARY KEY (`time`)\n" +
      ") ENGINE=InnoDB DEFAULT CHARSET=utf8")
      .then(function () {
        return queryInterface.sequelize.query("CREATE PROCEDURE `insert_TimeAxis_month`(IN year INT, IN month INT)\n" +
          "BEGIN\n" +
          "	SET SESSION time_zone = \"+00:00\";\n" +
          "	SET @start=STR_TO_DATE(CONCAT(year, '-', month, '-', '01'), '%Y-%m-%d');\n" +
          "	SET @stop=LAST_DAY(@start)+ interval 1 day;\n" +
          "	SET @startseconds=UNIX_TIMESTAMP(@start);\n" +
          "	INSERT INTO TimeAxis(time) SELECT t from (\n" +
          "	SELECT TIMESTAMPADD(MICROSECOND, micro, FROM_UNIXTIME(e6*1000000+e5*100000+e4*10000+e3*1000+e2*100+e1*10+e0 + @startseconds))  t FROM\n" +
          "	    (select 0 micro union all select 500000) tm,\n" +
          "	    (select 0 e0 union all select 1 union all select 2 union all select 3 union all select 4 union all select 5 union all select 6 union all select 7 union all select 8 union all select 9) t0,\n" +
          "	    (select 0 e1 union all select 1 union all select 2 union all select 3 union all select 4 union all select 5 union all select 6 union all select 7 union all select 8 union all select 9) t1,\n" +
          "	    (select 0 e2 union all select 1 union all select 2 union all select 3 union all select 4 union all select 5 union all select 6 union all select 7 union all select 8 union all select 9) t2,\n" +
          "	    (select 0 e3 union all select 1 union all select 2 union all select 3 union all select 4 union all select 5 union all select 6 union all select 7 union all select 8 union all select 9) t3,\n" +
          "	    (select 0 e4 union all select 1 union all select 2 union all select 3 union all select 4 union all select 5 union all select 6 union all select 7 union all select 8 union all select 9) t4,\n" +
          "	    (select 0 e5 union all select 1 union all select 2 union all select 3 union all select 4 union all select 5 union all select 6 union all select 7 union all select 8 union all select 9) t5,\n" +
          "	    (select 0 e6 union all select 1 union all select 2 union all select 3 union all select 4 union all select 5 union all select 6 union all select 7 union all select 8 union all select 9) t6\n" +
          "	) times\n" +
          "	where t<@stop;\n" +
          "	select ROW_COUNT() as inserted_rows;\n" +
          "END");
    }).then(function () {
        return queryInterface.sequelize.query("CREATE PROCEDURE `insert_TimeAxis_year`(IN year INT)\n" +
          "BEGIN\n" +
          "	DECLARE month INT;\n" +
          "	SET month = 1;\n" +
          "	WHILE month<=12 DO \n" +
          "		call insert_TimeAxis_month(year, month);\n" +
          "		SET month = month + 1;\n" +
          "	END WHILE;\n" +
          "END")
    });

  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.dropTable('TimeAxis').then(function () {
      return queryInterface.sequelize.query("drop procedure if exists `insert_TimeAxis_month`;");
    }).then(function () {
      return queryInterface.sequelize.query("drop procedure if exists  `insert_TimeAxis_year`;");
    });

  }
};
