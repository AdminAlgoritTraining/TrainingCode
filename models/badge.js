const { Model, DataTypes } = require('sequelize');

class Badge extends Model {
    static init(sequelize) {
        return super.init({
            name: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true
            },
            code: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true
            },
            description: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            icon: {
                type: DataTypes.STRING,
                allowNull: true
            }
        }, {
            sequelize,
            modelName: 'badge',
            tableName: 'badges',
            timestamps: true
        });
    }

    static associate(models) {
        this.belongsToMany(models.User, {
            through: models.UserBadge,
            foreignKey: 'BadgeId',
            otherKey: 'UserId',
            as: 'users'
        });
    }
}

module.exports = Badge;