module.exports = (sequelize, DataTypes) => {
  const UserActivity = sequelize.define(
    "UserActivity",
    {
      event_id: { type: DataTypes.STRING(36), allowNull: true },
      payload_digest: { type: DataTypes.STRING(64), allowNull: true },
      event_version: { type: DataTypes.SMALLINT, allowNull: true },
      qualified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      song_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      session_id: {
        type: DataTypes.STRING(64),
        allowNull: false,
      },
      source: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: "e.g., search, playlist, recommendation, radio",
      },
      exit_reason: {
        type: DataTypes.STRING(50),
        comment: "ended, skipped, tab_closed",
      },
      max_position_reached: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
      },
      play_pause_count: {
        type: DataTypes.SMALLINT,
        defaultValue: 0,
      },
      seek_count: {
        type: DataTypes.SMALLINT,
        defaultValue: 0,
      },
      song_duration: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      total_listened_time: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "UserActivities",
      timestamps: false,
      indexes: [
        { name: 'uq_activity_user_event', fields: ['user_id', 'event_id'], unique: true },
        {
          name: "idx_user_created",
          fields: ["user_id", "created_at"],
        },
        {
          name: "idx_song_created",
          fields: ["song_id", "created_at"],
        },
        {
          name: "idx_session_id",
          fields: ["session_id"],
        },
        {
          name: "idx_created_at",
          fields: ["created_at"],
        },
        {
          name: "idx_user_song_created",
          fields: ["user_id", "song_id", "created_at"],
        },
      ],
    },
  );

  UserActivity.associate = function (models) {
    // Unpartitioned since T04; migrations own the actual foreign keys.
    UserActivity.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "user",
      onDelete: "CASCADE",
    });

    UserActivity.belongsTo(models.Song, {
      foreignKey: "song_id",
      as: "song",
      onDelete: "CASCADE",
    });
  };

  return UserActivity;
};
