const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("restart")
    .setDescription("Restart the bot"),

  async execute(interaction) {

    // Only server owner or admin
    if (!interaction.member.permissions.has("Administrator")) {
      return interaction.reply({
        content: "❌ You do not have permission to restart the bot.",
        flags: 64
      });
    }

    await interaction.reply({
      content: "♻️ Restarting Poblacion Gatekeeper...",
      flags: 64
    });

    setTimeout(() => {
      process.exit(0);
    }, 2000);
  }
};