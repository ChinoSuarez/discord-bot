// Made / Edited by @Maxine

require("dotenv").config();

const fs = require("fs");
const path = require("path");

const {
  Client,
  Collection,
  GatewayIntentBits,
  Events
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

/* ===============================
   LOAD BUTTON & MODAL HANDLERS
   (FLAT STRUCTURE)
   =============================== */

const buttonHandlers = [
  require("./interactions/buttons"),
  require("./interactions/nameChangeButtons")
];

const modalHandlers = [
  require("./interactions/modals"),
  require("./interactions/nameChangeModals")
];

/* ===============================
   SLASH COMMANDS
   =============================== */

client.commands = new Collection();

const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);

  if ("data" in command && "execute" in command) {
    client.commands.set(command.data.name, command);
  }
}

/* ===============================
   READY
   =============================== */

client.once(Events.ClientReady, () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

/* ===============================
   INTERACTION HANDLER
   =============================== */

client.on(Events.InteractionCreate, async interaction => {
  try {

    // SLASH COMMANDS
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      await command.execute(interaction);
    }

    // BUTTONS
    else if (interaction.isButton()) {
      for (const handler of buttonHandlers) {
        await handler(interaction);
      }
    }

    // MODALS
    else if (interaction.isModalSubmit()) {
      for (const handler of modalHandlers) {
        await handler(interaction);
      }
    }

  } catch (error) {
    console.error("❌ Interaction error:", error);

    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({
          content: "❌ An unexpected error occurred."
        });
      } else {
        await interaction.reply({
          content: "❌ An unexpected error occurred."
        });
      }
    } catch (err) {
      console.error("❌ Failed to send error response:", err);
    }
  }
});

/* ===============================
   LOGIN
   =============================== */

client.login(process.env.TOKEN);