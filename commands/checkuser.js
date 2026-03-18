const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const config = require("../config.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("checkuser")
    .setDescription("Check a user's whitelist application")
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("User to check")
        .setRequired(true)
    ),

  async execute(interaction) {

    const target = interaction.options.getUser("user");

    await interaction.deferReply({ ephemeral: true });

    const channel = await interaction.client.channels
      .fetch(config.whitelistChannelId)
      .catch(() => null);

    if (!channel) {
      return interaction.editReply("❌ Whitelist channel not found.");
    }

    let lastId;
    let application = null;

    while (true) {

      const options = { limit: 100 };
      if (lastId) options.before = lastId;

      const messages = await channel.messages.fetch(options);

      if (!messages.size) break;

      application = messages.find(msg => {
        if (!msg.embeds.length) return false;

        const embed = msg.embeds[0];
        const fields = embed.data.fields || [];

        const userField = fields.find(f =>
          f.value?.includes("Discord User:")
        );

        return userField?.value.includes(`<@${target.id}>`);
      });

      if (application) break;

      lastId = messages.last().id;
    }

    if (!application) {
      return interaction.editReply("❌ No application found for this user.");
    }

    const embed = application.embeds[0];
    const fields = embed.data.fields || [];

    const charField = fields.find(f => f.value?.includes("Character Name:"));
    const steamField = fields.find(f => f.value?.includes("Steam Profile"));
    const vouchField = fields.find(f => f.name?.includes("VOUCHED BY"));

    const characterName =
      charField?.value.split("Character Name:")[1]?.split("\n")[0]?.trim() || "Unknown";

    const steamProfile =
      steamField?.value.match(/\((.*?)\)/)?.[1] || "Unknown";

    const vouchers = vouchField?.value || "None";

    const result = new EmbedBuilder()
      .setColor(0xff8c00)
      .setAuthor({
        name: "WHITELIST APPLICATION LOOKUP",
        iconURL: interaction.guild.iconURL({ dynamic: true })
      })
      .setThumbnail(
        target.displayAvatarURL({ dynamic: true, size: 256 })
      )
      .addFields(
        { name: "DISCORD USER", value: `<@${target.id}>` },
        { name: "CHARACTER NAME", value: characterName },
        { name: "STEAM PROFILE", value: `[Steam Profile](${steamProfile})` },
        { name: "VOUCHERS", value: `\n${vouchers.replace(/, /g, "\n")}` }
      )
      .setFooter({ text: "Poblacion City Roleplay" })
      .setTimestamp();

    return interaction.editReply({
      embeds: [result]
    });

  }
};