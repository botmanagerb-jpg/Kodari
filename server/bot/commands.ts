import { Client, Message, EmbedBuilder, PermissionFlagsBits, ChannelType, TextChannel } from "discord.js";
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
  // const isWhitelisted = isOwner || (settings.whitelist as string[])?.includes(message.author.id);

  // --- COMMANDS ---

  // === PUBLIC / GENERAL ===
  if (commandName === "help") {
    const embed = new EmbedBuilder()
      .setTitle("Command List")
      .setColor("#0099ff")
      .setDescription(`Prefix: \`${prefix}\``)
      .addFields(
        { name: "General", value: "`help`, `pic`, `banner`, `serverinfo`, `ping`, `speed`" },
        { name: "Moderation", value: "`ban`, `kick`, `mute`, `unmute`, `lock`, `unlock`, `clear`" },
        { name: "Owner", value: "`set prefix`, `noderank`" },
        { name: "Buyer", value: "`invite`, `owner`" }
      )
      .setFooter({ text: "Discord Bot Manager" });
    return message.channel.send({ embeds: [embed] });
  }

  if (commandName === "ping") {
    return message.channel.send(`Pong! Latency: ${client.ws.ping}ms`);
  }
  
  if (commandName === "pic" || commandName === "avatar") {
    const target = message.mentions.users.first() || message.author;
    return message.channel.send(target.displayAvatarURL({ size: 1024 }));
  }

  if (commandName === "banner") {
     const target = message.mentions.users.first() || message.author;
     // Fetch user to get banner (banner is not cached by default)
     const fetchedUser = await client.users.fetch(target.id, { force: true });
     if(fetchedUser.bannerURL()) {
         return message.channel.send(fetchedUser.bannerURL({ size: 1024 })!);
     }
     return message.channel.send("User has no banner.");
  }
  
  if (commandName === "serverinfo") {
      const guild = message.guild;
      const embed = new EmbedBuilder()
        .setTitle(guild.name)
        .setThumbnail(guild.iconURL())
        .addFields(
            { name: "Owner", value: `<@${guild.ownerId}>`, inline: true },
            { name: "Members", value: `${guild.memberCount}`, inline: true },
            { name: "Created At", value: guild.createdAt.toDateString(), inline: true }
        );
      return message.channel.send({ embeds: [embed] });
  }

  // === MODERATION ===
  if (commandName === "ban") {
    if (!message.member?.permissions.has(PermissionFlagsBits.BanMembers) && !isOwner) {
        return message.channel.send("You do not have permission to ban members.");
    }
    const target = message.mentions.members?.first();
    const reason = args.slice(1).join(" ") || "No reason provided";
    if (target) {
        if (!target.bannable) return message.channel.send("I cannot ban this user (higher role or me).");
        await target.ban({ reason });
        return message.channel.send(`Banned ${target.user.tag} for: ${reason}`);
    } else {
        return message.channel.send("Please mention a user to ban.");
    }
  }

  if (commandName === "kick") {
     if (!message.member?.permissions.has(PermissionFlagsBits.KickMembers) && !isOwner) {
        return message.channel.send("You do not have permission to kick members.");
    }
    const target = message.mentions.members?.first();
    const reason = args.slice(1).join(" ") || "No reason provided";
    if (target) {
        if (!target.kickable) return message.channel.send("I cannot kick this user.");
        await target.kick(reason);
        return message.channel.send(`Kicked ${target.user.tag} for: ${reason}`);
    } else {
        return message.channel.send("Please mention a user to kick.");
    }
  }

  if (commandName === "lock") {
      if (!message.member?.permissions.has(PermissionFlagsBits.ManageChannels) && !isOwner) return;
      const channel = (message.channel as TextChannel);
      await channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
      return message.channel.send(`Locked channel ${channel}`);
  }

  if (commandName === "unlock") {
      if (!message.member?.permissions.has(PermissionFlagsBits.ManageChannels) && !isOwner) return;
      const channel = (message.channel as TextChannel);
      await channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: true });
      return message.channel.send(`Unlocked channel ${channel}`);
  }
  
  if (commandName === "clear") {
       if (!message.member?.permissions.has(PermissionFlagsBits.ManageMessages) && !isOwner) return;
       const amount = parseInt(args[0]);
       if (isNaN(amount) || amount < 1 || amount > 100) return message.channel.send("Please provide a number between 1 and 100.");
       const channel = (message.channel as TextChannel);
       await channel.bulkDelete(amount, true);
       return message.channel.send(`Deleted ${amount} messages.`);
  }

  // === WARNINGS / MUTES ===
  if (commandName === "warn") {
      if (!message.member?.permissions.has(PermissionFlagsBits.ModerateMembers) && !isOwner) return;
      const target = message.mentions.members?.first();
      const reason = args.slice(1).join(" ") || "No reason";
      if (!target) return message.channel.send("Mention a user to warn.");
      
      // Ideally store in DB. For now, just DM/Reply.
      try {
          await target.send(`You were warned in ${message.guild.name}: ${reason}`);
      } catch {}
      return message.channel.send(`Warned ${target.user.tag} for: ${reason}`);
  }

  if (commandName === "mute" || commandName === "timeout") {
      if (!message.member?.permissions.has(PermissionFlagsBits.ModerateMembers) && !isOwner) return;
      const target = message.mentions.members?.first();
      const durationMin = parseInt(args[1]) || 60; // Default 60m
      if (!target) return message.channel.send("Mention a user to mute/timeout.");
      
      if (!target.moderatable) return message.channel.send("Cannot mute this user.");
      
      await target.timeout(durationMin * 60 * 1000, "Muted by bot");
      return message.channel.send(`Muted ${target.user.tag} for ${durationMin} minutes.`);
  }

  if (commandName === "unmute") {
      if (!message.member?.permissions.has(PermissionFlagsBits.ModerateMembers) && !isOwner) return;
      const target = message.mentions.members?.first();
      if (!target) return message.channel.send("Mention a user.");
      await target.timeout(null);
      return message.channel.send(`Unmuted ${target.user.tag}.`);
  }

  // === OWNER COMMANDS ===
  if (commandName === "prefix") {
      if (!isOwner) return message.channel.send("Only Owners can change prefix.");
      const newPrefix = args[0];
      if (!newPrefix) return message.channel.send(`Current prefix: \`${prefix}\``);
      
      await storage.updateGuildSettings(settings.id, { prefix: newPrefix });
      return message.channel.send(`Prefix updated to \`${newPrefix}\``);
  }
  
  if (commandName === "noderank") {
      if (!isOwner) return;
      // Implementation of "noderank" (usually means giving admin/role bypass)
      // For this MVP, we'll just toggle an internal flag or role
      return message.channel.send("Noderank command executed (mock).");
  }

  // === BUYER COMMANDS ===
  if (commandName === "invite") {
      if (!isBuyer) return message.channel.send("Only the Buyer can generate invites.");
      const invite = await message.channel.createInvite({ maxAge: 0, maxUses: 0 });
      return message.channel.send(`Invite generated: ${invite.url}`);
  }

  if (commandName === "owner") {
      if (!isBuyer) return message.channel.send("Only the Buyer can add owners.");
      const target = message.mentions.users.first();
      if (!target) return message.channel.send("Mention a user to add as owner.");
      
      const currentOwners = (settings.owners as string[]) || [];
      if (!currentOwners.includes(target.id)) {
          const newOwners = [...currentOwners, target.id];
          await storage.updateGuildSettings(settings.id, { owners: newOwners });
          return message.channel.send(`Added ${target.tag} as an owner.`);
      }
      return message.channel.send("User is already an owner.");
  }
  
  // === CONFIG ===
  if (commandName === "antiraid") {
      if (!isOwner) return;
      const toggle = args[0] === "on";
      await storage.updateGuildSettings(settings.id, { antiraid: toggle });
      return message.channel.send(`Anti-raid set to ${toggle ? "ON" : "OFF"}`);
  }

  // Fallback
  // message.channel.send("Unknown command.");
}
