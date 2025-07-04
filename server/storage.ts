import { config } from './config';
import { mockDb } from './mockDb';
import { 
  users, articles, newsletters, settings, activityLogs, schedules, socialMediaPosts, feedSources, dataBackups,
  type User, type InsertUser, type Article, type InsertArticle,
  type Newsletter, type InsertNewsletter, type Settings, type InsertSettings,
  type ActivityLog, type InsertActivityLog, type Schedule, type InsertSchedule,
  type SocialMediaPost, type InsertSocialMediaPost, type FeedSource, type InsertFeedSource,
  type DataBackup, type InsertDataBackup
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";

// Only import database if not using mock
let db: any = null;
if (!config.database.mock && process.env.DATABASE_URL) {
  try {
    const dbModule = require('./db');
    db = dbModule.db;
  } catch (error) {
    console.warn('Database not available, falling back to mock database');
  }
}

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Articles
  getArticles(): Promise<Article[]>;
  createArticle(article: InsertArticle): Promise<Article>;
  updateArticleSelection(id: number, selected: boolean): Promise<Article | undefined>;
  clearArticles(): Promise<void>;
  
  // Newsletters
  getNewsletters(): Promise<Newsletter[]>;
  getNewsletter(id: number): Promise<Newsletter | undefined>;
  getLatestNewsletter(): Promise<Newsletter | undefined>;
  createNewsletter(newsletter: InsertNewsletter): Promise<Newsletter>;
  updateNewsletter(id: number, updates: Partial<Newsletter>): Promise<Newsletter | undefined>;
  getNextIssueNumber(): Promise<number>;
  
  // Settings
  getSettings(): Promise<Settings | undefined>;
  updateSettings(settings: InsertSettings): Promise<Settings>;
  
  // Activity Logs
  getActivityLogs(): Promise<ActivityLog[]>;
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  clearActivityLogs(): Promise<void>;
  
  // Schedules
  getSchedules(): Promise<Schedule[]>;
  createSchedule(schedule: InsertSchedule): Promise<Schedule>;
  updateSchedule(id: number, updates: Partial<Schedule>): Promise<Schedule | undefined>;
  deleteSchedule(id: number): Promise<boolean>;
  getEnabledSchedules(): Promise<Schedule[]>;
  
  // Social Media Posts
  getSocialMediaPosts(): Promise<SocialMediaPost[]>;
  getSocialMediaPostsByNewsletter(newsletterId: number): Promise<SocialMediaPost[]>;
  createSocialMediaPost(post: InsertSocialMediaPost): Promise<SocialMediaPost>;
  updateSocialMediaPost(id: number, updates: Partial<SocialMediaPost>): Promise<SocialMediaPost | undefined>;
  deleteSocialMediaPost(id: number): Promise<boolean>;
  getScheduledSocialMediaPosts(): Promise<SocialMediaPost[]>;
  
  // Feed Sources
  getFeedSources(): Promise<FeedSource[]>;
  createFeedSource(feedSource: InsertFeedSource): Promise<FeedSource>;
  updateFeedSource(id: number, updates: Partial<FeedSource>): Promise<FeedSource | undefined>;
  deleteFeedSource(id: number): Promise<boolean>;
  getEnabledFeedSources(): Promise<FeedSource[]>;
  
  // Data Management
  createDataBackup(backup: InsertDataBackup): Promise<DataBackup>;
  getDataBackups(): Promise<DataBackup[]>;
  deleteDataBackup(id: number): Promise<boolean>;
  purgeAllData(): Promise<void>;
  exportAllData(): Promise<any>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private articles: Map<number, Article> = new Map();
  private newsletters: Map<number, Newsletter> = new Map();
  private currentSettings: Settings | undefined = undefined;
  private activityLogs: Map<number, ActivityLog> = new Map();
  private schedules: Map<number, Schedule> = new Map();
  private socialMediaPosts: Map<number, SocialMediaPost> = new Map();
  private feedSources: Map<number, FeedSource> = new Map();
  private dataBackups: Map<number, DataBackup> = new Map();
  private currentId = 1;
  private articleId = 1;
  private newsletterId = 1;
  private logId = 1;
  private scheduleId = 1;
  private socialMediaPostId = 1;
  private feedSourceId = 1;
  private backupId = 1;

  // Users
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Articles
  async getArticles(): Promise<Article[]> {
    return Array.from(this.articles.values()).sort((a, b) => 
      new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime()
    );
  }

  async createArticle(insertArticle: InsertArticle): Promise<Article> {
    const id = this.articleId++;
    const article: Article = { 
      ...insertArticle, 
      id, 
      content: insertArticle.content || null,
      selected: insertArticle.selected || null,
      fetchedAt: new Date()
    };
    this.articles.set(id, article);
    return article;
  }

  async updateArticleSelection(id: number, selected: boolean): Promise<Article | undefined> {
    const article = this.articles.get(id);
    if (article) {
      const updated = { ...article, selected };
      this.articles.set(id, updated);
      return updated;
    }
    return undefined;
  }

  async clearArticles(): Promise<void> {
    this.articles.clear();
  }

  // Newsletters
  async getNewsletters(): Promise<Newsletter[]> {
    return Array.from(this.newsletters.values()).sort((a, b) => b.issueNumber - a.issueNumber);
  }

  async getNewsletter(id: number): Promise<Newsletter | undefined> {
    return this.newsletters.get(id);
  }

  async getLatestNewsletter(): Promise<Newsletter | undefined> {
    const newsletters = await this.getNewsletters();
    return newsletters[0];
  }

  async createNewsletter(insertNewsletter: InsertNewsletter): Promise<Newsletter> {
    const id = this.newsletterId++;
    const newsletter: Newsletter = {
      ...insertNewsletter,
      id,
      status: insertNewsletter.status || "draft",
      frequency: insertNewsletter.frequency || "manual",
      scheduleTime: insertNewsletter.scheduleTime || null,
      approvalRequired: insertNewsletter.approvalRequired || false,
      approvalEmail: insertNewsletter.approvalEmail || null,
      approvedBy: insertNewsletter.approvedBy || null,
      approvedAt: null,
      htmlContent: insertNewsletter.htmlContent || null,
      beehiivId: insertNewsletter.beehiivId || null,
      beehiivUrl: insertNewsletter.beehiivUrl || null,
      wordCount: insertNewsletter.wordCount || null,
      generatedAt: new Date(),
      publishedAt: null,
    };
    this.newsletters.set(id, newsletter);
    return newsletter;
  }

  async updateNewsletter(id: number, updates: Partial<Newsletter>): Promise<Newsletter | undefined> {
    const newsletter = this.newsletters.get(id);
    if (newsletter) {
      const updated = { ...newsletter, ...updates };
      this.newsletters.set(id, updated);
      return updated;
    }
    return undefined;
  }

  async getNextIssueNumber(): Promise<number> {
    const latest = await this.getLatestNewsletter();
    const settings = await this.getSettings();
    return latest ? latest.issueNumber + 1 : (settings?.issueStartNumber || 1);
  }

  // Settings
  async getSettings(): Promise<Settings | undefined> {
    return this.currentSettings;
  }

  async updateSettings(insertSettings: InsertSettings): Promise<Settings> {
    const settings: Settings = {
      id: 1,
      claudeApiKey: insertSettings.claudeApiKey || null,
      claudeModel: insertSettings.claudeModel || null,
      claudeTemperature: insertSettings.claudeTemperature || null,
      claudeMaxTokens: insertSettings.claudeMaxTokens || null,
      beehiivApiKey: insertSettings.beehiivApiKey || null,
      beehiivPublicationId: insertSettings.beehiivPublicationId || null,
      newsletterTitle: insertSettings.newsletterTitle || null,
      issueStartNumber: insertSettings.issueStartNumber || null,
      defaultNewsSource: insertSettings.defaultNewsSource || null,
      sendgridApiKey: insertSettings.sendgridApiKey || null,
      approvalEmail: insertSettings.approvalEmail || null,
      approvalRequired: insertSettings.approvalRequired || false,
      dailyScheduleEnabled: insertSettings.dailyScheduleEnabled || false,
      dailyScheduleTime: insertSettings.dailyScheduleTime || "09:00",
      autoSelectArticles: insertSettings.autoSelectArticles || false,
      maxDailyArticles: insertSettings.maxDailyArticles || 5,
      updatedAt: new Date(),
    };
    this.currentSettings = settings;
    return settings;
  }

  // Activity Logs
  async getActivityLogs(): Promise<ActivityLog[]> {
    return Array.from(this.activityLogs.values()).sort((a, b) => 
      new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()
    );
  }

  async createActivityLog(insertLog: InsertActivityLog): Promise<ActivityLog> {
    const id = this.logId++;
    const log: ActivityLog = {
      id,
      message: insertLog.message,
      details: insertLog.details || null,
      type: insertLog.type,
      timestamp: new Date(),
    };
    this.activityLogs.set(id, log);
    return log;
  }

  async clearActivityLogs(): Promise<void> {
    this.activityLogs.clear();
  }

  // Schedules
  async getSchedules(): Promise<Schedule[]> {
    return Array.from(this.schedules.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  async createSchedule(insertSchedule: InsertSchedule): Promise<Schedule> {
    const id = this.scheduleId++;
    const schedule: Schedule = {
      id,
      name: insertSchedule.name,
      frequency: insertSchedule.frequency,
      time: insertSchedule.time,
      newsSourceUrl: insertSchedule.newsSourceUrl,
      maxArticles: insertSchedule.maxArticles || null,
      autoApprove: insertSchedule.autoApprove || false,
      enabled: insertSchedule.enabled || true,
      lastRun: null,
      nextRun: this.calculateNextRun(insertSchedule.frequency, insertSchedule.time),
      createdAt: new Date(),
    };
    this.schedules.set(id, schedule);
    return schedule;
  }

  async updateSchedule(id: number, updates: Partial<Schedule>): Promise<Schedule | undefined> {
    const schedule = this.schedules.get(id);
    if (schedule) {
      const updated = { ...schedule, ...updates };
      if (updates.frequency || updates.time) {
        updated.nextRun = this.calculateNextRun(updated.frequency, updated.time);
      }
      this.schedules.set(id, updated);
      return updated;
    }
    return undefined;
  }

  async deleteSchedule(id: number): Promise<boolean> {
    return this.schedules.delete(id);
  }

  async getEnabledSchedules(): Promise<Schedule[]> {
    return Array.from(this.schedules.values()).filter(s => s.enabled);
  }

  private calculateNextRun(frequency: string, time: string): Date {
    const now = new Date();
    const [hours, minutes] = time.split(':').map(Number);
    const nextRun = new Date(now);
    nextRun.setHours(hours, minutes, 0, 0);

    if (frequency === 'daily') {
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
    } else if (frequency === 'weekly') {
      nextRun.setDate(nextRun.getDate() + (7 - nextRun.getDay()));
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 7);
      }
    }

    return nextRun;
  }
}

