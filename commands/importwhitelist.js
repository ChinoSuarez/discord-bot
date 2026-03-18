const { SlashCommandBuilder } = require("discord.js");
const fs = require("fs");
const config = require("../config.json");

const DB = "./data/whitelist.json";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("importwhitelist")
    .setDescription("Import old whitelist applications"),

  async execute(interaction) {

    await interaction.reply({
      content: "Importing whitelist applications...",
      flags: 64
    });

    const channel = await interaction.client.channels.fetch(config.whitelistChannelId);

    let database = JSON.parse(fs.readFileSync(DB));

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

        database[userId] = {
          character,
          steam,
          vouchers
        };

        imported++;
      }

      lastId = messages.last().id;
    }

    fs.writeFileSync(DB, JSON.stringify(database, null, 2));

    interaction.followUp({
      content: `Imported ${imported} applications.`,
      flags: 64
    });
  }
};