// Made / Edited by @Maxine

require("dotenv").config();

const fs = require("fs");
const path = require("path");
const messageFilter = require("./interactions/messageFilter");

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

client.on("messageCreate", async (message) => {
  try {
    await messageFilter(message);
  } catch (error) {
    console.error("❌ Message filter error:", error);
  }
});

process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

/* ===============================
   LOAD BUTTON & MODAL HANDLERS
   =============================== */

const buttonHandlers = [
  require("./interactions/buttons"),
  require("./interactions/nameChangeButtons"),
  require("./interactions/roleRequestButtons")
];

const modalHandlers = [
  require("./interactions/modals"),
  require("./interactions/nameChangeModals"),
  require("./interactions/roleRequestModals")
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

/*   READY - RESTART THE BOT   */

  client.once(Events.ClientReady, async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  const restartChannels = [
    "1470750976368578630",
    "1464856733145895129",
    "1469617732206203039"
  ];

  try {
    const channel = await client.channels.fetch(restartChannel);

    await channel.send({
      content: "✅ **Gatekeeper is now back online.**"
    });

  } catch (err) {
    console.error("Failed to send restart confirmation:", err);
  }
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

        if (interaction.replied || interaction.deferred) break;
      }
    }

    // MODALS
    else if (interaction.isModalSubmit()) {
      for (const handler of modalHandlers) {
        await handler(interaction);

        if (interaction.replied || interaction.deferred) break;
      }
    }

  } catch (error) {
    console.error("❌ Interaction error:", error);

    // SAFE ERROR RESPONSE (prevents Unknown Interaction)
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "❌ An unexpected error occurred.",
          flags: 64
        });
      }
    } catch (err) {
      console.error("❌ Failed to respond to interaction:", err);
    }
  }
});

/* ===============================
   LOGIN
   =============================== */

client.login(process.env.TOKEN);