import { AdminConfig } from './admin.types';

// 播放记录数据结构
export interface PlayRecord {
  title: string;
  source_name: string;
  cover: string;
  year: string;
  index: number; // 第几集
  total_episodes: number; // 总集数
  original_episodes?: number; // 首次观看时的原始集数
  play_time: number; // 播放进度（秒）
  total_time: number; // 总进度（秒）
  save_time: number; // 记录保存时间（时间戳）
  search_title: string; // 搜索时使用的标题
  remarks?: string; // 备注信息（如"已完结"、"更新至20集"等）
  douban_id?: number; // 豆瓣ID（用于准确识别视频）
}

// 收藏数据结构
export interface Favorite {
  source_name: string;
  total_episodes: number; // 总集数
  title: string;
  year: string;
  cover: string;
  save_time: number; // 记录保存时间（时间戳）
  search_title: string; // 搜索时使用的标题
  origin?: 'vod' | 'live' | 'shortdrama';
  type?: string; // 内容类型（movie/tv/variety/shortdrama等）
  releaseDate?: string; // 上映日期 (YYYY-MM-DD)，用于即将上映内容
  remarks?: string; // 备注信息（如"X天后上映"、"已上映"等）
}

// 短剧分类数据结构
export interface ShortDramaCategory {
  type_id: number;
  type_name: string;
}

// 短剧列表项数据结构
export interface ShortDramaItem {
  id: number;
  name: string;
  cover: string;
  update_time: string;
  score: number;
  episode_count: number;
  description?: string;
  author?: string;        // 演员/导演信息
  backdrop?: string;      // 高清背景图
  vote_average?: number;  // 用户评分 (0-10)
  tmdb_id?: number;       // TMDB ID
}

// 短剧解析结果数据结构
export interface ShortDramaParseResult {
  code: number;
  msg?: string;
  data?: {
    videoId: number;
    videoName: string;
    currentEpisode: number;
    totalEpisodes: number;
    parsedUrl: string;
    proxyUrl: string;
    cover: string;
    description: string;
    episode?: {
      index: number;
      label: string;
      parsedUrl: string;
      proxyUrl?: string;
      title?: string;
    };
  };
  metadata?: {
    author?: string;
    backdrop?: string;
    vote_average?: number;
    tmdb_id?: number;
  };
}

// 短剧API响应数据结构
export interface ShortDramaResponse<T> {
  code: number;
  msg?: string;
  data: T;
}

// 存储接口
export interface IStorage {
  // 播放记录相关
  getPlayRecord(userName: string, key: string): Promise<PlayRecord | null>;
  setPlayRecord(
    userName: string,
    key: string,
    record: PlayRecord
  ): Promise<void>;
  getAllPlayRecords(userName: string): Promise<{ [key: string]: PlayRecord }>;
  deletePlayRecord(userName: string, key: string): Promise<void>;

  // 收藏相关
  getFavorite(userName: string, key: string): Promise<Favorite | null>;
  setFavorite(userName: string, key: string, favorite: Favorite): Promise<void>;
  getAllFavorites(userName: string): Promise<{ [key: string]: Favorite }>;
  deleteFavorite(userName: string, key: string): Promise<void>;

  // 用户相关
  registerUser(userName: string, password: string): Promise<void>;
  verifyUser(userName: string, password: string): Promise<boolean>;
  // 检查用户是否存在（无需密码）
  checkUserExist(userName: string): Promise<boolean>;
  // 修改用户密码
  changePassword(userName: string, newPassword: string): Promise<void>;
  // 删除用户（包括密码、搜索历史、播放记录、收藏夹）
  deleteUser(userName: string): Promise<void>;

  // 搜索历史相关
  getSearchHistory(userName: string): Promise<string[]>;
  addSearchHistory(userName: string, keyword: string): Promise<void>;
  deleteSearchHistory(userName: string, keyword?: string): Promise<void>;

  // 用户列表
  getAllUsers(): Promise<string[]>;

  // 管理员配置相关
  getAdminConfig(): Promise<AdminConfig | null>;
  setAdminConfig(config: AdminConfig): Promise<void>;

