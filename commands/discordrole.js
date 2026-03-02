const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roles')
    .setDescription('Shows all server role IDs'),

  async execute(interaction) {
    const roles = interaction.guild.roles.cache
      .map(role => `${role.name} : ${role.id}`)
      .join('\n');

    // Discord has 2000 character limit
    if (roles.length > 2000) {
      return interaction.reply({
        content: "Too many roles to display in one message.",
        ephemeral: true
      });
    }

    await interaction.reply({
      content: roles,
      ephemeral: true // Only you can see it
    });
  },
};