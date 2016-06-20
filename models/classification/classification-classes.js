'use strict';

// Available Classification Types 
// Each 
module.exports = function (sequelize, DataTypes) {
	var ClassificationValues = sequelize.define('ClassificationClasses', {
			id: {
				type: DataTypes.UUID,
				defaultValue: DataTypes.UUIDV4,
				primaryKey: true
			},
			class: {
				type: DataTypes.STRING,
				unique: true
			}
		}
		,
		{
			classMethods: {
				associate: function (models) {
					ClassificationValues.belongsToMany(models.ClassificationTypes, {through: "ClassificationTypesClasses"});
				}
			}
		}
	);
	return ClassificationValues;
};