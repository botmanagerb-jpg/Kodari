import { Client, Message, EmbedBuilder, PermissionFlagsBits, ChannelType, TextChannel, User, GuildMember, Role } from "discord.js";
import { storage } from "../storage";
import { Bot, GuildSettings } from "@shared/schema";

// Helper to check permissions/roles
async function getSettings(guildId: string, botId: number): Promise<GuildSettings> {
  let settings = await storage.getGuildSettings(guildId, botId);
  if (!settings) {
    settings = await storage.createGuildSettings({
      guildId,
      botId,
      prefix: "+",
      owners: [],
      whitelist: [],
    });
  }
  return settings;
}

// Helper to parse duration (e.g., 1h, 30m, 1d)
function parseDuration(str: string): number {
  const match = str.match(/^(\d+)([smhd])$/);
  if (!match) return 0;
  const val = parseInt(match[1]);
  const unit = match[2];
  switch (unit) {
    case 's': return val * 1000;
    case 'm': return val * 60 * 1000;
    case 'h': return val * 60 * 60 * 1000;
    case 'd': return val * 24 * 60 * 60 * 1000;
    default: return 0;
  }
}

// === COMMAND HANDLER ===
export async function handleMessage(client: Client, message: Message, botData: Bot) {
  if (message.author.bot || !message.guild) return;

  const settings = await getSettings(message.guild.id, botData.id);
  const prefix = settings.prefix || "+";

  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const commandName = args.shift()?.toLowerCase();

  if (!commandName) return;

  // --- PERMISSION CHECKS ---
  const isBuyer = message.author.id === botData.ownerId;
  const isOwner = isBuyer || (settings.owners as string[])?.includes(message.author.id);
  const isWhitelist = isOwner || (settings.whitelist as string[])?.includes(message.author.id);

  // --- HELPER FOR TARGETS ---
  const getTarget = (input: string) => {
    return message.mentions.members?.first() || message.guild?.members.cache.get(input);
  };

  // === COMMANDS ===

  // General
  if (commandName === "help") {
    const embed = new EmbedBuilder()
      .setTitle("📚 Command List")
      .setColor("#0099ff")
      .addFields(
        { name: "General", value: "`help`, `pic`, `banner`, `server pic`, `server banner`, `ping`, `speed`, `serverinfo`, `user`, `member`" },
        { name: "Moderation", value: "`ban`, `kick`, `mute`, `unmute`, `lock`, `unlock`, `hide`, `unhide`, `clear`, `nick`, `slowmode`" },
        { name: "Owner", value: "`prefix`, `noderank`, `antiraid`, `set name`, `set pic`, `set banner`, `stream`, `invisible`, `wl`, `bl`" },
        { name: "Buyer", value: "`invite`, `owner`, `unowner`, `clear owners`, `resetall`" }
      );
    return message.channel.send({ embeds: [embed] });
  }

  if (commandName === "ping" || commandName === "speed") {
    return message.channel.send(`🏓 Pong! Latency: ${client.ws.ping}ms`);
  }

  // Info Commands
  if (commandName === "pic" || commandName === "avatar") {
    const target = getTarget(args[0] || "")?.user || message.author;
    return message.channel.send(target.displayAvatarURL({ size: 1024 }));
  }

  if (commandName === "banner") {
    const target = getTarget(args[0] || "")?.user || message.author;
    const fetchedUser = await client.users.fetch(target.id, { force: true });
    return message.channel.send(fetchedUser.bannerURL({ size: 1024 }) || "No banner found.");
  }

  if (commandName === "server" && args[0] === "pic") {
    return message.channel.send(message.guild.iconURL({ size: 1024 }) || "No server icon.");
  }

  if (commandName === "server" && args[0] === "banner") {
    return message.channel.send(message.guild.bannerURL({ size: 1024 }) || "No server banner.");
  }

  if (commandName === "user" || commandName === "member") {
    const target = getTarget(args[0] || "") || message.member!;
    const embed = new EmbedBuilder()
      .setTitle(`Info for ${target.user.tag}`)
      .setThumbnail(target.displayAvatarURL())
      .addFields(
        { name: "ID", value: target.id, inline: true },
        { name: "Joined", value: target.joinedAt?.toDateString() || "Unknown", inline: true },
        { name: "Roles", value: target.roles.cache.map(r => r.name).join(", ") || "None" }
      );
    return message.channel.send({ embeds: [embed] });
  }

  // Moderation
  if (commandName === "ban") {
    if (!message.member?.permissions.has(PermissionFlagsBits.BanMembers) && !isOwner) return;
    const target = getTarget(args[0]);
    if (!target || !target.bannable) return message.channel.send("Cannot ban this user.");
    await target.ban({ reason: args.slice(1).join(" ") || "No reason" });
    return message.channel.send(`🔨 Banned ${target.user.tag}`);
  }

  if (commandName === "kick") {
    if (!message.member?.permissions.has(PermissionFlagsBits.KickMembers) && !isOwner) return;
    const target = getTarget(args[0]);
    if (!target || !target.kickable) return message.channel.send("Cannot kick this user.");
    await target.kick(args.slice(1).join(" ") || "No reason");
    return message.channel.send(`👢 Kicked ${target.user.tag}`);
  }

  if (commandName === "mute") {
    if (!message.member?.permissions.has(PermissionFlagsBits.ModerateMembers) && !isOwner) return;
    const target = getTarget(args[0]);
    if (!target) return message.channel.send("Specify a member.");
    await target.timeout(24 * 60 * 60 * 1000, args.slice(1).join(" ") || "No reason");
    return message.channel.send(`🔇 Muted ${target.user.tag}`);
  }

  if (commandName === "unmute") {
    if (!message.member?.permissions.has(PermissionFlagsBits.ModerateMembers) && !isOwner) return;
    const target = getTarget(args[0]);
    if (!target) return message.channel.send("Specify a member.");
    await target.timeout(null);
    return message.channel.send(`🔊 Unmuted ${target.user.tag}`);
  }

  if (commandName === "lock") {
    if (!message.member?.permissions.has(PermissionFlagsBits.ManageChannels) && !isOwner) return;
    const channel = message.channel as TextChannel;
    await channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
    return message.channel.send("🔒 Channel locked.");
  }

  if (commandName === "unlock") {
    if (!message.member?.permissions.has(PermissionFlagsBits.ManageChannels) && !isOwner) return;
    const channel = message.channel as TextChannel;
    await channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: true });
    return message.channel.send("🔓 Channel unlocked.");
  }

  if (commandName === "clear") {
    if (!message.member?.permissions.has(PermissionFlagsBits.ManageMessages) && !isOwner) return;
    const amount = parseInt(args[0]) || 100;
    await (message.channel as TextChannel).bulkDelete(Math.min(amount, 100), true);
    return message.channel.send(`🧹 Cleared ${amount} messages.`).then(m => setTimeout(() => m.delete(), 3000));
  }

  // Owner/Buyer
  if (commandName === "prefix") {
    if (!isOwner) return;
    if (!args[0]) return message.channel.send(`Prefix is \`${prefix}\``);
    await storage.updateGuildSettings(settings.id, { prefix: args[0] });
    return message.channel.send(`✅ Prefix set to \`${args[0]}\``);
  }

  if (commandName === "owner") {
    if (!isBuyer) return;
    const target = getTarget(args[0]);
    if (!target) return message.channel.send("Mention a user.");
    const owners = [...(settings.owners as string[] || []), target.id];
    await storage.updateGuildSettings(settings.id, { owners: Array.from(new Set(owners)) });
    return message.channel.send(`👑 Added ${target.user.tag} as owner.`);
  }

  if (commandName === "unowner") {
    if (!isBuyer) return;
    const target = getTarget(args[0]);
    if (!target) return message.channel.send("Mention a user.");
    const owners = (settings.owners as string[] || []).filter(id => id !== target.id);
    await storage.updateGuildSettings(settings.id, { owners });
    return message.channel.send(`❌ Removed ${target.user.tag} from owners.`);
  }

  if (commandName === "set" && args[0] === "name") {
    if (!isOwner) return;
    await client.user?.setUsername(args.slice(1).join(" "));
    return message.channel.send("✅ Name updated.");
  }

  if (commandName === "set" && args[0] === "pic") {
    if (!isOwner) return;
    await client.user?.setAvatar(args[1] || message.attachments.first()?.url || "");
    return message.channel.send("✅ Picture updated.");
  }

  if (commandName === "stream") {
    if (!isOwner) return;
    client.user?.setActivity(args.join(" "), { type: ActivityType.Streaming, url: "https://twitch.tv/discord" });
    return message.channel.send("🎮 Streaming status set.");
  }

  if (commandName === "invisible") {
    if (!isOwner) return;
    client.user?.setStatus('invisible');
    return message.channel.send("👻 Status set to invisible.");
  }
}

const ActivityType = {
  Playing: 0,
  Streaming: 1,
  Listening: 2,
  Watching: 3,
  Competing: 5
};
