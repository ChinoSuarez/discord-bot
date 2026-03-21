const { EmbedBuilder, PermissionsBitField } = require("discord.js");

const LOG_CHANNEL_ID = "1477267369742045225";

// TRACKERS
const spamTracker = new Map();
const raidTracker = new Map();
const warnTracker = new Map();
const imageRaidTracker = new Map();
const multiChannelTracker = new Map();

/* =========================
   EMBEDS
========================= */

const warnEmbed = (user, reason) =>
  new EmbedBuilder()
    .setColor(0xff0000)
    .setTitle("⚠ WARNED")
    .setDescription(`**WARNED BY GWENBOT**

USER: ${user}

REASON: ${reason}`)
    .setFooter({ text: "GATEKEEPER Security System" })
    .setTimestamp();

const kickEmbed = (user, reason) =>
  new EmbedBuilder()
    .setColor(0x8B0000)
    .setTitle("🚫 KICKED")
    .setDescription(`**KICKED BY GWENBOT - ANTI RAID**

USER: ${user}

REASON: ${reason}`)
    .setFooter({ text: "GATEKEEPER Security System" })
    .setTimestamp();

const logEmbed = (message, action, reason) =>
  new EmbedBuilder()
    .setColor(0x2f3136)
    .setTitle("🛡 Gatekeeper Log")
    .addFields(
      { name: "Action", value: action, inline: true },
      { name: "User", value: `${message.author} (${message.author.id})`, inline: true },
      { name: "Channel", value: `<#${message.channel.id}>`, inline: true },
      { name: "Reason", value: reason },
      { name: "Message", value: message.content || "Attachment / No Text" }
    )
    .setTimestamp();

/* =========================
   SAFE FUNCTIONS
========================= */

const safeDelete = async (message) => {
  await message.delete().catch(() => {});
};

const safeKick = async (message, reason) => {
  const member = await message.guild.members.fetch(message.author.id).catch(() => null);
  if (member) {
    await member.kick(reason).catch(() => {});
  }
};

const timeoutUser = async (message) => {
  const member = await message.guild.members.fetch(message.author.id).catch(() => null);

  if (!member) return;

  if (!member.moderatable) return;

  await member.timeout(2 * 60 * 1000, "Auto timeout after warning").catch(() => {});
};

/* =========================
   LOG
========================= */

const sendLog = async (message, action, reason) => {
  const logChannel = message.guild.channels.cache.get(LOG_CHANNEL_ID);
  if (!logChannel) return;

  logChannel.send({
    embeds: [logEmbed(message, action, reason)]
  }).catch(() => {});
};

/* =========================
   WARN (UPDATED)
========================= */

const sendWarn = async (message, reason) => {
  const user = message.author.id;
  const now = Date.now();

  const lastWarn = warnTracker.get(user);

  if (lastWarn && now - lastWarn < 5000) return;

  warnTracker.set(user, now);

  // ✅ SEND WARN (NO AUTO DELETE)
  await message.channel.send({
    embeds: [warnEmbed(message.author, reason)]
  }).catch(() => {});

  // ✅ TIMEOUT USER (2 MINUTES)
  await timeoutUser(message);

  await sendLog(message, "WARN", reason);
};

/* =========================
   MAIN SYSTEM
========================= */

module.exports = async (message) => {

  if (!message.guild) return;
  if (message.author.bot) return;

  const content = message.content.toLowerCase();
  const now = Date.now();
  const user = message.author.id;
  const channel = message.channel.id;

  /* =========================
     SCAM IMAGE DETECTION
  ========================= */

  if (message.attachments.size > 0) {

    const suspiciousWords = ["withdraw","bonus","promo","crypto","casino"];
    const suspiciousDomains = ["nexora",".gl",".xyz",".tk"];

    if (
      suspiciousWords.some(w => content.includes(w)) ||
      suspiciousDomains.some(d => content.includes(d))
    ) {
      await safeDelete(message);
      await safeKick(message, "Crypto scam image");
      await sendLog(message, "KICK", "Crypto scam image");

      await message.channel.send({
        embeds: [kickEmbed(message.author, "Crypto scam image")]
      });

      return;
    }
  }

  /* =========================
     MULTI CHANNEL RAID
  ========================= */

  let channelLogs = multiChannelTracker.get(user) || [];
  channelLogs = channelLogs.filter(x => now - x.time < 10000);

  channelLogs.push({ channel, time: now });
  multiChannelTracker.set(user, channelLogs);

  if (new Set(channelLogs.map(x => x.channel)).size >= 3) {
    await safeDelete(message);
    await safeKick(message, "Multi-channel spam");
    await sendLog(message, "KICK", "Multi-channel spam");

    await message.channel.send({
      embeds: [kickEmbed(message.author, "Multi-channel spam")]
    });

    return;
  }

  /* =========================
     SPAM DETECTION
  ========================= */

  let spamLogs = spamTracker.get(user) || [];
  spamLogs = spamLogs.filter(x => now - x.time < 5000);

  spamLogs.push({ content, time: now });
  spamTracker.set(user, spamLogs);

  if (spamLogs.filter(x => x.content === content).length >= 3) {
    await safeDelete(message);
    await sendWarn(message, "Repeated spam");
    return;
  }

  if (spamLogs.length >= 6) {
    await safeDelete(message);
    await sendWarn(message, "Spam detected");
    return;
  }

  /* =========================
     BAD WORD FILTER
  ========================= */

  const badWords = ["nigger","bakla","pokpok","nigga","faggot"];

  if (badWords.some(w => content.includes(w))) {
    await safeDelete(message);
    await sendWarn(message, "Offensive language");
    return;
  }

  /* =========================
     RAID DETECTION
  ========================= */

  let raidLogs = raidTracker.get(user) || [];
  raidLogs = raidLogs.filter(t => now - t < 8000);

  raidLogs.push(now);
  raidTracker.set(user, raidLogs);

  if (raidLogs.length >= 7) {
    await safeDelete(message);
    await safeKick(message, "Spam raid");
    await sendLog(message, "KICK", "Spam raid");

    await message.channel.send({
      embeds: [kickEmbed(message.author, "Spam raid")]
    });
  }
};

/* =========================
   CLEANUP
========================= */

setInterval(() => {
  spamTracker.clear();
  raidTracker.clear();
  imageRaidTracker.clear();
  multiChannelTracker.clear();
}, 600000);