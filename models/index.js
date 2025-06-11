const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Import models
const User = require('./user');
const Category = require('./category');
const Exercise = require('./exercise');
const UserProgress = require('./userprogress');
const Badge = require('./badge');
const UserBadge = require('./userBadge');
const Group = require('./group');

// Initialize models
const models = {
    User: User.init(sequelize, DataTypes),
    Category: Category.init(sequelize, DataTypes),
    Exercise: Exercise.init(sequelize, DataTypes),
    UserProgress: UserProgress.init(sequelize, DataTypes),
    Badge: Badge.init(sequelize, DataTypes),
    UserBadge: UserBadge.init(sequelize, DataTypes),
    Group: Group.init(sequelize, DataTypes)
};

// Set up associations
Object.values(models)
    .filter(model => typeof model.associate === 'function')
    .forEach(model => model.associate(models));

// Export models and sequelize instance
module.exports = {
    sequelize,
    Sequelize,
    User: models.User,
    Category: models.Category,
    Exercise: models.Exercise,
    UserProgress: models.UserProgress,
    Badge: models.Badge,
    UserBadge: models.UserBadge,
    Group: models.Group
};