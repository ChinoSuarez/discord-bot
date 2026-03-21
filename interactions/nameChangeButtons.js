const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder
} = require("discord.js");

const config = require("../config.json");
const safeReply = require("../utils/safeReply");
const validIds = [
  "open_namechange_modal",
  "namechange_approve",
  "namechange_deny"
];

if (!validIds.includes(interaction.customId)) return;

/* ADMIN CHECK */
const isAdmin = async (interaction) => {
  if (interaction.guild.ownerId === interaction.user.id) return true;
  const member = await interaction.guild.members.fetch(interaction.user.id);
  return member.roles.cache.some(role =>
    config.adminRoleIds.includes(role.id)
  );
};

module.exports = async (interaction) => {
  if (!interaction.isButton()) return;

  /* =====================
     OPEN MODAL
     ===================== */
  if (interaction.customId === "open_namechange_modal") {

    if (!interaction.member.roles.cache.has(config.citizenRoleId)) {
      return interaction.reply({
        content: "❌ Only **Citizens** can request a name change.",
        flags: 64
      });
    }

    const modal = new ModalBuilder()
      .setCustomId("namechange_submit")
      .setTitle("✏️ Name Change Request");

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("new_name")
          .setLabel("New RP Name")
          .setPlaceholder("Firstname Lastname")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      )
    );

    return interaction.showModal(modal);
  }

  /* =====================
     APPROVE
     ===================== */
  if (interaction.customId === "namechange_approve") {

    if (!(await isAdmin(interaction))) {
    return safeReply(interaction, "❌ No permission.");
    }

    const embed = EmbedBuilder.from(interaction.message.embeds[0]);

    /* GET USER ID FROM FOOTER */
    const footerText = embed.data.footer?.text;
    const userId = footerText?.startsWith("UID:")
      ? footerText.replace("UID:", "")
      : null;

    if (!userId) {
    return safeReply(interaction, "❌ User data missing. Cannot change name.");
    }

    /* GET REQUESTED NAME */
    const newName = embed.data.fields.find(
      f => f.name === "REQUESTED NAME"
    )?.value;

    if (!newName) {
    return safeReply(interaction, "❌ Requested name not found.");
    }

    const member = await interaction.guild.members.fetch(userId).catch(() => null);

    if (!member) {
      return safeReply(interaction, "❌ User not found in server.");
    }

    /* SET NICKNAME */
    try {
      await member.setNickname(newName.slice(0, 32));
    } catch {
      return safeReply(interaction, "⚠️ Approved, but bot cannot change nickname (permissions).");
    }

    /* UPDATE EMBED STATUS */
    embed.data.fields[embed.data.fields.length - 1].value = "✅ **APPROVED**";
    embed.addFields({ name: "✅ APPROVED BY", value: `${interaction.user}` });

    await interaction.message.edit({
      embeds: [embed],
      components: []
    });

    return safeReply(interaction, `✅ Name changed to **${newName}**`);
  }

  /* =====================
     DENY
     ===================== */
  if (interaction.customId === "namechange_deny") {

    if (!(await isAdmin(interaction))) {
    return safeReply(interaction, "❌ No permission.");
    }


    const embed = EmbedBuilder.from(interaction.message.embeds[0]);
    embed.data.fields[embed.data.fields.length - 1].value = "❌ **DENIED**";
    embed.addFields({ name: "❌ DENIED BY", value: `${interaction.user}` });

    await interaction.message.edit({
      embeds: [embed],
      components: []
    });

    return safeReply(interaction, "❌ Name change denied.");
  }
};