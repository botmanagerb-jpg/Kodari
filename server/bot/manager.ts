import { Client, GatewayIntentBits, Partials, ActivityType } from "discord.js";
import { storage } from "../storage";
import { handleMessage } from "./commands";
import { Bot } from "@shared/schema";

// Map to hold running client instances: token -> Client
const activeBots = new Map<string, Client>();

// --- MANAGER BOT ---
// The main bot that listens for "+login"
let managerClient: Client | null = null;
let loginAllowedRoles: string[] = []; // Simple in-memory for now or move to config

export async function startManager() {
  const token = process.env.DISCORD_TOKEN; // Main manager token
  if (!token) {
    console.log("No DISCORD_TOKEN found for Manager Bot. Skipping Manager start.");
  } else {
    managerClient = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
      ],
      partials: [Partials.Channel],
    });

    managerClient.on("ready", () => {
      console.log(`Manager Bot Logged in as ${managerClient?.user?.tag}`);
    });

    managerClient.on("messageCreate", async (message) => {
      if (message.author.bot) return;

      // Handle /set for manager (using + prefix for manager for simplicity as requested commands were +)
      if (message.content.startsWith("+set loginrole")) {
          // Simplified security: only bot owner or admin can set this
          if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) return;
          const role = message.mentions.roles.first() || message.guild?.roles.cache.get(message.content.split(" ")[2]);
          if (role) {
              loginAllowedRoles = [role.id];
              return message.reply(`✅ Rôle autorisé pour +login : ${role.name}`);
          }
      }

      // Handle +login command
      if (message.content.startsWith("+login")) {
        // Check permissions
        if (loginAllowedRoles.length > 0) {
            const hasRole = message.member?.roles.cache.some(r => loginAllowedRoles.includes(r.id));
            if (!hasRole && !message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
                return message.reply("❌ Vous n'avez pas le rôle requis pour utiliser cette commande.");
            }
        }
        const args = message.content.slice(6).trim().split(/ +/);
        const childToken = args[0];

        if (!childToken) {
           return message.reply("Usage: `+login <BOT_TOKEN>`");
        }

        try {
          // Check if already exists
          const existing = await storage.getBotByToken(childToken);
          if (existing) {
             return message.reply("This bot is already connected.");
          }

          // Verify token by trying to login (dry run)
          const testClient = new Client({ intents: [] });
          await testClient.login(childToken);
          const botId = testClient.user?.id;
          const botUsername = testClient.user?.username;
          testClient.destroy();

          // Save to DB
          const newBot = await storage.createBot({
            token: childToken,
            ownerId: message.author.id,
            clientId: botId,
            username: botUsername,
            status: "active"
          });

          // Start it
          await spawnBot(newBot);

          return message.reply(`✅ Bot **${botUsername}** successfully connected! You are now the buyer.`);
        } catch (error) {
          console.error("Login failed:", error);
          return message.reply("❌ Invalid Token or Connection Failed.");
        }
      }
    });

    try {
      await managerClient.login(token);
    } catch (e) {
      console.error("Manager Bot failed to login:", e);
    }
  }

  // Start all saved bots
  const bots = await storage.getBots();
  console.log(`Starting ${bots.length} managed bots...`);
  for (const bot of bots) {
    if (bot.status === "active") {
      spawnBot(bot).catch(err => console.error(`Failed to spawn bot ${bot.id}:`, err));
    }
  }
}

// --- CHILD BOTS ---
async function spawnBot(botData: Bot) {
  if (activeBots.has(botData.token)) return;

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildPresences,
      GatewayIntentBits.GuildInvites,
    ],
  });

  client.on("ready", () => {
    console.log(`Managed Bot ${client.user?.tag} (Owner: ${botData.ownerId}) is online.`);
    client.user?.setActivity(`+help | Manager`, { type: ActivityType.Playing });
    activeBots.set(botData.token, client);
  });

  client.on("messageCreate", (message) => handleMessage(client, message, botData));
  
  client.on("error", (err) => console.error(`Bot ${botData.id} error:`, err));

  try {
    await client.login(botData.token);
  } catch (error) {
    console.error(`Failed to login managed bot ${botData.id}:`, error);
    // Optionally update status to 'error'
    await storage.updateBotStatus(botData.id, "error");
  }
}
