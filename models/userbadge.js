const { Model, DataTypes } = require('sequelize');

class UserBadge extends Model {
    static init(sequelize) {
        return super.init({
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            UserId: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id'
                }
            },
            BadgeId: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: 'badges',
                    key: 'id'
                }
            },
            earnedAt: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW
            }
        }, {
            sequelize,
            modelName: 'userbadge',
            tableName: 'userbadges',
            timestamps: true
        });
    }

    static associate(models) {
        // This is a junction table, so it typically doesn't need direct associations
    }
}

module.exports = UserBadge;