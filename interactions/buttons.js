const {
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} = require("discord.js");

const config = require("../config.json");
const pool = require("../database");
const sync = require("../syncWhitelist");

/* ADMIN CHECK */
const isAdmin = async (interaction) => {
  if (interaction.guild.ownerId === interaction.user.id) return true;

  const member = await interaction.guild.members.fetch(interaction.user.id);
  return member.roles.cache.some(role =>
    config.adminRoleIds.includes(role.id)
  );
};

/* GET CHARACTER NAME */
const getCharacterName = (fields) => {
  const field = fields.find(f => f.value?.includes("Character Name:"));
  if (!field) return null;

  return field.value
    .split("Character Name:")[1]
    .split("\n")[0]
    .trim()
    .replace(/[*_~`|]/g, "")
    .slice(0, 32);
};

module.exports = async (interaction) => {
  if (!interaction.isButton()) return;

  const whitelistButtons = [
    "open_whitelist_modal",
    "vouch",
    "approve",
    "deny"
  ];

  if (!whitelistButtons.includes(interaction.customId)) return;

  /* OPEN MODAL */
  if (interaction.customId === "open_whitelist_modal") {

    if (interaction.member.roles.cache.has(config.citizenRoleId)) {
      return interaction.reply({
        content: "❌ You are already a **CITIZEN**.",
        flags: 64
      });
    }

    const modal = new ModalBuilder()
      .setCustomId("whitelist_submit")
      .setTitle("📄 Whitelist Application");

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("character_name")
          .setLabel("Character Name")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("age")
          .setLabel("Character Age")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("steam_profile")
          .setLabel("Steam Profile URL")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      )
    );

    return interaction.showModal(modal);
  }

  const message = interaction.message;
  if (!message.embeds.length) return;

  const embed = EmbedBuilder.from(message.embeds[0]);
  const fields = embed.data.fields;

  const statusField = fields.find(f =>
    f.name === "\u200B" && f.value.includes("PENDING")
  );

  /* =========================
     VOUCH SYSTEM (FIXED)
  ========================= */
  if (interaction.customId === "vouch") {

    if (!interaction.member.roles.cache.has(config.citizenRoleId)) {
      return interaction.reply({
        content: "❌ Only **Citizens** can vouch.",
        flags: 64
      });
    }

    if (!statusField) {
      return interaction.reply({
        content: "❌ Application is not pending.",
        flags: 64
      });
    }

    const userField = fields.find(f => f.value?.includes("<@"));
    const match = userField?.value.match(/<@(\d+)>/);

    if (!match) {
      return interaction.reply({
        content: "❌ Failed to get applicant.",
        flags: 64
      });
    }

    const applicantId = match[1];

    if (interaction.user.id === applicantId) {
      return interaction.reply({
        content: "❌ You cannot vouch yourself.",
        flags: 64
      });
    }

    const vouchField = fields.find(f =>
      f.name.toUpperCase().includes("VOUCHED BY")
    );

    if (!vouchField) {
      return interaction.reply({
        content: "❌ Vouch field missing.",
        flags: 64
      });
    }

    let vouches = vouchField.value === "None"
      ? []
      : vouchField.value.split(", ");

    const voucher = `<@${interaction.user.id}>`;

    // ❌ prevent duplicate (NO TOGGLE)
    if (vouches.includes(voucher)) {
      return interaction.reply({
        content: "❌ You already vouched.",
        flags: 64
      });
    }

    // add vouch
    vouches.push(voucher);

    vouchField.value = vouches.join(", ");

    await message.edit({ embeds: [embed] });
    await sync(message);

    try {
      await pool.query(
        "UPDATE whitelist SET vouchers = $1 WHERE discord_id = $2",
        [vouchField.value, applicantId]
      );
    } catch (err) {
      console.error("DB ERROR:", err);
    }

    return interaction.reply({
      content: "✅ Vouch added.",
      flags: 64
    });
  }

  /* =========================
     APPROVE
  ========================= */
  if (interaction.customId === "approve") {

    if (!(await isAdmin(interaction))) {
      return interaction.reply({
        content: "❌ No permission.",
        flags: 64
      });
    }

    if (!statusField || !statusField.value.includes("PENDING")) {
      return interaction.reply({
        content: "❌ Already handled.",
        flags: 64
      });
    }

    const userField = fields.find(f => f.value?.includes("<@"));
    const userId = userField?.value.match(/\d+/)?.[0];

    const characterName = getCharacterName(fields);

    statusField.value = "✅ **APPROVED**";

    embed.addFields({
      name: "✅ APPROVED BY",
      value: `${interaction.user}`
    });

    await message.edit({
      embeds: [embed],
      components: []
    });
    await sync(message);

    const member = await interaction.guild.members.fetch(userId);

    await member.roles.add(config.citizenRoleId).catch(() => {});

    try {
      await member.setNickname(characterName);
    } catch {}

    return interaction.reply({
      content: "✅ Approved.",
      flags: 64
    });
  }

  /* =========================
     DENY
  ========================= */
  if (interaction.customId === "deny") {

    if (!(await isAdmin(interaction))) {
      return interaction.reply({
        content: "❌ No permission.",
        flags: 64
      });
    }

    const modal = new ModalBuilder()
      .setCustomId(`deny_reason_modal:${message.id}`)
      .setTitle("Deny Application");

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("deny_reason")
          .setLabel("Reason")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
      )
    );

    return interaction.showModal(modal);
  }
};