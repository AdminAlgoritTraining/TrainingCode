const { Model, DataTypes } = require('sequelize');

class Category extends Model {
    static init(sequelize) {
        return super.init({
            name: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true
            },
            slug: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true
            },
            description: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            order: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0
            }
        }, {
            sequelize,
            modelName: 'category',
            tableName: 'categories',
            timestamps: true
        });
    }

    static associate(models) {
        this.hasMany(models.Exercise, {
            foreignKey: 'CategoryId',
            as: 'exercises'
        });
    }
}

module.exports = Category;