import { sql } from "drizzle-orm";
import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === MANAGED BOTS ===
export const bots = pgTable("bots", {
  id: serial("id").primaryKey(),
  token: text("token").notNull(),
  ownerId: text("owner_id").notNull(), // The "Buyer" Discord ID
  clientId: text("client_id"), 
  username: text("username"),
  status: text("status").default("active"),
  createdAt: text("created_at").default(new Date().toISOString()),
});

// === GUILD SETTINGS ===
export const guildSettings = pgTable("guild_settings", {
  id: serial("id").primaryKey(),
  guildId: text("guild_id").notNull(),
  botId: integer("bot_id").references(() => bots.id),
  prefix: text("prefix").default("+"),
  owners: text("owners").array().default([]),
  whitelist: text("whitelist").array().default([]),
  blacklist: text("blacklist").array().default([]),
  
  // Security Toggles
  antiraid: text("antiraid").default("off"), // off, min, max
  antilink: boolean("antilink").default(false),
  antispam: boolean("antispam").default(false),
  antimassmention: boolean("antimassmention").default(false),
  badwords: boolean("badwords").default(false),
  
  // Channels
  modlogChannel: text("modlog_channel"),
  messagelogChannel: text("messagelog_channel"),
  voicelogChannel: text("voicelog_channel"),
  raidlogChannel: text("raidlog_channel"),
  
  // Roles
  muterole: text("muterole"),
  raidpingRole: text("raidping_role"),
  
  // Custom Permissions
  permissions: jsonb("permissions").default({}), // { "command": { "roles": [], "members": [] } }
  
  // Limits & Config
  config: jsonb("config").default({
    badwords: [],
    spamLimit: 5,
    spamDuration: 5000,
    massMentionLimit: 5,
    creationLimit: 0,
    punishment: "derank", // derank, kick, ban
  }), 
});

// === SANCTIONS ===
export const sanctions = pgTable("sanctions", {
  id: serial("id").primaryKey(),
  guildId: text("guild_id").notNull(),
  botId: integer("bot_id").references(() => bots.id),
  userId: text("user_id").notNull(),
  type: text("type").notNull(), // warn, mute, kick, ban
  reason: text("reason").default("No reason provided"),
  moderatorId: text("moderator_id").notNull(),
  duration: integer("duration"), // in ms for temp sanctions
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// === BACKUPS ===
export const backups = pgTable("backups", {
  id: serial("id").primaryKey(),
  guildId: text("guild_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(), // server, emoji
  data: jsonb("data").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBotSchema = createInsertSchema(bots);
export type InsertBot = z.infer<typeof insertBotSchema>;
export type Bot = typeof bots.$inferSelect;

export const insertGuildSettingsSchema = createInsertSchema(guildSettings);
export type InsertGuildSettings = z.infer<typeof insertGuildSettingsSchema>;
export type GuildSettings = typeof guildSettings.$inferSelect;

export const insertSanctionSchema = createInsertSchema(sanctions);
export type Sanction = typeof sanctions.$inferSelect;

export const insertBackupSchema = createInsertSchema(backups);
export type Backup = typeof backups.$inferSelect;
