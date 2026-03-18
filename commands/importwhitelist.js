const { SlashCommandBuilder } = require("discord.js");
const pool = require("../database");
const config = require("../config.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("importwhitelist")
    .setDescription("Import old whitelist applications"),

  async execute(interaction) {

    await interaction.deferReply();

    try {

      const channel = await interaction.client.channels.fetch(config.whitelistChannelId);

      let lastId;
      let imported = 0;

      while (true) {

        const options = { limit: 100 };
        if (lastId) options.before = lastId;

        const messages = await channel.messages.fetch(options);
        if (!messages.size) break;

        for (const msg of messages.values()) {

          if (!msg.embeds.length) continue;

          const embed = msg.embeds[0];
          const fields = embed.data.fields || [];

          const userField = fields.find(f => f.value?.includes("Discord User:"));
          const charField = fields.find(f => f.value?.includes("Character Name:"));
          const steamField = fields.find(f => f.value?.includes("Steam Profile"));
          const vouchField = fields.find(f => f.name?.includes("VOUCHED BY"));

          if (!userField) continue;

          const userId = userField.value.match(/\d+/)?.[0];
          if (!userId) continue;

          const character =
            charField?.value.split("Character Name:")[1]?.split("\n")[0]?.trim() || "Unknown";

          const steam =
            steamField?.value.match(/\((.*?)\)/)?.[1] || "Unknown";

          const vouchers = vouchField?.value || "None";

          await pool.query(
            `INSERT INTO whitelist (discord_id, character_name, steam_profile, vouchers)
             VALUES ($1,$2,$3,$4)
             ON CONFLICT (discord_id)
             DO NOTHING`,
            [userId, character, steam, vouchers]
          );

          imported++;

        }

        lastId = messages.last().id;

      }

      await interaction.editReply(`✅ Imported ${imported} whitelist applications.`);

    } catch (error) {

      console.error(error);
      await interaction.editReply("❌ Failed to import whitelist applications.");

    }

  }
};