  // 跳过片头片尾配置相关
  getSkipConfig(
    userName: string,
    source: string,
    id: string
  ): Promise<EpisodeSkipConfig | null>;
  setSkipConfig(
    userName: string,
    source: string,
    id: string,
    config: EpisodeSkipConfig
  ): Promise<void>;
  deleteSkipConfig(userName: string, source: string, id: string): Promise<void>;
  getAllSkipConfigs(userName: string): Promise<{ [key: string]: EpisodeSkipConfig }>;

  // 数据清理相关
  clearAllData(): Promise<void>;

  // 通用缓存相关（新增）
  getCache(key: string): Promise<any | null>;
  setCache(key: string, data: any, expireSeconds?: number): Promise<void>;
  deleteCache(key: string): Promise<void>;
  clearExpiredCache(prefix?: string): Promise<void>;

  // 播放统计相关
  getPlayStats(): Promise<PlayStatsResult>;
  getUserPlayStat(userName: string): Promise<UserPlayStat>;
  getContentStats(limit?: number): Promise<ContentStat[]>;
  updatePlayStatistics(
    userName: string,
    source: string,
    id: string,
    watchTime: number
  ): Promise<void>;

  // 登入统计相关
  updateUserLoginStats(
    userName: string,
    loginTime: number,
    isFirstLogin?: boolean
  ): Promise<void>;
}

// 搜索结果数据结构
export interface SearchResult {
  id: string;
  title: string;
  poster: string;
  episodes: string[];
  episodes_titles: string[];
  source: string;
  source_name: string;
  class?: string;
  year: string;
  desc?: string;
  type_name?: string;
  douban_id?: number;
  remarks?: string; // 备注信息（如"已完结"、"更新至20集"等）
  drama_name?: string; // 短剧名称（用于备用API fallback）
  metadata?: {
    // 备用API提供的额外元数据
    author?: string;
    backdrop?: string;
    vote_average?: number;
    tmdb_id?: number;
  };
}

// 豆瓣数据结构
export interface DoubanItem {
  id: string;
  title: string;
  poster: string;
  rate: string;
  year: string;
  // 详细信息字段
  directors?: string[];
  screenwriters?: string[];
  cast?: string[];
  genres?: string[];
  countries?: string[];
  languages?: string[];
  episodes?: number;
  episode_length?: number;
  movie_duration?: number;
  first_aired?: string;
  plot_summary?: string;
  // 🎬 Netflix风格字段
  backdrop?: string;      // 高清背景图（用于HeroBanner）
  trailerUrl?: string;    // 预告片视频URL
}

export interface DoubanResult {
  code: number;
  message: string;
  list: DoubanItem[];
}

// 豆瓣短评数据结构
export interface DoubanComment {
  username: string;
  user_id: string;
  avatar: string;
  rating: number; // 0-5, 0表示未评分
  time: string;
  location: string;
  content: string;
  useful_count: number;
}

export interface DoubanCommentsResult {
  code: number;
  message: string;
  data?: {
    comments: DoubanComment[];
    start: number;
    limit: number;
    count: number;
  };
}

// ---- 跳过配置（多片段支持）----

// 单个跳过片段
export interface SkipSegment {
  start: number; // 开始时间（秒）
  end: number; // 结束时间（秒）
  type: 'opening' | 'ending'; // 片头或片尾
  title?: string; // 可选的描述
  autoSkip?: boolean; // 是否自动跳过（默认true）
  autoNextEpisode?: boolean; // 片尾是否自动跳转下一集（默认true，仅对ending类型有效）
  mode?: 'absolute' | 'remaining'; // 时间模式：absolute=绝对时间，remaining=剩余时间
  remainingTime?: number; // 剩余时间（秒），仅在mode=remaining时有效
}

// 剧集跳过配置
export interface EpisodeSkipConfig {
  source: string; // 资源站标识
  id: string; // 剧集ID
  title: string; // 剧集标题
  segments: SkipSegment[]; // 跳过片段列表
  updated_time: number; // 最后更新时间
}

// 用户播放统计数据结构
export interface UserPlayStat {
  username: string; // 用户名
  totalWatchTime: number; // 总观看时间（秒）
  totalPlays: number; // 总播放次数
  lastPlayTime: number; // 最后播放时间戳
  recentRecords: PlayRecord[]; // 最近播放记录（最多10条）
  avgWatchTime: number; // 平均每次观看时长
  mostWatchedSource: string; // 最常观看的来源

