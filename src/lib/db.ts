/* eslint-disable no-console, @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

import { AdminConfig } from './admin.types';
import { KvrocksStorage } from './kvrocks.db';
import { RedisStorage } from './redis.db';
import {
  ContentStat,
  EpisodeSkipConfig,
  Favorite,
  InviteCode,
  IStorage,
  MembershipConfig,
  MembershipType,
  Order,
  PaymentConfig,
  PlayRecord,
  PlayStatsResult,
  UserMembership,
  UserPlayStat,
  EmailSettings,
  UserSubscription,
  PurchaseLimitConfig,
} from './types';
import { UpstashRedisStorage } from './upstash.db';

// storage type 常量: 'localstorage' | 'redis' | 'upstash'，默认 'localstorage'
const STORAGE_TYPE =
  (process.env.NEXT_PUBLIC_STORAGE_TYPE as
    | 'localstorage'
    | 'redis'
    | 'upstash'
    | 'kvrocks'
    | undefined) || 'localstorage';

// 创建存储实例
function createStorage(): IStorage {
  switch (STORAGE_TYPE) {
    case 'redis':
      return new RedisStorage();
    case 'upstash':
      return new UpstashRedisStorage();
    case 'kvrocks':
      return new KvrocksStorage();
    case 'localstorage':
    default:
      return null as unknown as IStorage;
  }
}

// 单例存储实例
let storageInstance: IStorage | null = null;

function getStorage(): IStorage {
  if (!storageInstance) {
    storageInstance = createStorage();
  }
  return storageInstance;
}

// 工具函数：生成存储key
export function generateStorageKey(source: string, id: string): string {
  return `${source}+${id}`;
}

// 导出便捷方法
export class DbManager {
  private storage: IStorage;

  constructor() {
    this.storage = getStorage();
  }

  // 播放记录相关方法
  async getPlayRecord(
    userName: string,
    source: string,
    id: string
  ): Promise<PlayRecord | null> {
    const key = generateStorageKey(source, id);
    return this.storage.getPlayRecord(userName, key);
  }

  async savePlayRecord(
    userName: string,
    source: string,
    id: string,
    record: PlayRecord
  ): Promise<void> {
    const key = generateStorageKey(source, id);
    await this.storage.setPlayRecord(userName, key, record);
  }

  async getAllPlayRecords(userName: string): Promise<{
    [key: string]: PlayRecord;
  }> {
    return this.storage.getAllPlayRecords(userName);
  }

  async deletePlayRecord(
    userName: string,
    source: string,
    id: string
  ): Promise<void> {
    const key = generateStorageKey(source, id);
    await this.storage.deletePlayRecord(userName, key);
  }

  // 收藏相关方法
  async getFavorite(
    userName: string,
    source: string,
    id: string
  ): Promise<Favorite | null> {
    const key = generateStorageKey(source, id);
    return this.storage.getFavorite(userName, key);
  }

  async saveFavorite(
    userName: string,
    source: string,
    id: string,
    favorite: Favorite
  ): Promise<void> {
    const key = generateStorageKey(source, id);
    await this.storage.setFavorite(userName, key, favorite);
  }

  async getAllFavorites(
    userName: string
  ): Promise<{ [key: string]: Favorite }> {
    return this.storage.getAllFavorites(userName);
  }

  async deleteFavorite(
    userName: string,
    source: string,
    id: string
  ): Promise<void> {
    const key = generateStorageKey(source, id);
    await this.storage.deleteFavorite(userName, key);
  }

  async isFavorited(
    userName: string,
    source: string,
    id: string
  ): Promise<boolean> {
    const favorite = await this.getFavorite(userName, source, id);
    return favorite !== null;
  }

  // ---------- 用户相关 ----------
  async registerUser(userName: string, password: string): Promise<void> {
    await this.storage.registerUser(userName, password);
  }

  async verifyUser(userName: string, password: string): Promise<boolean> {
    return this.storage.verifyUser(userName, password);
  }

  // 检查用户是否已存在
  async checkUserExist(userName: string): Promise<boolean> {
    return this.storage.checkUserExist(userName);
  }

  async changePassword(userName: string, newPassword: string): Promise<void> {
    await this.storage.changePassword(userName, newPassword);
  }

  async deleteUser(userName: string): Promise<void> {
    await this.storage.deleteUser(userName);
  }

  // ---------- 用户相关（新版本 V2，支持 OIDC） ----------
  async createUserV2(
    userName: string,
    password: string,
    role: 'owner' | 'admin' | 'user' = 'user',
    tags?: string[],
    oidcSub?: string,
    enabledApis?: string[]
  ): Promise<void> {
    if (typeof (this.storage as any).createUserV2 === 'function') {
      await (this.storage as any).createUserV2(userName, password, role, tags, oidcSub, enabledApis);
    }
  }

  async verifyUserV2(userName: string, password: string): Promise<boolean> {
    if (typeof (this.storage as any).verifyUserV2 === 'function') {
      return (this.storage as any).verifyUserV2(userName, password);
    }
    return false;
  }

  async checkUserExistV2(userName: string): Promise<boolean> {
    if (typeof (this.storage as any).checkUserExistV2 === 'function') {
      return (this.storage as any).checkUserExistV2(userName);
    }
    return false;
  }

  async getUserByOidcSub(oidcSub: string): Promise<string | null> {
    if (typeof (this.storage as any).getUserByOidcSub === 'function') {
      return (this.storage as any).getUserByOidcSub(oidcSub);
    }
    return null;
  }

  async getUserInfoV2(userName: string): Promise<{
    username: string;
    role: 'owner' | 'admin' | 'user';
    tags?: string[];
    enabledApis?: string[];
    banned?: boolean;
    createdAt?: number;
    oidcSub?: string;
  } | null> {
    if (typeof (this.storage as any).getUserInfoV2 === 'function') {
      return (this.storage as any).getUserInfoV2(userName);
    }
    return null;
  }

  // ---------- 搜索历史 ----------
  async getSearchHistory(userName: string): Promise<string[]> {
    return this.storage.getSearchHistory(userName);
  }

  async addSearchHistory(userName: string, keyword: string): Promise<void> {
    await this.storage.addSearchHistory(userName, keyword);
  }

  async deleteSearchHistory(userName: string, keyword?: string): Promise<void> {
    await this.storage.deleteSearchHistory(userName, keyword);
  }

  // 获取全部用户名
  async getAllUsers(): Promise<string[]> {
    if (typeof (this.storage as any).getAllUsers === 'function') {
      return (this.storage as any).getAllUsers();
    }
    return [];
  }

  // ---------- 管理员配置 ----------
  async getAdminConfig(): Promise<AdminConfig | null> {
    if (typeof (this.storage as any).getAdminConfig === 'function') {
      return (this.storage as any).getAdminConfig();
    }
    return null;
  }

  async saveAdminConfig(config: AdminConfig): Promise<void> {
    if (typeof (this.storage as any).setAdminConfig === 'function') {
      await (this.storage as any).setAdminConfig(config);
    }
  }

  // ---------- 跳过片头片尾配置 ----------
  async getSkipConfig(
    userName: string,
    source: string,
    id: string
  ): Promise<EpisodeSkipConfig | null> {
    if (typeof (this.storage as any).getSkipConfig === 'function') {
      return (this.storage as any).getSkipConfig(userName, source, id);
    }
    return null;
  }

  async setSkipConfig(
    userName: string,
    source: string,
    id: string,
    config: EpisodeSkipConfig
  ): Promise<void> {
    if (typeof (this.storage as any).setSkipConfig === 'function') {
      await (this.storage as any).setSkipConfig(userName, source, id, config);
    }
  }

  async deleteSkipConfig(
    userName: string,
    source: string,
    id: string
  ): Promise<void> {
    if (typeof (this.storage as any).deleteSkipConfig === 'function') {
      await (this.storage as any).deleteSkipConfig(userName, source, id);
    }
  }

  async getAllSkipConfigs(
    userName: string
  ): Promise<{ [key: string]: EpisodeSkipConfig }> {
    if (typeof (this.storage as any).getAllSkipConfigs === 'function') {
      return (this.storage as any).getAllSkipConfigs(userName);
    }
    return {};
  }

  // ---------- 剧集跳过配置（新版，多片段支持）----------
  async getEpisodeSkipConfig(
    userName: string,
    source: string,
    id: string
  ): Promise<EpisodeSkipConfig | null> {
    if (typeof (this.storage as any).getEpisodeSkipConfig === 'function') {
      return (this.storage as any).getEpisodeSkipConfig(userName, source, id);
    }
    return null;
  }

  async saveEpisodeSkipConfig(
    userName: string,
    source: string,
    id: string,
    config: EpisodeSkipConfig
  ): Promise<void> {
    if (typeof (this.storage as any).saveEpisodeSkipConfig === 'function') {
      await (this.storage as any).saveEpisodeSkipConfig(userName, source, id, config);
    }
  }

  async deleteEpisodeSkipConfig(
    userName: string,
    source: string,
    id: string
  ): Promise<void> {
    if (typeof (this.storage as any).deleteEpisodeSkipConfig === 'function') {
      await (this.storage as any).deleteEpisodeSkipConfig(userName, source, id);
    }
  }

  async getAllEpisodeSkipConfigs(
    userName: string
  ): Promise<{ [key: string]: EpisodeSkipConfig }> {
    if (typeof (this.storage as any).getAllEpisodeSkipConfigs === 'function') {
      return (this.storage as any).getAllEpisodeSkipConfigs(userName);
    }
    return {};
  }

  // ---------- 数据清理 ----------
  async clearAllData(): Promise<void> {
    if (typeof (this.storage as any).clearAllData === 'function') {
      await (this.storage as any).clearAllData();
    } else {
      throw new Error('存储类型不支持清空数据操作');
    }
  }

  // ---------- 通用缓存方法 ----------
  async getCache(key: string): Promise<any | null> {
    if (typeof this.storage.getCache === 'function') {
      return await this.storage.getCache(key);
    }
    return null;
  }

  async setCache(key: string, data: any, expireSeconds?: number): Promise<void> {
    if (typeof this.storage.setCache === 'function') {
      await this.storage.setCache(key, data, expireSeconds);
    }
  }

  async deleteCache(key: string): Promise<void> {
    if (typeof this.storage.deleteCache === 'function') {
      await this.storage.deleteCache(key);
    }
  }

  async clearExpiredCache(prefix?: string): Promise<void> {
    if (typeof this.storage.clearExpiredCache === 'function') {
      await this.storage.clearExpiredCache(prefix);
    }
  }

  // ---------- 播放统计相关 ----------
  async getPlayStats(): Promise<PlayStatsResult> {
    if (typeof (this.storage as any).getPlayStats === 'function') {
      return (this.storage as any).getPlayStats();
    }

    // 如果存储不支持统计功能，返回默认值
    return {
      totalUsers: 0,
      totalWatchTime: 0,
      totalPlays: 0,
      avgWatchTimePerUser: 0,
      avgPlaysPerUser: 0,
      userStats: [],
      topSources: [],
      dailyStats: [],
      // 新增：用户注册统计
      registrationStats: {
        todayNewUsers: 0,
        totalRegisteredUsers: 0,
        registrationTrend: [],
      },
      // 新增：用户活跃度统计
      activeUsers: {
        daily: 0,
        weekly: 0,
        monthly: 0,
      },
    };
  }

  async getUserPlayStat(userName: string): Promise<UserPlayStat> {
    if (typeof (this.storage as any).getUserPlayStat === 'function') {
      return (this.storage as any).getUserPlayStat(userName);
    }

    // 如果存储不支持统计功能，返回默认值
    return {
      username: userName,
      totalWatchTime: 0,
      totalPlays: 0,
      lastPlayTime: 0,
      recentRecords: [],
      avgWatchTime: 0,
      mostWatchedSource: ''
    };
  }

  async getContentStats(limit = 10): Promise<ContentStat[]> {
    if (typeof (this.storage as any).getContentStats === 'function') {
      return (this.storage as any).getContentStats(limit);
    }

    // 如果存储不支持统计功能，返回空数组
    return [];
  }

  async updatePlayStatistics(
    _userName: string,
    _source: string,
    _id: string,
    _watchTime: number
  ): Promise<void> {
    if (typeof (this.storage as any).updatePlayStatistics === 'function') {
      await (this.storage as any).updatePlayStatistics(_userName, _source, _id, _watchTime);
    }
  }

  async updateUserLoginStats(
    userName: string,
    loginTime: number,
    isFirstLogin?: boolean
  ): Promise<void> {
    if (typeof (this.storage as any).updateUserLoginStats === 'function') {
      await (this.storage as any).updateUserLoginStats(userName, loginTime, isFirstLogin);
    }
  }

  // 删除 V1 用户密码数据（用于 V1→V2 迁移）
  async deleteV1Password(userName: string): Promise<void> {
    if (typeof (this.storage as any).client !== 'undefined') {
      await (this.storage as any).client.del(`u:${userName}:pwd`);
    }
  }

  // 检查存储类型是否支持统计功能
  isStatsSupported(): boolean {
    const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';
    return storageType !== 'localstorage';
  }

  // ========================================
  // 邀请码系统相关方法
  // ========================================

  // ---------- 邀请码管理 ----------
  async createInviteCode(code: InviteCode): Promise<void> {
    if (typeof (this.storage as any).createInviteCode === 'function') {
      await (this.storage as any).createInviteCode(code);
    } else {
      throw new Error('当前存储类型不支持邀请码功能');
    }
  }

  async getInviteCode(code: string): Promise<InviteCode | null> {
    if (typeof (this.storage as any).getInviteCode === 'function') {
      return (this.storage as any).getInviteCode(code);
    }
    return null;
  }

  async getAllInviteCodes(): Promise<InviteCode[]> {
    if (typeof (this.storage as any).getAllInviteCodes === 'function') {
      return (this.storage as any).getAllInviteCodes();
    }
    return [];
  }

  async updateInviteCode(code: string, updates: Partial<InviteCode>): Promise<void> {
    if (typeof (this.storage as any).updateInviteCode === 'function') {
      await (this.storage as any).updateInviteCode(code, updates);
    }
  }

  async deleteInviteCode(code: string): Promise<void> {
    if (typeof (this.storage as any).deleteInviteCode === 'function') {
      await (this.storage as any).deleteInviteCode(code);
    }
  }

  // ---------- 订单管理 ----------
  async createOrder(order: Order): Promise<void> {
    if (typeof (this.storage as any).createOrder === 'function') {
      await (this.storage as any).createOrder(order);
    } else {
      throw new Error('当前存储类型不支持订单功能');
    }
  }

  async getOrder(orderId: string): Promise<Order | null> {
    if (typeof (this.storage as any).getOrder === 'function') {
      return (this.storage as any).getOrder(orderId);
    }
    return null;
  }

  async getAllOrders(): Promise<Order[]> {
    if (typeof (this.storage as any).getAllOrders === 'function') {
      return (this.storage as any).getAllOrders();
    }
    return [];
  }

  async updateOrder(orderId: string, updates: Partial<Order>): Promise<void> {
    if (typeof (this.storage as any).updateOrder === 'function') {
      await (this.storage as any).updateOrder(orderId, updates);
    }
  }

  // ---------- 用户会员管理 ----------
  async getUserMembership(username: string): Promise<UserMembership | null> {
    if (typeof (this.storage as any).getUserMembership === 'function') {
      return (this.storage as any).getUserMembership(username);
    }
    return null;
  }

  async setUserMembership(membership: UserMembership): Promise<void> {
    if (typeof (this.storage as any).setUserMembership === 'function') {
      await (this.storage as any).setUserMembership(membership);
    }
  }

  // ---------- 配置管理 ----------
  async getPaymentConfig(): Promise<PaymentConfig | null> {
    if (typeof (this.storage as any).getPaymentConfig === 'function') {
      return (this.storage as any).getPaymentConfig();
    }
    return null;
  }

  async setPaymentConfig(config: PaymentConfig): Promise<void> {
    if (typeof (this.storage as any).setPaymentConfig === 'function') {
      await (this.storage as any).setPaymentConfig(config);
    }
  }

  async getMembershipConfig(): Promise<Record<MembershipType, MembershipConfig> | null> {
    if (typeof (this.storage as any).getMembershipConfig === 'function') {
      return (this.storage as any).getMembershipConfig();
    }
    return null;
  }

  async setMembershipConfig(config: Record<MembershipType, MembershipConfig>): Promise<void> {
    if (typeof (this.storage as any).setMembershipConfig === 'function') {
      await (this.storage as any).setMembershipConfig(config);
    }
  }

  // ========================================
  // 邮件配置相关方法
  // ========================================

  async getEmailSettings(): Promise<EmailSettings | null> {
    if (typeof (this.storage as any).getEmailSettings === 'function') {
      return (this.storage as any).getEmailSettings();
    }
    return null;
  }

  async setEmailSettings(config: EmailSettings): Promise<void> {
    if (typeof (this.storage as any).setEmailSettings === 'function') {
      await (this.storage as any).setEmailSettings(config);
    }
  }

  // ========================================
  // 影视订阅相关方法
  // ========================================

  async createSubscription(sub: UserSubscription): Promise<void> {
    if (typeof (this.storage as any).createSubscription === 'function') {
      await (this.storage as any).createSubscription(sub);
    } else {
      throw new Error('当前存储类型不支持订阅功能');
    }
  }

  async getSubscription(id: string): Promise<UserSubscription | null> {
    if (typeof (this.storage as any).getSubscription === 'function') {
      return (this.storage as any).getSubscription(id);
    }
    return null;
  }

  async getUserSubscriptions(username: string): Promise<UserSubscription[]> {
    if (typeof (this.storage as any).getUserSubscriptions === 'function') {
      return (this.storage as any).getUserSubscriptions(username);
    }
    return [];
  }

  async getAllSubscriptions(): Promise<UserSubscription[]> {
    if (typeof (this.storage as any).getAllSubscriptions === 'function') {
      return (this.storage as any).getAllSubscriptions();
    }
    return [];
  }

  async updateSubscription(id: string, updates: Partial<UserSubscription>): Promise<void> {
    if (typeof (this.storage as any).updateSubscription === 'function') {
      await (this.storage as any).updateSubscription(id, updates);
    }
  }

  async deleteSubscription(id: string): Promise<void> {
    if (typeof (this.storage as any).deleteSubscription === 'function') {
      await (this.storage as any).deleteSubscription(id);
    }
  }

  // ========================================
  // 购买限制配置
  // ========================================

  async getPurchaseLimitConfig(): Promise<PurchaseLimitConfig | null> {
    if (typeof (this.storage as any).getPurchaseLimitConfig === 'function') {
      return (this.storage as any).getPurchaseLimitConfig();
    }
    // 默认配置
    return {
      trialMaxPerEmail: 1,
      trialMaxPerDay: 100,
    };
  }

  async setPurchaseLimitConfig(config: PurchaseLimitConfig): Promise<void> {
    if (typeof (this.storage as any).setPurchaseLimitConfig === 'function') {
      await (this.storage as any).setPurchaseLimitConfig(config);
    }
  }

  // 获取某邮箱已购买的体验会员数量
  async getTrialPurchaseCountByEmail(email: string): Promise<number> {
    const orders = await this.getAllOrders();
    return orders.filter(o => 
      o.email === email && 
      o.membershipType === 'trial' && 
      (o.status === 'completed' || o.status === 'paid')
    ).length;
  }

  // 获取今天已购买的体验会员数量
  async getTodayTrialPurchaseCount(): Promise<number> {
    const orders = await this.getAllOrders();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartTs = todayStart.getTime();
    
    return orders.filter(o => 
      o.membershipType === 'trial' && 
      (o.status === 'completed' || o.status === 'paid') &&
      o.createdAt >= todayStartTs
    ).length;
  }
}

// 导出默认实例
export const db = new DbManager();
