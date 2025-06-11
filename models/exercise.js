const { Model, DataTypes } = require('sequelize');

class Exercise extends Model {
    static init(sequelize) {
        return super.init({
            title: {
                type: DataTypes.STRING,
                allowNull: false
            },
            description: {
                type: DataTypes.TEXT,
                allowNull: false
            },
            instructions: {
                type: DataTypes.TEXT,
                allowNull: false
            },
            initialCode: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            solution: {
                type: DataTypes.TEXT,
                allowNull: false,
                get() {
                    const rawValue = this.getDataValue('solution');
                    try {
                        return JSON.parse(rawValue);
                    } catch (e) {
                        return [rawValue];
                    }
                },
                set(value) {
                    if (Array.isArray(value)) {
                        this.setDataValue('solution', JSON.stringify(value));
                    } else {
                        this.setDataValue('solution', JSON.stringify([value]));
                    }
                }
            },
            difficulty: {
                type: DataTypes.ENUM('Fácil', 'Medio', 'Difícil'),
                defaultValue: 'Fácil'
            },
            xpReward: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 10
            },
            order: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0
            },
            week: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 1
            },
            CategoryId: {
                type: DataTypes.INTEGER,
                allowNull: true,
                references: {
                    model: 'categories',
                    key: 'id'
                }
            }
        }, {
            sequelize,
            modelName: 'exercise',
            tableName: 'exercises',
            timestamps: true
        });
    }

    static associate(models) {
        this.belongsTo(models.Category, {
            foreignKey: 'CategoryId',
            as: 'category'
        });

        this.hasMany(models.UserProgress, {
            foreignKey: 'ExerciseId',
            as: 'progresses'
        });
    }
}

module.exports = Exercise;