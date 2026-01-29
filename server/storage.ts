import { db } from "./db";
import {
  bots,
  guildSettings,
  sanctions,
  backups,
  type InsertBot,
  type Bot,
  type InsertGuildSettings,
  type GuildSettings,
  type Sanction,
  type Backup
} from "@shared/schema";
import { eq, and, gte, lte } from "drizzle-orm";

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

  // Sanctions
  createSanction(sanction: any): Promise<Sanction>;
  getSanctions(guildId: string, userId: string): Promise<Sanction[]>;
  clearSanctions(guildId: string, userId: string): Promise<void>;
  
  // Backups
  createBackup(backup: any): Promise<Backup>;
  getBackup(guildId: string, name: string): Promise<Backup | undefined>;
  listBackups(guildId: string): Promise<Backup[]>;
  deleteBackup(id: number): Promise<void>;
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

  async createSanction(sanction: any): Promise<Sanction> {
    const [created] = await db.insert(sanctions).values(sanction).returning();
    return created;
  }

  async getSanctions(guildId: string, userId: string): Promise<Sanction[]> {
    return await db.select().from(sanctions).where(and(eq(sanctions.guildId, guildId), eq(sanctions.userId, userId)));
  }

  async clearSanctions(guildId: string, userId: string): Promise<void> {
    await db.delete(sanctions).where(and(eq(sanctions.guildId, guildId), eq(sanctions.userId, userId)));
  }

  async createBackup(backup: any): Promise<Backup> {
    const [created] = await db.insert(backups).values(backup).returning();
    return created;
  }

  async getBackup(guildId: string, name: string): Promise<Backup | undefined> {
    const [backup] = await db.select().from(backups).where(and(eq(backups.guildId, guildId), eq(backups.name, name)));
    return backup;
  }

  async listBackups(guildId: string): Promise<Backup[]> {
    return await db.select().from(backups).where(eq(backups.guildId, guildId));
  }

  async deleteBackup(id: number): Promise<void> {
    await db.delete(backups).where(eq(backups.id, id));
  }
}

export const storage = new DatabaseStorage();
