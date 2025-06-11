const { Model, DataTypes } = require('sequelize');

class UserProgress extends Model {
    static init(sequelize) {
        return super.init({
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            code: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            score: {
                type: DataTypes.INTEGER,
                defaultValue: 0
            },
            timeTaken: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0
            },
            timeDetails: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            completed: {
                type: DataTypes.BOOLEAN,
                defaultValue: false
            },
            completedAt: {
                type: DataTypes.DATE,
                allowNull: true
            }
        }, {
            sequelize,
            modelName: 'userprogress',
            tableName: 'userprogresses',
            timestamps: true
        });
    }

    static associate(models) {
        this.belongsTo(models.User, {
            foreignKey: 'UserId',
            as: 'user'
        });

        this.belongsTo(models.Exercise, {
            foreignKey: 'ExerciseId',
            as: 'exercise'
        });
    }

}

module.exports = UserProgress;