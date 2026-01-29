import { pgTable, text, serial, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === MANAGED BOTS ===
export const bots = pgTable("bots", {
  id: serial("id").primaryKey(),
  token: text("token").notNull(),
  ownerId: text("owner_id").notNull(), // The "Buyer" Discord ID
  clientId: text("client_id"), // The Bot's Client ID (filled after login)
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
  owners: text("owners").array().default([]), // Additional owners added by buyer
  whitelist: text("whitelist").array().default([]),
  blacklist: text("blacklist").array().default([]),
  
  // Modules / Toggles
  antiraid: boolean("antiraid").default(false),
  antilink: boolean("antilink").default(false),
  antispam: boolean("antispam").default(false),
  modlogChannel: text("modlog_channel"),
  
  // Store badwords, etc as JSONB for flexibility
  config: jsonb("config").default({}), 
});

export const insertBotSchema = createInsertSchema(bots);
export type InsertBot = z.infer<typeof insertBotSchema>;
export type Bot = typeof bots.$inferSelect;

export const insertGuildSettingsSchema = createInsertSchema(guildSettings);
export type InsertGuildSettings = z.infer<typeof insertGuildSettingsSchema>;
export type GuildSettings = typeof guildSettings.$inferSelect;
