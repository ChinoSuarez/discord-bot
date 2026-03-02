const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roles')
    .setDescription('Shows all server role IDs'),

  async execute(interaction) {
    const rolesArray = interaction.guild.roles.cache
      .sort((a, b) => b.position - a.position) // highest role first
      .map(role => `${role.name} : ${role.id}`);

    const rolesText = rolesArray.join('\n');

    // Split into chunks under Discord's 2000 limit
    const chunkSize = 1900;
    const chunks = [];

    for (let i = 0; i < rolesText.length; i += chunkSize) {
      chunks.push(rolesText.slice(i, i + chunkSize));
    }

    // Send first message
    await interaction.reply({
      content: chunks[0],
      ephemeral: true
    });

    // Send remaining chunks if needed
    for (let i = 1; i < chunks.length; i++) {
      await interaction.followUp({
        content: chunks[i],
        ephemeral: true
      });
    }
  },
};