// Database storage implementation
export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Articles
  async getArticles(): Promise<Article[]> {
    return await db.select().from(articles).orderBy(desc(articles.publishedDate));
  }

  async createArticle(insertArticle: InsertArticle): Promise<Article> {
    const [article] = await db
      .insert(articles)
      .values({
        title: insertArticle.title,
        content: insertArticle.content || null,
        source: insertArticle.source,
        url: insertArticle.url,
        publishedDate: insertArticle.publishedDate || new Date(),
        selected: insertArticle.selected || false,
      })
      .returning();
    return article;
  }

  async updateArticleSelection(id: number, selected: boolean): Promise<Article | undefined> {
    const [article] = await db
      .update(articles)
      .set({ selected })
      .where(eq(articles.id, id))
      .returning();
    return article || undefined;
  }

  async clearArticles(): Promise<void> {
    await db.delete(articles);
  }

  // Newsletters
  async getNewsletters(): Promise<Newsletter[]> {
    return await db.select().from(newsletters).orderBy(desc(newsletters.issueNumber));
  }

  async getNewsletter(id: number): Promise<Newsletter | undefined> {
    const [newsletter] = await db.select().from(newsletters).where(eq(newsletters.id, id));
    return newsletter || undefined;
  }

  async getLatestNewsletter(): Promise<Newsletter | undefined> {
    const [newsletter] = await db
      .select()
      .from(newsletters)
      .orderBy(desc(newsletters.issueNumber))
      .limit(1);
    return newsletter || undefined;
  }

  async createNewsletter(insertNewsletter: InsertNewsletter): Promise<Newsletter> {
    const [newsletter] = await db
      .insert(newsletters)
      .values({
        ...insertNewsletter,
        status: insertNewsletter.status || "draft",
        frequency: insertNewsletter.frequency || "manual",
        scheduleTime: insertNewsletter.scheduleTime || null,
        approvalRequired: insertNewsletter.approvalRequired || false,
        approvalEmail: insertNewsletter.approvalEmail || null,
        approvedBy: insertNewsletter.approvedBy || null,
        htmlContent: insertNewsletter.htmlContent || null,
        beehiivId: insertNewsletter.beehiivId || null,
        beehiivUrl: insertNewsletter.beehiivUrl || null,
        wordCount: insertNewsletter.wordCount || null,
      })
      .returning();
    return newsletter;
  }

  async updateNewsletter(id: number, updates: Partial<Newsletter>): Promise<Newsletter | undefined> {
    const [newsletter] = await db
      .update(newsletters)
      .set(updates)
      .where(eq(newsletters.id, id))
      .returning();
    return newsletter || undefined;
  }

  async getNextIssueNumber(): Promise<number> {
    const latest = await this.getLatestNewsletter();
    const settingsData = await this.getSettings();
    return latest ? latest.issueNumber + 1 : (settingsData?.issueStartNumber || 1);
  }

  // Settings
  async getSettings(): Promise<Settings | undefined> {
    const [settingsData] = await db.select().from(settings).limit(1);
    return settingsData || undefined;
  }

  async updateSettings(insertSettings: InsertSettings): Promise<Settings> {
    // First check if settings exist
    const existing = await this.getSettings();
    
    if (existing) {
      const [updated] = await db
        .update(settings)
        .set({
          ...insertSettings,
          updatedAt: new Date(),
        })
        .where(eq(settings.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(settings)
        .values({
          ...insertSettings,
          claudeApiKey: insertSettings.claudeApiKey || null,
          claudeModel: insertSettings.claudeModel || "claude-sonnet-4-20250514",
          claudeTemperature: insertSettings.claudeTemperature || "0.7",
          claudeMaxTokens: insertSettings.claudeMaxTokens || 4000,
          beehiivApiKey: insertSettings.beehiivApiKey || null,
          beehiivPublicationId: insertSettings.beehiivPublicationId || null,
          newsletterTitle: insertSettings.newsletterTitle || "AI Weekly",
          issueStartNumber: insertSettings.issueStartNumber || 1,
          defaultNewsSource: insertSettings.defaultNewsSource || null,
          sendgridApiKey: insertSettings.sendgridApiKey || null,
          approvalEmail: insertSettings.approvalEmail || null,
          approvalRequired: insertSettings.approvalRequired || false,
          dailyScheduleEnabled: insertSettings.dailyScheduleEnabled || false,
          dailyScheduleTime: insertSettings.dailyScheduleTime || "09:00",
          autoSelectArticles: insertSettings.autoSelectArticles || false,
          maxDailyArticles: insertSettings.maxDailyArticles || 5,
        })
        .returning();
      return created;
    }
  }

  // Activity Logs
  async getActivityLogs(): Promise<ActivityLog[]> {
    return await db.select().from(activityLogs).orderBy(desc(activityLogs.timestamp));
  }

  async createActivityLog(insertLog: InsertActivityLog): Promise<ActivityLog> {
    const [log] = await db
      .insert(activityLogs)
      .values({
        message: insertLog.message,
        details: insertLog.details || null,
        type: insertLog.type,
      })
      .returning();
    return log;
  }

  async clearActivityLogs(): Promise<void> {
    await db.delete(activityLogs);
  }

  // Schedules
  async getSchedules(): Promise<Schedule[]> {
    return await db.select().from(schedules).orderBy(schedules.name);
  }

  async createSchedule(insertSchedule: InsertSchedule): Promise<Schedule> {
    const [schedule] = await db
      .insert(schedules)
      .values({
        ...insertSchedule,
        maxArticles: insertSchedule.maxArticles || 5,
        autoApprove: insertSchedule.autoApprove || false,
        enabled: insertSchedule.enabled || true,
        nextRun: this.calculateNextRun(insertSchedule.frequency, insertSchedule.time),
      })
      .returning();
    return schedule;
  }

  async updateSchedule(id: number, updates: Partial<Schedule>): Promise<Schedule | undefined> {
    const schedule = await db.select().from(schedules).where(eq(schedules.id, id));
    if (schedule.length === 0) return undefined;

    const updateData = { ...updates };
    if (updates.frequency || updates.time) {
      updateData.nextRun = this.calculateNextRun(
        updates.frequency || schedule[0].frequency,
        updates.time || schedule[0].time
      );
    }

    const [updated] = await db
      .update(schedules)
      .set(updateData)
      .where(eq(schedules.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteSchedule(id: number): Promise<boolean> {
    const result = await db.delete(schedules).where(eq(schedules.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getEnabledSchedules(): Promise<Schedule[]> {
    return await db.select().from(schedules).where(eq(schedules.enabled, true));
  }

  private calculateNextRun(frequency: string, time: string): Date {
    const now = new Date();
    const [hours, minutes] = time.split(':').map(Number);
    const nextRun = new Date(now);
    nextRun.setHours(hours, minutes, 0, 0);

    if (frequency === 'daily') {
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
    } else if (frequency === 'weekly') {
      nextRun.setDate(nextRun.getDate() + (7 - nextRun.getDay()));
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 7);
      }
    }

    return nextRun;
  }

  // Social Media Posts
  async getSocialMediaPosts(): Promise<SocialMediaPost[]> {
    return await db.select().from(socialMediaPosts).orderBy(desc(socialMediaPosts.scheduledFor));
  }

  async getSocialMediaPostsByNewsletter(newsletterId: number): Promise<SocialMediaPost[]> {
    return await db.select().from(socialMediaPosts)
      .where(eq(socialMediaPosts.newsletterId, newsletterId))
      .orderBy(desc(socialMediaPosts.scheduledFor));
  }

  async createSocialMediaPost(insertPost: InsertSocialMediaPost): Promise<SocialMediaPost> {
    const [post] = await db
      .insert(socialMediaPosts)
      .values({
        ...insertPost,
        status: insertPost.status || "scheduled",
        hashtags: insertPost.hashtags || [],
        engagementHook: insertPost.engagementHook || null,
        callToAction: insertPost.callToAction || null,
        postUrl: null,
        engagementStats: null,
      })
      .returning();
    return post;
  }

  async updateSocialMediaPost(id: number, updates: Partial<SocialMediaPost>): Promise<SocialMediaPost | undefined> {
    const [post] = await db
      .update(socialMediaPosts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(socialMediaPosts.id, id))
      .returning();
    return post || undefined;
  }

  async deleteSocialMediaPost(id: number): Promise<boolean> {
    const result = await db.delete(socialMediaPosts).where(eq(socialMediaPosts.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getScheduledSocialMediaPosts(): Promise<SocialMediaPost[]> {
    const now = new Date();
    return await db.select().from(socialMediaPosts)
      .where(eq(socialMediaPosts.status, "scheduled"))
      .orderBy(socialMediaPosts.scheduledFor);
  }

  // Feed Sources
  async getFeedSources(): Promise<FeedSource[]> {
    return await db.select().from(feedSources).orderBy(feedSources.name);
  }

  async createFeedSource(insertFeedSource: InsertFeedSource): Promise<FeedSource> {
    const [feedSource] = await db
      .insert(feedSources)
      .values({
        ...insertFeedSource,
        enabled: insertFeedSource.enabled !== undefined ? insertFeedSource.enabled : true,
        lastFetched: null,
        articleCount: 0,
        errorCount: 0,
        lastError: null,
        refreshInterval: insertFeedSource.refreshInterval || 60,
        tags: insertFeedSource.tags || [],
      })
      .returning();
    return feedSource;
  }

  async updateFeedSource(id: number, updates: Partial<FeedSource>): Promise<FeedSource | undefined> {
    const [feedSource] = await db
      .update(feedSources)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(feedSources.id, id))
      .returning();
    return feedSource || undefined;
  }

  async deleteFeedSource(id: number): Promise<boolean> {
    const result = await db.delete(feedSources).where(eq(feedSources.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getEnabledFeedSources(): Promise<FeedSource[]> {
    return await db.select().from(feedSources)
      .where(eq(feedSources.enabled, true))
      .orderBy(feedSources.name);
  }

  // Data Management
  async createDataBackup(insertBackup: InsertDataBackup): Promise<DataBackup> {
    const [backup] = await db
      .insert(dataBackups)
      .values({
        ...insertBackup,
        downloadUrl: null,
      })
      .returning();
    return backup;
  }

  async getDataBackups(): Promise<DataBackup[]> {
    return await db.select().from(dataBackups).orderBy(desc(dataBackups.createdAt));
  }

  async deleteDataBackup(id: number): Promise<boolean> {
    const result = await db.delete(dataBackups).where(eq(dataBackups.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async purgeAllData(): Promise<void> {
    // Delete all data except users and settings
    await db.delete(articles);
    await db.delete(newsletters);
    await db.delete(activityLogs);
    await db.delete(schedules);
    await db.delete(socialMediaPosts);
    await db.delete(feedSources);
    await db.delete(dataBackups);
  }

  async exportAllData(): Promise<any> {
    const [
      articlesData,
      newslettersData,
      settingsData,
      activityLogsData,
      schedulesData,
      socialMediaPostsData,
      feedSourcesData,
      backupsData
    ] = await Promise.all([
      db.select().from(articles),
      db.select().from(newsletters),
      db.select().from(settings),
      db.select().from(activityLogs),
      db.select().from(schedules),
      db.select().from(socialMediaPosts),
      db.select().from(feedSources),
      db.select().from(dataBackups),
    ]);

    return {
      articles: articlesData,
      newsletters: newslettersData,
      settings: settingsData[0] || null,
      activityLogs: activityLogsData,
      schedules: schedulesData,
      socialMediaPosts: socialMediaPostsData,
      feedSources: feedSourcesData,
      backups: backupsData,
      exportedAt: new Date().toISOString(),
    };
  }
}

// Choose storage implementation based on configuration
function createStorage(): IStorage {
  if (config.database.mock || !db) {
    console.log('Using Mock Database for development/testing');
    return mockDb as unknown as IStorage;
  } else {
    console.log('Using PostgreSQL Database');
    return new DatabaseStorage();
  }
}

export const storage = createStorage();
