const { EmbedBuilder } = require("discord.js");
const pool = require("../database");

const LOG_CHANNEL_ID = "YOUR_REVOKE_CHANNEL_ID";

module.exports = async (interaction) => {

  if (!interaction.isModalSubmit()) return;
  if (!interaction.customId.startsWith("revoke_modal:")) return;

  await interaction.deferReply({ flags: 64 });

  const targetId = interaction.customId.split(":")[1];
  const ingameName = interaction.fields.getTextInputValue("ingame_name");
  const reason = interaction.fields.getTextInputValue("reason");

  const requester = `<@${interaction.user.id}>`;
  const target = `<@${targetId}>`;

  try {

    // 🔍 GET CURRENT VOUCHES
    const result = await pool.query(
      "SELECT vouchers FROM whitelist WHERE discord_id = $1",
      [targetId]
    );

    if (result.rows.length === 0) {
      return interaction.editReply("❌ User has no whitelist application.");
    }

    let vouchers = result.rows[0].vouchers || "None";

    let vouchList = vouchers === "None"
      ? []
      : vouchers.split(", ");

    // ❌ check if naka-vouch ka
    if (!vouchList.includes(requester)) {
      return interaction.editReply("❌ You have not vouched this user.");
    }

    // 🔥 REMOVE VOUCH
    vouchList = vouchList.filter(v => v !== requester);

    const newValue = vouchList.length
      ? vouchList.join(", ")
      : "None";

    // 💾 UPDATE DATABASE
    await pool.query(
      "UPDATE whitelist SET vouchers = $1 WHERE discord_id = $2",
      [newValue, targetId]
    );

    // 📦 EMBED LOG
    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle("❌ VOUCH REVOKED")
      .addFields(
        { name: "DISCORD USER", value: requester },
        { name: "REVOKED FROM", value: target },
        { name: "IN-GAME NAME", value: ingameName },
        { name: "REASON", value: reason }
      )
      .setTimestamp();

    // 📍 SEND TO CHANNEL
    const channel = await interaction.client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);

    if (channel) {
      await channel.send({ embeds: [embed] });
    }

    return interaction.editReply("❌ Your vouch has been revoked.");

  } catch (err) {
    console.error(err);
    return interaction.editReply("❌ Database error.");
  }
};