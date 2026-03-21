module.exports = async (interaction, content) => {
  try {
    if (interaction.deferred) {
      return await interaction.editReply({ content });
    }

    if (interaction.replied) return;

    return await interaction.reply({ content, flags: 64 });

  } catch (err) {
    console.error("SafeReply error:", err);
  }
};