const { Model, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class User extends Model {
    static init(sequelize) {
        return super.init({
            username: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true,
                validate: {
                    len: [3, 30]
                }
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false,
                validate: {
                    len: [3, 30]
                }
            },
            email: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true,
                validate: {
                    isEmail: true
                }
            },
            password: {
                type: DataTypes.STRING,
                allowNull: false,
                validate: {
                    len: [6, 100]
                }
            },
            role: {
                type: DataTypes.ENUM('student', 'admin', 'teacher'),
                defaultValue: 'student',
                allowNull: false
            },
            level: {
                type: DataTypes.INTEGER,
                defaultValue: 1
            },
            xp: {
                type: DataTypes.INTEGER,
                defaultValue: 0
            },
            streak: {
                type: DataTypes.INTEGER,
                defaultValue: 0
            },
            lastActive: {
                type: DataTypes.DATE,
                defaultValue: DataTypes.NOW
            },
            resetPasswordToken: {
                type: DataTypes.STRING,
                allowNull: true
            },
            resetPasswordExpires: {
                type: DataTypes.DATE,
                allowNull: true
            }
        }, {
            sequelize,
            modelName: 'user',
            tableName: 'users',
            timestamps: true,
            hooks: {
                beforeCreate: async (user) => {
                    if (user.password) {
                        const salt = await bcrypt.genSalt(10);
                        user.password = await bcrypt.hash(user.password, salt);
                    }
                },
                beforeUpdate: async (user) => {
                    if (user.changed('password')) {
                        const salt = await bcrypt.genSalt(10);
                        user.password = await bcrypt.hash(user.password, salt);
                    }
                }
            }
        });
    }

    static associate(models) {
        // Asociaciones existentes
        this.hasMany(models.UserProgress, {
            foreignKey: 'UserId',
            as: 'progresses'
        });

        this.belongsToMany(models.Badge, {
            through: models.UserBadge,
            foreignKey: 'UserId',
            otherKey: 'BadgeId',
            as: 'badges'
        });

        // Nuevas asociaciones para grupos
        this.hasMany(models.Group, {
            foreignKey: 'teacherId',
            as: 'teacherGroups'
        });

        this.belongsToMany(models.Group, {
            through: 'GroupStudents',
            foreignKey: 'studentId',
            otherKey: 'groupId',
            as: 'studentGroups'
        });
    }

    async matchPassword(enteredPassword) {
        return await bcrypt.compare(enteredPassword, this.password);
    }

    getSignedJwtToken() {
        return jwt.sign({ id: this.id }, process.env.JWT_SECRET, {
            expiresIn: '30min'
        });
    }

    isAdmin() {
        return this.role === 'admin';
    }
}

module.exports = User;