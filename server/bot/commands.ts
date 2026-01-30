import { Client, Message, EmbedBuilder, PermissionFlagsBits, ChannelType, TextChannel, ActivityType, Role } from "discord.js";
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

  // Helper for custom perms
  const perms = (settings.permissions as any) || {};
  const hasCustomPerm = perms[commandName!] && (
    perms[commandName!].members?.includes(message.author.id) ||
    message.member?.roles.cache.some(r => perms[commandName!].roles?.includes(r.id))
  );

  if (!isWhitelist && !hasCustomPerm && !message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
      // Basic check: many commands need at least whitelist or specific custom perms
      // We'll allow help/ping/pic etc. to everyone unless restricted
  }

  // --- COMMANDS ---

  // HELP (Extended to include everything)
  if (commandName === "help") {
    const embed = new EmbedBuilder().setTitle("📜 Commandes Complètes").setColor("#5865F2")
      .addFields(
        { name: "Public", value: "`pic`, `banner`, `server pic`, `server banner`, `emoji`, `image`, `wiki`, `calc`, `suggestion`, `lb`, `ping`, `speed`, `allbots`, `botadmins`, `alladmins`, `boosters`, `rolemembers`, `serverinfo`, `inviteinfo`, `vocinfo`, `role`, `channel`, `user`, `member`" },
        { name: "Modération", value: "`sanctions`, `note`, `warn`, `mute`, `tempmute`, `unmute`, `cmute`, `tempcmute`, `uncmute`, `kick`, `ban`, `tempban`, `unban`, `banlist`, `nick`, `lock`, `unlock`, `lockall`, `unlockall`, `hide`, `unhide`, `hideall`, `unhideall`, `voicemove`, `voicekick`, `cleanup`" },
        { name: "Admin / Sécurité", value: "`prefix`, `owners`, `whitelist`, `antiraid`, `antilink`, `antispam`, `antimassmention`, `badwords`, `punish`, `modlog`, `messagelog`, `voicelog`, `boostlog`, `rolelog`, `set perm`, `del perm`, `slowmode`, `muterole`, `strikes`, `piconly`, `autothread`, `nolog`, `join settings`, `leave settings`, `boostembed`, `timeout`, `public`, `autodelete`, `sync`, `button`, `autoreact`, `autopublish`" },
        { name: "Propriétaire (Bot)", value: "`set name`, `set pic`, `set banner`, `set bio`, `stream`, `invisible`, `remove activity`, `server profil`, `backup`, `autobackup`, `theme`, `mp settings`, `server list`, `leave`, `discussion`, `mp`, `modmail`, `openmodmail`, `wl`, `bl`, `say`, `change`, `changeall`, `change reset`, `changelogs`, `alias`" },
        { name: "Buyer (Acheteur)", value: "`invite`, `secur invite`, `reset server`, `resetall`, `owner`, `unowner`, `clear owners`" }
      );
    return message.channel.send({ embeds: [embed] });
  }

  // Helper for sending embeds
  const sendEmbed = (content: string, color: any = "#5865F2") => {
    const embed = new EmbedBuilder().setDescription(content).setColor(color);
    return message.channel.send({ embeds: [embed] });
  };

  // --- DYNAMIC COMMANDS DISPATCH ---
  switch (commandName) {
    // PUBLIC
    case "pic": case "avatar": {
        const target = getMember(args[0])?.user || message.author;
        return message.channel.send(target.displayAvatarURL({ size: 1024 }));
    }
    case "banner": {
        const target = getMember(args[0])?.user || message.author;
        const user = await client.users.fetch(target.id, { force: true });
        return message.channel.send(user.bannerURL({ size: 1024 }) || "Aucune bannière.");
    }
    case "ping": case "speed": return sendEmbed(`🏓 Latence: ${client.ws.ping}ms`);
    case "serverinfo": {
        const g = message.guild;
        const embed = new EmbedBuilder().setTitle(g.name).setThumbnail(g.iconURL()).addFields(
            { name: "Propriétaire", value: `<@${g.ownerId}>`, inline: true },
            { name: "Membres", value: `${g.memberCount}`, inline: true },
            { name: "Rôles", value: `${g.roles.cache.size}`, inline: true }
        );
        return message.channel.send({ embeds: [embed] });
    }
    
    // MODERATION
    case "ban": {
        if (!isWhitelist && !message.member?.permissions.has(PermissionFlagsBits.BanMembers) && !hasCustomPerm) return;
        const target = getMember(args[0]);
        if (target?.bannable) await target.ban({ reason: args.slice(1).join(" ") });
        return sendEmbed(`🔨 Membre banni.`, "#FF0000");
    }
    case "kick": {
        if (!isWhitelist && !message.member?.permissions.has(PermissionFlagsBits.KickMembers) && !hasCustomPerm) return;
        const target = getMember(args[0]);
        if (target?.kickable) await target.kick(args.slice(1).join(" "));
        return sendEmbed(`👢 Membre expulsé.`, "#FFA500");
    }
    case "mute": case "cmute": {
        if (!isWhitelist && !message.member?.permissions.has(PermissionFlagsBits.ModerateMembers) && !hasCustomPerm) return;
        const target = getMember(args[0]);
        if (target) await target.timeout(24 * 60 * 60 * 1000, args.slice(1).join(" "));
        return sendEmbed(`🔇 Membre muet.`, "#FFFF00");
    }
    case "unmute": case "uncmute": {
        if (!isWhitelist && !message.member?.permissions.has(PermissionFlagsBits.ModerateMembers) && !hasCustomPerm) return;
        const target = getMember(args[0]);
        if (target) await target.timeout(null);
        return sendEmbed(`🔊 Sanction retirée.`, "#00FF00");
    }
    case "lock": {
        if (!isWhitelist && !hasCustomPerm) return;
        (message.channel as TextChannel).permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
        return sendEmbed("🔒 Salon verrouillé.");
    }
    case "unlock": {
        if (!isWhitelist && !hasCustomPerm) return;
        (message.channel as TextChannel).permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: true });
        return sendEmbed("🔓 Salon déverrouillé.");
    }
    case "clear": {
        if (!isWhitelist && !message.member?.permissions.has(PermissionFlagsBits.ManageMessages) && !hasCustomPerm) return;
        const amount = parseInt(args[0]) || 100;
        await (message.channel as TextChannel).bulkDelete(Math.min(amount, 100));
        return sendEmbed(`🧹 ${amount} messages supprimés.`);
    }

    // ADMIN / SETTINGS
    case "prefix": {
        if (!isOwner) return;
        if (!args[0]) return sendEmbed(`Préfixe: \`${prefix}\``);
        await storage.updateGuildSettings(settings.id, { prefix: args[0] });
        return sendEmbed(`✅ Préfixe mis à jour: \`${args[0]}\``);
    }
    case "wl": {
        if (!isOwner) return;
        const target = getMember(args[0]);
        if (!target) return sendEmbed("Liste Blanche: " + (settings.whitelist as string[] || []).join(", "));
        const wl = Array.from(new Set([...(settings.whitelist as string[] || []), target.id]));
        await storage.updateGuildSettings(settings.id, { whitelist: wl });
        return sendEmbed(`✅ ${target.user.tag} ajouté à la WL.`);
    }
    case "bl": {
        if (!isOwner) return;
        const target = getMember(args[0]);
        if (!target) return sendEmbed("Liste Noire: " + (settings.blacklist as string[] || []).join(", "));
        const bl = Array.from(new Set([...(settings.blacklist as string[] || []), target.id]));
        await storage.updateGuildSettings(settings.id, { blacklist: bl });
        return sendEmbed(`❌ ${target.user.tag} ajouté à la BL.`);
    }
    case "antiraid": {
        if (!isOwner) return;
        const mode = args[0] || "off";
        await storage.updateGuildSettings(settings.id, { antiraid: mode });
        return sendEmbed(`🛡️ Anti-raid: ${mode}`);
    }

    // BUYER
    case "owner": {
        if (!isBuyer) return;
        const target = getMember(args[0]);
        if (!target) return sendEmbed("Owners: " + (settings.owners as string[] || []).join(", "));
        const owners = Array.from(new Set([...(settings.owners as string[] || []), target.id]));
        await storage.updateGuildSettings(settings.id, { owners });
        return sendEmbed(`👑 ${target.user.tag} est maintenant Owner.`);
    }
    case "resetall": {
        if (!isBuyer) return;
        await storage.updateGuildSettings(settings.id, { prefix: "+", owners: [], whitelist: [], blacklist: [], antiraid: "off", permissions: {} });
        return sendEmbed("♻️ Réinitialisation complète effectuée.");
    }
  }

  // BOT OWNER (Special Profile Settings)
  if (isOwner) {
    if (commandName === "set" && args[0] === "name") {
        await client.user?.setUsername(args.slice(1).join(" "));
        return sendEmbed("✅ Nom du bot mis à jour.");
    }
    if (commandName === "set" && args[0] === "pic") {
        await client.user?.setAvatar(args[1] || message.attachments.first()?.url || "");
        return sendEmbed("✅ Photo de profil mise à jour.");
    }
    if (commandName === "stream") {
        client.user?.setActivity(args.join(" "), { type: ActivityType.Streaming, url: "https://twitch.tv/discord" });
        return sendEmbed("🎮 Statut de streaming mis à jour.");
    }
    if (commandName === "invisible") {
        client.user?.setStatus("invisible");
        return sendEmbed("👻 Le bot est maintenant invisible.");
    }
  }
}
