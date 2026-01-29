import { db } from "./db";
import {
  bots,
  guildSettings,
  type InsertBot,
  type Bot,
  type InsertGuildSettings,
  type GuildSettings
} from "@shared/schema";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  // Bots
  getBots(): Promise<Bot[]>;
  getBotByToken(token: string): Promise<Bot | undefined>;
  createBot(bot: InsertBot): Promise<Bot>;
  updateBotStatus(id: number, status: string): Promise<Bot>;
  
  // Settings
  getGuildSettings(guildId: string, botId: number): Promise<GuildSettings | undefined>;
  createGuildSettings(settings: InsertGuildSettings): Promise<GuildSettings>;
  updateGuildSettings(id: number, settings: Partial<InsertGuildSettings>): Promise<GuildSettings>;
}

export class DatabaseStorage implements IStorage {
  async getBots(): Promise<Bot[]> {
    return await db.select().from(bots);
  }

  async getBotByToken(token: string): Promise<Bot | undefined> {
    const [bot] = await db.select().from(bots).where(eq(bots.token, token));
    return bot;
  }

  async createBot(insertBot: InsertBot): Promise<Bot> {
    const [bot] = await db.insert(bots).values(insertBot).returning();
    return bot;
  }

  async updateBotStatus(id: number, status: string): Promise<Bot> {
    const [bot] = await db.update(bots)
      .set({ status })
      .where(eq(bots.id, id))
      .returning();
    return bot;
  }

  async getGuildSettings(guildId: string, botId: number): Promise<GuildSettings | undefined> {
    const [settings] = await db.select().from(guildSettings)
      .where(and(
        eq(guildSettings.guildId, guildId),
        eq(guildSettings.botId, botId)
      ));
    return settings;
  }

  async createGuildSettings(settings: InsertGuildSettings): Promise<GuildSettings> {
    const [created] = await db.insert(guildSettings).values(settings).returning();
    return created;
  }

  async updateGuildSettings(id: number, settings: Partial<InsertGuildSettings>): Promise<GuildSettings> {
    const [updated] = await db.update(guildSettings)
      .set(settings)
      .where(eq(guildSettings.id, id))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
