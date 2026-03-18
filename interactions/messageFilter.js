const { EmbedBuilder } = require("discord.js");

const LOG_CHANNEL_ID = "1477267369742045225"; // FIX: set your log channel ID here

const spamTracker = new Map();
const raidTracker = new Map();
const warnTracker = new Map();
const imageRaidTracker = new Map();
const multiChannelTracker = new Map();

/* =========================
   EMBED FUNCTIONS
========================= */

function warnEmbed(user, reason) {
return new EmbedBuilder()
.setColor(0xff0000)
.setTitle("⚠ WARNED")
.setDescription(`**WARNED BY GWENBOT**

USER: ${user}

REASON: ${reason}`)
.setFooter({ text: "GATEKEEPER Security System" })
.setTimestamp();
}

function kickEmbed(user, reason) {
return new EmbedBuilder()
.setColor(0x8B0000)
.setTitle("🚫 KICKED")
.setDescription(`**KICKED BY GWENBOT - ANTI RAID**

USER: ${user}

REASON: ${reason}`)
.setFooter({ text: "GATEKEEPER Security System" })
.setTimestamp();
}

function logEmbed(message, action, reason) {
return new EmbedBuilder()
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
}

/* =========================
   LOG FUNCTION
========================= */

async function sendLog(message, action, reason) {

const logChannel = message.guild.channels.cache.get(LOG_CHANNEL_ID);
if (!logChannel) return;

logChannel.send({
embeds: [logEmbed(message, action, reason)]
}).catch(()=>{});

}

/* =========================
   WARN FUNCTION
========================= */

async function sendWarn(message, reason) {

const warnCooldown = 5000;
const user = message.author.id;
const now = Date.now();

const lastWarn = warnTracker.get(user);

if (lastWarn && now - lastWarn < warnCooldown) return;

warnTracker.set(user, now);

const warn = await message.channel.send({
embeds: [warnEmbed(message.author, reason)]
});

setTimeout(() => warn.delete().catch(() => {}), 8000);

await sendLog(message, "WARN", reason);

}

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
   FAST SCAM IMAGE DETECTION
========================= */

if (message.attachments.size > 0) {

const suspiciousWords = [
"withdraw","withdrawal","bonus","promo",
"activate code","crypto","casino","reward"
];

const suspiciousDomains = [
"nexora",".gl",".xyz",".tk"
];

const hasScamWord = suspiciousWords.some(w => content.includes(w));
const hasScamLink = suspiciousDomains.some(d => content.includes(d));

if (hasScamWord || hasScamLink) {

await message.delete().catch(()=>{});

await message.guild.members.kick(user, "Crypto scam image");

await sendLog(message, "KICK", "Crypto scam image detected");

await message.channel.send({
embeds: [kickEmbed(message.author, "Crypto scam image detected")]
});

return;
}
}

/* =========================
   MULTI CHANNEL RAID CHECK
========================= */

let channelLogs = multiChannelTracker.get(user) || [];

channelLogs = channelLogs.filter(x => now - x.time < 10000);

channelLogs.push({
channel: channel,
time: now
});

multiChannelTracker.set(user, channelLogs);

const uniqueChannels = new Set(channelLogs.map(x => x.channel));

if (uniqueChannels.size >= 3) {

await message.delete().catch(()=>{});

await message.guild.members.kick(user, "Malicious spam across channels");

await sendLog(message, "KICK", "Multi channel spam");

await message.channel.send({
embeds: [kickEmbed(message.author, "Malicious spam across multiple channels")]
});

return;
}

/* =========================
   IMAGE RAID CHECK
========================= */

if (message.attachments.size > 0) {

let logs = imageRaidTracker.get(user) || [];

logs = logs.filter(x => now - x.time < 10000);

logs.push({
channel: channel,
time: now
});

imageRaidTracker.set(user, logs);

const uniqueImageChannels = new Set(logs.map(x => x.channel));

if (uniqueImageChannels.size >= 3) {

await message.delete().catch(()=>{});

await message.guild.members.kick(user, "Image spam across channels");

await sendLog(message, "KICK", "Image raid detected");

await message.channel.send({
embeds: [kickEmbed(message.author, "Image spam across multiple channels")]
});

return;
}
}

/* =========================
   SMART SPAM DETECTION
========================= */

let spamLogs = spamTracker.get(user) || [];

spamLogs = spamLogs.filter(x => now - x.time < 5000);

spamLogs.push({
content: content,
time: now
});

spamTracker.set(user, spamLogs);

const sameMessages = spamLogs.filter(x => x.content === content);

if (sameMessages.length >= 3) {

await message.delete().catch(()=>{});
await sendWarn(message, "Repeated spam message");
return;

}

if (spamLogs.length >= 6) {

await message.delete().catch(()=>{});
await sendWarn(message, "Message spam detected");
return;

}

/* =========================
   RACIST WORD FILTER
========================= */

const racist = [
"nigger","bakla","pokpok","nigga","niga",
"faggot","bayot","bading","badingan",
"tomboy","tomboyz","negro","negra"
];

if (racist.some(w => content.includes(w))) {

await message.delete().catch(()=>{});
await sendWarn(message, "Racist language");
return;

}

/* =========================
   SCAM FILTER
========================= */

const scams = [
"free nitro",
"steam giveaway",
"claim reward",
"crypto bonus"
];

if (scams.some(w => content.includes(w))) {

await message.delete().catch(()=>{});
await sendWarn(message, "Scam message");
return;

}

/* =========================
   MESSAGE RAID CHECK
========================= */

let raidLogs = raidTracker.get(user) || [];

raidLogs = raidLogs.filter(t => now - t < 8000);

raidLogs.push(now);

raidTracker.set(user, raidLogs);

if (raidLogs.length >= 7) {

await message.delete().catch(()=>{});

await message.guild.members.kick(user, "Spam raid");

await sendLog(message, "KICK", "Spam raid detected");

await message.channel.send({
embeds: [kickEmbed(message.author, "Spam raid detected")]
});

}

};

/* =========================
   MEMORY CLEANUP
========================= */

setInterval(() => {

spamTracker.clear();
raidTracker.clear();
imageRaidTracker.clear();
multiChannelTracker.clear();

}, 600000);