  // 新增LunaTV-alpha的高级统计字段
  totalMovies?: number; // 观看影片总数（去重）
  firstWatchDate?: number; // 首次观看时间戳
  lastUpdateTime?: number; // 最后更新时间戳
  createdAt?: number; // 注册时间戳
  loginDays?: number; // 累计登录天数
  lastLoginDate?: number; // 最后登录时间（已有字段）
  lastLoginTime?: number; // 最后登入时间戳（新增，与lastLoginDate统一概念）
  firstLoginTime?: number; // 首次登入时间戳（新增）
  loginCount?: number; // 登入次数（新增）
  activeStreak?: number; // 连续活跃天数
  continuousLoginDays?: number; // 连续登录天数
}

// 全站播放统计数据结构
export interface PlayStatsResult {
  totalUsers: number; // 总用户数
  totalWatchTime: number; // 全站总观看时间
  totalPlays: number; // 全站总播放次数
  avgWatchTimePerUser: number; // 用户平均观看时长
  avgPlaysPerUser: number; // 用户平均播放次数
  userStats: Array<{
    username: string;
    totalWatchTime: number;
    totalPlays: number;
    lastPlayTime: number;
    recentRecords: PlayRecord[];
    avgWatchTime: number;
    mostWatchedSource: string;
    registrationDays: number; // 注册天数
    lastLoginTime: number; // 最后登录时间
    loginCount: number; // 登入次数
    createdAt: number; // 用户创建时间
  }>; // 每个用户的统计
  topSources: Array<{
    // 热门来源统计（前5名）
    source: string;
    count: number;
  }>;
  dailyStats: Array<{
    // 近7天每日统计
    date: string;
    watchTime: number;
    plays: number;
  }>;
  // 新增：用户注册统计
  registrationStats: {
    todayNewUsers: number; // 今日新增用户
    totalRegisteredUsers: number; // 总注册用户数
    registrationTrend: Array<{
      // 近7天注册趋势
      date: string;
      newUsers: number;
    }>;
  };
  // 新增：用户活跃度统计
  activeUsers: {
    daily: number; // 日活跃用户数
    weekly: number; // 周活跃用户数
    monthly: number; // 月活跃用户数
  };
}

// 内容热度统计数据结构
export interface ContentStat {
  source: string;
  id: string;
  title: string;
  source_name: string;
  cover: string;
  year: string;
  playCount: number; // 播放次数
  totalWatchTime: number; // 总观看时长
  averageWatchTime: number; // 平均观看时长
  lastPlayed: number; // 最后播放时间
  uniqueUsers: number; // 观看用户数
}

// 发布日历数据结构
export interface ReleaseCalendarItem {
  id: string; // 唯一标识符
  title: string; // 影视名称
  type: 'movie' | 'tv'; // 类型：电影或电视剧
  director: string; // 导演
  actors: string; // 主演
  region: string; // 地区
  genre: string; // 类型/标签
  releaseDate: string; // 发布日期 (YYYY-MM-DD)
  cover?: string; // 封面图片URL
  description?: string; // 简介
  episodes?: number; // 集数（电视剧）
  source: 'manmankan'; // 数据来源
  createdAt: number; // 记录创建时间戳
  updatedAt: number; // 记录更新时间戳
}

// 发布日历API响应结构
export interface ReleaseCalendarResult {
  items: ReleaseCalendarItem[];
  total: number;
  hasMore: boolean;
  filters: {
    types: Array<{ value: 'movie' | 'tv'; label: string; count: number }>;
    regions: Array<{ value: string; label: string; count: number }>;
    genres: Array<{ value: string; label: string; count: number }>;
  };
}

// 个性化发布推荐结构
export interface PersonalizedReleaseRecommendation {
  userId: string;
  recommendations: Array<{
    item: ReleaseCalendarItem;
    reason: string; // 推荐理由
    score: number; // 推荐分数 0-100
    matchedPreferences: string[]; // 匹配的用户偏好
  }>;
  generatedAt: number; // 生成时间戳
}

// ========================================
// 会员邀请码系统
// ========================================

// 会员类型枚举
export type MembershipType = 'trial' | 'monthly' | 'quarterly' | 'yearly' | 'lifetime';

