const { SlashCommandBuilder } = require("discord.js");
const pool = require("../database");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setupdb")
    .setDescription("Create whitelist database table"),

  async execute(interaction) {

    try {

      await pool.query(`
        CREATE TABLE IF NOT EXISTS whitelist (
          discord_id TEXT PRIMARY KEY,
          character_name TEXT,
          steam_profile TEXT,
          vouchers TEXT
        )
      `);

      await interaction.reply({
        content: "✅ Whitelist database table created successfully."
      });

    } catch (error) {

      console.error("Database error:", error);

      await interaction.reply({
        content: "❌ Failed to create whitelist database."
      });

    }

  }
};