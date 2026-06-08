const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Feed = sequelize.define('Feed', {
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  body: {
    type: DataTypes.TEXT,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
});

module.exports = Feed;
