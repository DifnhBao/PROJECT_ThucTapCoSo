"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("songs", "status", {
      type: Sequelize.ENUM("pending", "approved", "rejected"),
      allowNull: false,
      defaultValue: "approved",
      after: "is_visible",
    });

    await queryInterface.addColumn("songs", "uploaded_by", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "users",
        key: "user_id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
      after: "status",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("songs", "uploaded_by");
    await queryInterface.removeColumn("songs", "status");
    // Remove ENUM type (MySQL)
    await queryInterface.sequelize.query(
      "DROP TYPE IF EXISTS \"enum_songs_status\";"
    );
  },
};
