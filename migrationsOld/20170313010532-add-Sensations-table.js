'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.sequelize.query("CREATE TABLE `Sensations` (\n" +
      "  `time` datetime(3) NOT NULL,\n" +
      "  `location` point NOT NULL,\n" +
      "  `source_type` int(11) NOT NULL DEFAULT '1',\n" +
      "  `source_id` int(11) NOT NULL,\n" +
      "  `data_type` int(11) NOT NULL DEFAULT '1',\n" +
      "  `data_id` int(11) NOT NULL,\n" +
      "  PRIMARY KEY (`time`,`source_type`,`source_id`),\n" +
      "  KEY `location_query` (`location`(25),`time`,`data_type`) USING BTREE\n" +
      ") ENGINE=InnoDB DEFAULT CHARSET=utf8")
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.dropTable('Sensations');
  }
};
