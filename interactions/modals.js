/* PROJECT POBLACION - DISCORD BOT */

/*========================================================
  DISCORD WHITELISTING SYSTEM
  ========================================================*/

  /* MAIN MODAL CONFIGURATION */

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

  const config = require("../config.json");
  const cooldowns = new Map();
  const COOLDOWN_TIME = 1 * 60 * 1000; // 1 minute


module.exports = async (interaction) => {
  if (!interaction.isModalSubmit()) return;

  // WHITELIST MODALS

  if (interaction.customId === "whitelist_submit") {

    /* APPLICATION FORM INPUTS */
    
      const characterName = interaction.fields.getTextInputValue("character_name");
      const age = interaction.fields.getTextInputValue("age");
      const steamProfile = interaction.fields.getTextInputValue("steam_profile");
      const vouchedBy = "None";

      const fs = require("fs");
      const DB = "./data/whitelist.json";

      let database = {};

      if (fs.existsSync(DB)) {
        database = JSON.parse(fs.readFileSync(DB));
      }

      database[interaction.user.id] = {
        character: characterName,
        steam: steamProfile,
        vouchers: "None"
      };

fs.writeFileSync(DB, JSON.stringify(database, null, 2));

      /* VALIDATION */

      /* Age check
      if (isNaN(age) || Number(age) < 18) {
        return interaction.reply({
          content: "❌ Character age must be a number and at least 18.",
          flags: 64
        });
      }*/

      if (isNaN(age)) {
      return interaction.reply({
          content: "❌ Character age must be a number.",
           flags: 64
       });
      }

      // Steam profile link check
      if (
        !steamProfile.startsWith("https://steamcommunity.com/id/") &&
        !steamProfile.startsWith("https://steamcommunity.com/profiles/")
      ) {
        return interaction.reply({
          content: "❌ Please provide a valid Steam profile link.",
          flags: 64
        });
      }

      // ✅ START COOLDOWN AFTER SUCCESSFUL SUBMIT
      const userId = interaction.user.id;
      const now = Date.now();

      cooldowns.set(userId, now);
      setTimeout(() => cooldowns.delete(userId), COOLDOWN_TIME);

    /* DISCORD ACCOUNT AGE ON EMBED */

    const createdAt = interaction.user.createdAt;
    const currentDate = new Date();

    const diffMs = currentDate - createdAt;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffYears = Math.floor(diffDays / 365);
    const diffMonths = Math.floor((diffDays % 365) / 30);

    const accountAge = `${diffYears} year(s), ${diffMonths} month(s)`;

    /* EMBED SPACER */

    const DIVIDER = "";
    const SPACE = "\u200B";

    /* MAIN EMBED AFTER SUBMIT */

    const embed = new EmbedBuilder()
      .setColor(0xff8c00)
      .setAuthor({
        name: "[ NEW WHITELIST APPLICATION ]",
        iconURL: interaction.guild.iconURL({ dynamic: true })
      })
      .setThumbnail(
        interaction.user.displayAvatarURL({ dynamic: true, size: 256 })
      )
      .addFields(
        { name: SPACE, value: "👤 **APPLICANT INFORMATION:**" },
        {
          name: SPACE,
          value:
            `**Discord User:** ${interaction.user}\n` +
            `**Account Age:** ${accountAge}`
        },

        { name: SPACE, value: "🎭 **CHARACTER DETAILS:**" },
        {
          name: SPACE,
          value:
            `**Character Name:** ${characterName}\n` +
            `**Character Age:** ${age}`
        },

        { name: SPACE, value: "🔗 **STEAM LINK:**" },
        {
          name: SPACE,
          value: `🌐 [Steam Profile](${steamProfile})`
        },

        { name: SPACE, value: "📊 **APPLICATION STATUS:**" },
        {
          name: SPACE,
          value: "🟡 **PENDING REVIEW**"
        },

        { name: SPACE, value: SPACE },

        {
          name: "👥 **VOUCHED BY:**",
          value: vouchedBy,
          inline: false
        }
      )
      .setFooter({
        text: "Poblacion City Roleplay"
      })
      .setTimestamp();

    /* BUTTONS */

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("vouch")
        .setLabel("Vouch")
        .setEmoji("🖐️")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("approve")
        .setLabel("Approve")
        .setEmoji("✅")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId("deny")
        .setLabel("Deny")
        .setEmoji("✖️")
        .setStyle(ButtonStyle.Danger)
    );

    /*  */

    const channel = interaction.client.channels.cache.get(
      config.whitelistChannelId
    );

    if (!channel) {
      return interaction.reply({
        content: "❌ Whitelist channel not found.",
        flags: 64
      });
    }

    await channel.send({
      embeds: [embed],
      components: [buttons]
    });
  

    return interaction.reply({
      content: "✅ Your application has been submitted!",
      flags: 64
    });
  }

  /* DENIED MODAL CONFIGURATION */

  if (interaction.customId.startsWith("deny_reason_modal:")) {

    const reason = interaction.fields.getTextInputValue("deny_reason");
    const messageId = interaction.customId.split(":")[1];

    const channel = interaction.client.channels.cache.get(config.whitelistChannelId);
    if (!channel) return;

    const message = await channel.messages.fetch(messageId).catch(() => null);


    if (!message || !message.embeds.length) {
      return interaction.reply({
        content: "❌ Application message not found.",
        flags: 64
      });
    }

    const embed = EmbedBuilder.from(message.embeds[0]);
    const fields = embed.data.fields;

    /* STATUS FIELD CHECK */

    const statusField = fields.find(field =>
      field.value?.includes("PENDING REVIEW")
    );

    // Deny if not pending
    if (!statusField || !statusField.value.includes("PENDING REVIEW")) {
      return interaction.reply({
        content: "❌ This application can no longer be denied.",
        flags: 64
      });
    }

    /* UPDATE STATUS FIELD FOR DENY */

    statusField.value = "❌ **DENIED**";

    if (!fields.some(f => f.name.includes("DENIED BY"))) {
      embed.addFields(
        {
          name: "❌ **DENIED BY**",
          value: `${interaction.user}`
        },
        {
          name: "📄 **DENIAL REASON**",
          value: reason
        }
      );
    }

    await message.edit({
      embeds: [embed],
      components: []
    });

    return interaction.reply({
      content: "❌ Application denied.",
      flags: 64
    });
  }
};