// 会员类型配置
export interface MembershipConfig {
  type: MembershipType;
  name: string; // 显示名称：月度会员、季度会员、年度会员、永久会员
  duration: number; // 时长（天），0表示永久
  price: number; // 原价（元）
  discountPrice?: number; // 折扣价（元），不设置则表示无折扣
  discount?: number; // 折扣百分比（0-100），仅用于显示，实际价格以 discountPrice 为准
  enabled?: boolean; // 是否启用该会员类型，默认 true
  description?: string; // 描述
  features?: string[]; // 特权列表
}

// 默认会员配置
export const DEFAULT_MEMBERSHIP_CONFIG: Record<MembershipType, MembershipConfig> = {
  trial: {
    type: 'trial',
    name: '体验会员',
    duration: 1,
    price: 0.1,
    description: '1天体验会员权限',
  },
  monthly: {
    type: 'monthly',
    name: '月度会员',
    duration: 30,
    price: 25,
    description: '1个月会员权限',
  },
  quarterly: {
    type: 'quarterly',
    name: '季度会员',
    duration: 90,
    price: 60,
    description: '3个月会员权限',
  },
  yearly: {
    type: 'yearly',
    name: '年度会员',
    duration: 365,
    price: 199,
    description: '12个月会员权限',
  },
  lifetime: {
    type: 'lifetime',
    name: '永久会员',
    duration: 0, // 0表示永久
    price: 399,
    description: '永久会员权限',
  },
};

// 邀请码状态
export type InviteCodeStatus = 'unused' | 'used' | 'expired' | 'disabled';

// 邀请码数据结构
export interface InviteCode {
  code: string; // 邀请码（唯一）
  membershipType: MembershipType; // 会员类型
  status: InviteCodeStatus; // 状态
  createdAt: number; // 创建时间戳
  expiresAt: number; // 过期时间戳（0表示永不过期）
  usedAt?: number; // 使用时间戳
  usedBy?: string; // 使用者用户名
  createdBy: string; // 创建者（管理员用户名）
  note?: string; // 备注
  orderId?: string; // 关联订单ID（购买生成的邀请码）
}

// 支付方式类型
export type PaymentMethod = 
  | 'wechat_official' // 官方微信支付
  | 'alipay_official' // 官方支付宝
  | 'xorpay_wechat' // 虎皮椒微信支付
  | 'xorpay_alipay'; // 虎皮椒支付宝

// 虎皮椒支持的支付方式
export type XorpayMethod = 'wechat' | 'alipay';

// 支付配置
export interface PaymentConfig {
  enabled: boolean; // 是否启用
  method: PaymentMethod; // 默认支付方式（向后兼容）
  enabledMethods?: XorpayMethod[]; // 启用的支付方式列表（微信/支付宝）
  
  // 官方微信支付配置
  wechatOfficial?: {
    appId: string; // 微信公众号AppID
    mchId: string; // 商户号
    apiKey: string; // API密钥
    notifyUrl: string; // 回调地址
  };
  
  // 官方支付宝配置
  alipayOfficial?: {
    appId: string; // 支付宝AppID
    privateKey: string; // 应用私钥
    publicKey: string; // 支付宝公钥
    notifyUrl: string; // 回调地址
  };
  
  // 虎皮椒配置（支持微信和支付宝）
  xorpay?: {
    appId: string; // 虎皮椒AppID
    appSecret: string; // 虎皮椒AppSecret
    notifyUrl: string; // 回调地址
  };
}

// 订单状态
export type OrderStatus = 
  | 'pending' // 待支付
  | 'paid' // 已支付
  | 'completed' // 已完成（邀请码已生成）
  | 'cancelled' // 已取消
  | 'refunded'; // 已退款

// 订单数据结构
export interface Order {
  orderId: string; // 订单ID（唯一）
  userId?: string; // 购买用户ID（可选，未登录用户购买）
  email: string; // 联系邮箱（必填）
  membershipType: MembershipType; // 会员类型
  amount: number; // 金额（元）
  paymentMethod: PaymentMethod; // 支付方式
  status: OrderStatus; // 订单状态
  createdAt: number; // 创建时间戳
  paidAt?: number; // 支付时间戳
  completedAt?: number; // 完成时间戳
  inviteCode?: string; // 生成的邀请码
  transactionId?: string; // 第三方支付交易号
  notifyData?: any; // 支付回调数据
  emailSent?: boolean; // 邮件是否已发送
  // 退款相关字段
  refundStatus?: 'refunding' | 'refunded' | 'refund_failed'; // 退款状态
  refundAt?: number; // 退款时间戳
  refundReason?: string; // 退款原因
  refundNo?: string; // 退款单号
  refundFee?: string; // 退款金额
}

