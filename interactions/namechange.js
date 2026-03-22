const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require("discord.js");

const config = require("../config.json");

module.exports = async (interaction) => {

  /* =========================
     BUTTONS
     ========================= */
  if (interaction.isButton()) {

    /* OPEN MODAL */
    if (interaction.customId === "open_namechange_modal") {

      if (!interaction.member.roles.cache.has(config.citizenRoleId)) {
        return interaction.reply({
          content: "❌ Only Citizens can request.",
          flags: 64
        });
      }

      const modal = new ModalBuilder()
        .setCustomId("namechange_submit")
        .setTitle("Name Change Request");

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("new_name")
            .setLabel("New RP Name")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        )
      );

      return interaction.showModal(modal);
    }

    /* APPROVE / DENY */
    if (
      interaction.customId === "namechange_approve" ||
      interaction.customId === "namechange_deny"
    ) {

      const embedRaw = interaction.message.embeds[0];
      if (!embedRaw) {
        return interaction.reply({ content: "❌ Invalid embed.", flags: 64 });
      }

      const embed = EmbedBuilder.from(embedRaw);

      // ✅ IDENTITY CHECK
      const footer = embed.data.footer?.text;
      if (!footer?.startsWith("app:namechange|UID:")) {
        return interaction.reply({
          content: "❌ Invalid application embed.",
          flags: 64
        });
      }

      const userId = footer.split("UID:")[1];

      const member = await interaction.guild.members.fetch(userId).catch(() => null);
      if (!member) {
        return interaction.reply({ content: "❌ User not found.", flags: 64 });
      }

      const newName = embed.data.fields[1]?.value;

      if (!newName) {
        return interaction.reply({
            content: "❌ Requested name missing.",
            flags: 64
        });
        }

      if (interaction.customId === "namechange_approve") {

        try {
            const safeName = newName.trim().slice(0, 32);

            if (safeName.length < 3) {
            return interaction.reply({
                content: "❌ Invalid name.",
                flags: 64
            });
            }

            await member.setNickname(safeName);
        } catch {
          return interaction.reply({
            content: "⚠️ Approved but cannot change nickname.",
            flags: 64
          });
        }

        const fields = embed.data.fields;
        fields[2].value = "✅ APPROVED";
        embed.setFields(fields);

        embed.addFields({
          name: "Approved By",
          value: `${interaction.user}`
        });

        await interaction.message.edit({
          embeds: [embed],
          components: []
        });

            return interaction.reply({
            content: `✅ Name changed to ${safeName}`,
            flags: 64
            });
      }

      if (interaction.customId === "namechange_deny") {

        const fields = embed.data.fields;
        fields[2].value = "❌ DENIED";
        embed.setFields(fields);

        embed.addFields({
          name: "Denied By",
          value: `${interaction.user}`
        });

        await interaction.message.edit({
          embeds: [embed],
          components: []
        });

        return interaction.reply({
          content: "❌ Request denied.",
          flags: 64
        });
      }
    }
  }

  /* =========================
     MODAL SUBMIT
     ========================= */
  if (interaction.isModalSubmit()) {

    if (interaction.customId !== "namechange_submit") return;

    const newName = interaction.fields.getTextInputValue("new_name");
    const currentName = interaction.member.nickname || interaction.user.username;

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setAuthor({ name: "NAME CHANGE REQUEST" })
      .addFields(
        { name: "CURRENT NAME", value: currentName },
        { name: "REQUESTED NAME", value: newName },
        { name: "STATUS", value: "🟡 PENDING" }
      )
      .setFooter({ text: `app:namechange|UID:${interaction.user.id}` });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("namechange_approve")
        .setLabel("Approve")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("namechange_deny")
        .setLabel("Deny")
        .setStyle(ButtonStyle.Danger)
    );

    await interaction.reply({
      content: "✅ Submitted.",
      flags: 64
    });

    const channel = await interaction.client.channels.fetch(config.nameChangeChannelId).catch(() => null);
    if (!channel) return;

    await channel.send({
      embeds: [embed],
      components: [row]
    });
  }
};