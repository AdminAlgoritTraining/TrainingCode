const { Model } = require('sequelize');

class Group extends Model {
    static init(sequelize, DataTypes) {
        return super.init({
            name: {
                type: DataTypes.STRING,
                allowNull: false
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
            active: {
                type: DataTypes.BOOLEAN,
                defaultValue: true
            }
        }, {
            sequelize,
            modelName: 'Group',
            tableName: 'groups'
        });
    }

    static associate(models) {
        // Relación con el profesor
        this.belongsTo(models.User, {
            foreignKey: 'teacherId',
            as: 'teacher'
        });

        // Relación muchos a muchos con estudiantes
        this.belongsToMany(models.User, {
            through: 'GroupStudents',
            foreignKey: 'groupId',
            otherKey: 'studentId',
            as: 'students'
        });
    }
}

module.exports = Group;