// 用户会员信息
export interface UserMembership {
  username: string; // 用户名
  membershipType: MembershipType | null; // 当前会员类型（null表示非会员）
  startDate?: number; // 会员开始时间戳
  expiryDate?: number; // 会员到期时间戳（0表示永久）
  isActive: boolean; // 是否激活
  activatedBy?: string; // 激活邀请码
  activatedAt?: number; // 激活时间戳
}

// ========================================
// 邮件配置
// ========================================

// 邮件服务提供商
export type EmailProvider = 'smtp' | 'resend';

// 邮件配置
export interface EmailSettings {
  enabled: boolean;
  provider: EmailProvider;
  // SMTP 配置
  smtp?: {
    host: string;
    port: number;
    secure: boolean; // true for 465, false for other ports
    user: string;
    pass: string;
  };
  // Resend 配置
  resendApiKey?: string;
  // 发件人信息
  fromEmail: string;
  fromName: string;
}

// ========================================
// 影视订阅
// ========================================

// 订阅状态
export type SubscriptionStatus = 'active' | 'paused';

// 用户订阅
export interface UserSubscription {
  id: string; // 订阅ID
  username: string; // 用户名
  email: string; // 接收邮箱
  title: string; // 影视标题
  sourceKey: string; // 资源key (source+id)
  currentEpisodes: number; // 当前集数
  lastChecked: number; // 上次检查时间
  status: SubscriptionStatus;
  createdAt: number;
  notifiedEpisodes: number; // 已通知的集数
}

// ========================================
// 体验会员购买限制
// ========================================

// 购买限制配置
export interface PurchaseLimitConfig {
  trialMaxPerEmail: number; // 每个邮箱可购买的体验会员数量
  trialMaxPerDay: number; // 每天可购买的体验会员总数量（全局）
}

// 扩展 IStorage 接口，添加邀请码相关方法
export interface IStorageWithInviteCode extends IStorage {
  // 邀请码管理
  createInviteCode(code: InviteCode): Promise<void>;
  getInviteCode(code: string): Promise<InviteCode | null>;
  getAllInviteCodes(): Promise<InviteCode[]>;
  updateInviteCode(code: string, updates: Partial<InviteCode>): Promise<void>;
  deleteInviteCode(code: string): Promise<void>;
  
  // 订单管理
  createOrder(order: Order): Promise<void>;
  getOrder(orderId: string): Promise<Order | null>;
  getAllOrders(): Promise<Order[]>;
  updateOrder(orderId: string, updates: Partial<Order>): Promise<void>;
  
  // 用户会员管理
  getUserMembership(username: string): Promise<UserMembership | null>;
  setUserMembership(membership: UserMembership): Promise<void>;
  
  // 支付配置
  getPaymentConfig(): Promise<PaymentConfig | null>;
  setPaymentConfig(config: PaymentConfig): Promise<void>;
  
  // 会员配置
  getMembershipConfig(): Promise<Record<MembershipType, MembershipConfig> | null>;
  setMembershipConfig(config: Record<MembershipType, MembershipConfig>): Promise<void>;

  // 邮件配置
  getEmailSettings(): Promise<EmailSettings | null>;
  setEmailSettings(config: EmailSettings): Promise<void>;

  // 影视订阅
  createSubscription(sub: UserSubscription): Promise<void>;
  getSubscription(id: string): Promise<UserSubscription | null>;
  getUserSubscriptions(username: string): Promise<UserSubscription[]>;
  getAllSubscriptions(): Promise<UserSubscription[]>;
  updateSubscription(id: string, updates: Partial<UserSubscription>): Promise<void>;
  deleteSubscription(id: string): Promise<void>;

  // 购买限制配置
  getPurchaseLimitConfig(): Promise<PurchaseLimitConfig | null>;
  setPurchaseLimitConfig(config: PurchaseLimitConfig): Promise<void>;
}
