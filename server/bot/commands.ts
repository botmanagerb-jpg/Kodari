import { Client, Message, EmbedBuilder, PermissionFlagsBits, ChannelType, TextChannel, ActivityType, GuildMember, Role, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { storage } from "../storage";
import { Bot, GuildSettings } from "@shared/schema";

async function getSettings(guildId: string, botId: number): Promise<GuildSettings> {
  let settings = await storage.getGuildSettings(guildId, botId);
  if (!settings) {
    settings = await storage.createGuildSettings({
      guildId, botId, prefix: "+", owners: [], whitelist: [], config: { badwords: [], spamLimit: 5, spamDuration: 5000, massMentionLimit: 5, punishment: "derank" }
    });
  }
  return settings;
}

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

export async function handleMessage(client: Client, message: Message, botData: Bot) {
  if (message.author.bot || !message.guild) return;

  const settings = await getSettings(message.guild.id, botData.id);
  const prefix = settings.prefix || "+";

  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const commandName = args.shift()?.toLowerCase();
  if (!commandName) return;

  const isBuyer = message.author.id === botData.ownerId;
  const isOwner = isBuyer || (settings.owners as string[])?.includes(message.author.id);
  const isWhitelist = isOwner || (settings.whitelist as string[])?.includes(message.author.id);

  const getMember = (input: string) => message.mentions.members?.first() || message.guild?.members.cache.get(input);
  const getRole = (input: string) => message.mentions.roles?.first() || message.guild?.roles.cache.get(input);

  // --- COMMANDS ---

  // HELP
  if (commandName === "help") {
    const embed = new EmbedBuilder().setTitle("📜 Commands").setColor("#5865F2")
      .addFields(
        { name: "Public", value: "`pic`, `banner`, `server pic`, `ping`, `speed`, `calc`, `user`, `member`, `wiki`, `suggestion`, `lb`" },
        { name: "Moderation", value: "`ban`, `kick`, `mute`, `unmute`, `lock`, `unlock`, `clear`, `nick`, `slowmode`, `warn`, `note`, `sanctions`, `tempmute`, `unban`" },
        { name: "Settings/Admin", value: "`prefix`, `owners`, `whitelist`, `antiraid`, `antilink`, `antispam`, `badwords`, `punish`, `modlog`" },
        { name: "Bot Customization", value: "`set name`, `set pic`, `stream`, `invisible`, `set bio`" }
      );
    return message.channel.send({ embeds: [embed] });
  }

  // PUBLIC
  if (commandName === "pic" || commandName === "avatar") {
    const target = getMember(args[0])?.user || message.author;
    return message.channel.send(target.displayAvatarURL({ size: 1024 }));
  }
  if (commandName === "banner") {
    const target = getMember(args[0])?.user || message.author;
    const user = await client.users.fetch(target.id, { force: true });
    return message.channel.send(user.bannerURL({ size: 1024 }) || "No banner.");
  }
  if (commandName === "ping" || commandName === "speed") return message.channel.send(`🏓 ${client.ws.ping}ms`);
  
  if (commandName === "calc") {
    try { const result = eval(args.join("")); return message.channel.send(`Result: ${result}`); } 
    catch { return message.channel.send("Invalid calculation."); }
  }

  if (commandName === "suggestion") {
    const suggestion = args.join(" ");
    if (!suggestion) return message.channel.send("Usage: `+suggestion <message>`");
    return message.channel.send("✅ Suggestion sent!").then(() => {
        // Log suggestion to modlog or specific channel if configured
    });
  }

  // MODERATION
  if (commandName === "ban") {
    if (!isWhitelist && !message.member?.permissions.has(PermissionFlagsBits.BanMembers)) return;
    const target = getMember(args[0]);
    if (!target?.bannable) return message.channel.send("Invalid target.");
    await target.ban({ reason: args.slice(1).join(" ") || "No reason" });
    await storage.createSanction({ guildId: message.guild.id, botId: botData.id, userId: target.id, type: "ban", reason: args.slice(1).join(" "), moderatorId: message.author.id });
    return message.channel.send(`🔨 Banned ${target.user.tag}`);
  }

  if (commandName === "tempban") {
    if (!isWhitelist && !message.member?.permissions.has(PermissionFlagsBits.BanMembers)) return;
    const target = getMember(args[0]);
    const duration = parseDuration(args[1] || "");
    if (!target || !duration) return message.channel.send("Usage: `+tempban <membre> <durée> [raison]`");
    await target.ban({ reason: args.slice(2).join(" ") || "Tempban" });
    await storage.createSanction({ guildId: message.guild.id, botId: botData.id, userId: target.id, type: "tempban", reason: args.slice(2).join(" "), moderatorId: message.author.id, duration });
    return message.channel.send(`🔨 Temp-banned ${target.user.tag} for ${args[1]}`);
  }

  if (commandName === "mute") {
    if (!isWhitelist && !message.member?.permissions.has(PermissionFlagsBits.ModerateMembers)) return;
    const target = getMember(args[0]);
    if (!target) return message.channel.send("Specify a member.");
    await target.timeout(24 * 60 * 60 * 1000, args.slice(1).join(" "));
    await storage.createSanction({ guildId: message.guild.id, botId: botData.id, userId: target.id, type: "mute", reason: args.slice(1).join(" "), moderatorId: message.author.id });
    return message.channel.send(`🔇 Muted ${target.user.tag}`);
  }

  if (commandName === "tempmute") {
    if (!isWhitelist && !message.member?.permissions.has(PermissionFlagsBits.ModerateMembers)) return;
    const target = getMember(args[0]);
    const duration = parseDuration(args[1] || "");
    if (!target || !duration) return message.channel.send("Usage: `+tempmute <membre> <durée> [raison]`");
    await target.timeout(duration, args.slice(2).join(" "));
    return message.channel.send(`🔇 Temp-muted ${target.user.tag} for ${args[1]}`);
  }

  if (commandName === "unmute") {
    if (!isWhitelist && !message.member?.permissions.has(PermissionFlagsBits.ModerateMembers)) return;
    const target = getMember(args[0]);
    if (!target) return message.channel.send("Specify a member.");
    await target.timeout(null);
    return message.channel.send(`🔊 Unmuted ${target.user.tag}`);
  }

  if (commandName === "clear") {
    if (!isWhitelist && !message.member?.permissions.has(PermissionFlagsBits.ManageMessages)) return;
    const amount = parseInt(args[0]) || 100;
    await (message.channel as TextChannel).bulkDelete(Math.min(amount, 100));
    return message.channel.send(`🧹 Cleared ${amount} messages.`).then(m => setTimeout(() => m.delete(), 2000));
  }

  if (commandName === "lock") {
    if (!isWhitelist && !message.member?.permissions.has(PermissionFlagsBits.ManageChannels)) return;
    const channel = message.channel as TextChannel;
    await channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
    return message.channel.send("🔒 Channel locked.");
  }

  if (commandName === "unlock") {
    if (!isWhitelist && !message.member?.permissions.has(PermissionFlagsBits.ManageChannels)) return;
    const channel = message.channel as TextChannel;
    await channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: true });
    return message.channel.send("🔓 Channel unlocked.");
  }

  if (commandName === "warn") {
    if (!isWhitelist && !message.member?.permissions.has(PermissionFlagsBits.ModerateMembers)) return;
    const target = getMember(args[0]);
    if (!target) return message.channel.send("Mention user.");
    await storage.createSanction({ guildId: message.guild.id, botId: botData.id, userId: target.id, type: "warn", reason: args.slice(1).join(" "), moderatorId: message.author.id });
    return message.channel.send(`⚠️ Warned ${target.user.tag}`);
  }

  if (commandName === "sanctions") {
    const target = getMember(args[0]) || message.member!;
    const list = await storage.getSanctions(message.guild.id, target.id);
    if (!list.length) return message.channel.send("No sanctions found.");
    const embed = new EmbedBuilder().setTitle(`Sanctions for ${target.user.tag}`).setColor("#FF0000")
      .setDescription(list.map((s, i) => `${i+1}. [${s.type.toUpperCase()}] ${s.reason} - <@${s.moderatorId}>`).join("\n"));
    return message.channel.send({ embeds: [embed] });
  }

  // OWNER
  if (commandName === "prefix") {
    if (!isOwner) return;
    if (!args[0]) return message.channel.send(`Prefix: \`${prefix}\``);
    await storage.updateGuildSettings(settings.id, { prefix: args[0] });
    return message.channel.send(`✅ Prefix updated to \`${args[0]}\``);
  }

  if (commandName === "wl") {
    if (!isOwner) return;
    const target = getMember(args[0]);
    if (!target) {
        const list = (settings.whitelist as string[]) || [];
        return message.channel.send(`Whitelisted users: ${list.map(id => `<@${id}>`).join(", ") || "None"}`);
    }
    const wl = Array.from(new Set([...(settings.whitelist as string[] || []), target.id]));
    await storage.updateGuildSettings(settings.id, { whitelist: wl });
    return message.channel.send(`✅ Whitelisted ${target.user.tag}`);
  }

  if (commandName === "unwl") {
    if (!isOwner) return;
    const target = getMember(args[0]);
    if (!target) return message.channel.send("Mention user.");
    const wl = (settings.whitelist as string[] || []).filter(id => id !== target.id);
    await storage.updateGuildSettings(settings.id, { whitelist: wl });
    return message.channel.send(`❌ Un-whitelisted ${target.user.tag}`);
  }

  if (commandName === "antiraid") {
    if (!isOwner) return;
    const mode = args[0] || "off"; 
    await storage.updateGuildSettings(settings.id, { antiraid: mode });
    return message.channel.send(`🛡️ Anti-raid set to: ${mode}`);
  }

  if (commandName === "antilink") {
    if (!isOwner) return;
    const toggle = args[0] === "on";
    await storage.updateGuildSettings(settings.id, { antilink: toggle });
    return message.channel.send(`🔗 Anti-link set to ${toggle ? "ON" : "OFF"}`);
  }

  if (commandName === "antispam") {
    if (!isOwner) return;
    const toggle = args[0] === "on";
    await storage.updateGuildSettings(settings.id, { antispam: toggle });
    return message.channel.send(`⌨️ Anti-spam set to ${toggle ? "ON" : "OFF"}`);
  }

  if (commandName === "badwords") {
    if (!isOwner) return;
    if (args[0] === "add") {
        const word = args[1];
        const config = (settings.config as any) || {};
        config.badwords = Array.from(new Set([...(config.badwords || []), word]));
        await storage.updateGuildSettings(settings.id, { config });
        return message.channel.send(`✅ Added \`${word}\` to badwords.`);
    }
    const toggle = args[0] === "on";
    await storage.updateGuildSettings(settings.id, { badwords: toggle });
    return message.channel.send(`🚫 Badwords filter set to ${toggle ? "ON" : "OFF"}`);
  }

  if (commandName === "set" && args[0] === "name") {
    if (!isOwner) return;
    await client.user?.setUsername(args.slice(1).join(" "));
    return message.channel.send("✅ Bot name updated.");
  }

  if (commandName === "set" && args[0] === "pic") {
    if (!isOwner) return;
    const url = args[1] || message.attachments.first()?.url;
    if (!url) return message.channel.send("Provide image URL or attachment.");
    await client.user?.setAvatar(url);
    return message.channel.send("✅ Bot picture updated.");
  }

  if (commandName === "stream") {
    if (!isOwner) return;
    client.user?.setActivity(args.join(" "), { type: ActivityType.Streaming, url: "https://twitch.tv/discord" });
    return message.channel.send("🎮 Status set to Streaming.");
  }

  if (commandName === "invisible") {
    if (!isOwner) return;
    client.user?.setStatus("invisible");
    return message.channel.send("👻 Bot is now invisible.");
  }

  // BUYER
  if (commandName === "owner") {
    if (!isBuyer) return;
    const target = getMember(args[0]);
    if (!target) {
        const list = (settings.owners as string[]) || [];
        return message.channel.send(`Owners: ${list.map(id => `<@${id}>`).join(", ") || "None"}`);
    }
    const owners = Array.from(new Set([...(settings.owners as string[] || []), target.id]));
    await storage.updateGuildSettings(settings.id, { owners });
    return message.channel.send(`👑 Added ${target.user.tag} as owner.`);
  }

  if (commandName === "unowner") {
    if (!isBuyer) return;
    const target = getMember(args[0]);
    if (!target) return message.channel.send("Mention user.");
    const owners = (settings.owners as string[] || []).filter(id => id !== target.id);
    await storage.updateGuildSettings(settings.id, { owners });
    return message.channel.send(`❌ Removed ${target.user.tag} from owners.`);
  }

  if (commandName === "resetall") {
    if (!isBuyer) return;
    await storage.updateGuildSettings(settings.id, { owners: [], whitelist: [], prefix: "+", antiraid: "off", antilink: false, antispam: false, badwords: false });
    return message.channel.send("♻️ All settings have been reset.");
  }
}
