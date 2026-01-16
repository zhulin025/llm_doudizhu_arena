import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, bigint, float } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * AI模型配置表
 * 存储可用的AI模型信息和配置
 */
export const aiModels = mysqlTable("ai_models", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(), // 模型名称，如 "GPT-4", "Claude-3"
  provider: varchar("provider", { length: 50 }).notNull(), // 提供商：openai, anthropic, google, local
  modelId: varchar("modelId", { length: 200 }).notNull(), // 实际的模型ID
  apiEndpoint: text("apiEndpoint"), // API端点（本地模型使用）
  config: json("config"), // 额外配置（温度、top_p等）
  enabled: int("enabled").default(1).notNull(), // 是否启用
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AiModel = typeof aiModels.$inferSelect;
export type InsertAiModel = typeof aiModels.$inferInsert;

/**
 * 游戏对战记录表
 * 存储每局游戏的基本信息
 */
export const games = mysqlTable("games", {
  id: int("id").autoincrement().primaryKey(),
  gameId: varchar("gameId", { length: 64 }).notNull().unique(), // 游戏唯一标识
  status: mysqlEnum("status", ["waiting", "playing", "finished", "error"]).default("waiting").notNull(),
  
  // 三位玩家（AI模型）
  player0ModelId: int("player0ModelId").notNull(), // 玩家0的模型ID
  player1ModelId: int("player1ModelId").notNull(), // 玩家1的模型ID
  player2ModelId: int("player2ModelId").notNull(), // 玩家2的模型ID
  
  // 游戏结果
  landlordPosition: int("landlordPosition"), // 地主位置 (0, 1, 2)
  winnerPosition: int("winnerPosition"), // 获胜方位置 (0, 1, 2, 或 -1表示地主输)
  winnerType: mysqlEnum("winnerType", ["landlord", "farmer"]), // 获胜方类型
  
  // 游戏统计
  totalRounds: int("totalRounds").default(0), // 总回合数
  duration: int("duration"), // 游戏时长（秒）
  
  // 初始牌局
  initialCards: json("initialCards"), // 初始发牌情况 {player0: [], player1: [], player2: [], landlordCards: []}
  
  // 时间戳
  startedAt: timestamp("startedAt"),
  finishedAt: timestamp("finishedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Game = typeof games.$inferSelect;
export type InsertGame = typeof games.$inferInsert;

/**
 * 游戏动作记录表
 * 存储每局游戏中的每一步操作
 */
export const gameActions = mysqlTable("game_actions", {
  id: int("id").autoincrement().primaryKey(),
  gameId: varchar("gameId", { length: 64 }).notNull(), // 关联的游戏ID
  roundNumber: int("roundNumber").notNull(), // 回合数
  playerPosition: int("playerPosition").notNull(), // 玩家位置 (0, 1, 2)
  actionType: mysqlEnum("actionType", ["bid", "pass_bid", "play", "pass_play"]).notNull(), // 动作类型
  
  // 动作详情
  cards: json("cards"), // 出的牌（JSON数组）
  cardType: varchar("cardType", { length: 50 }), // 牌型（单张、对子、顺子等）
  bidAmount: int("bidAmount"), // 叫地主的分数（1-3）
  
  // AI决策信息
  thinkingTime: int("thinkingTime"), // 思考时间（毫秒）
  aiReasoning: text("aiReasoning"), // AI的决策理由
  
  // 游戏状态快照
  gameState: json("gameState"), // 当前游戏状态快照
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GameAction = typeof gameActions.$inferSelect;
export type InsertGameAction = typeof gameActions.$inferInsert;

/**
 * AI模型统计数据表
 * 存储每个模型的统计信息
 */
export const modelStats = mysqlTable("model_stats", {
  id: int("id").autoincrement().primaryKey(),
  modelId: int("modelId").notNull().unique(), // 关联的模型ID
  
  // 对战统计
  totalGames: int("totalGames").default(0).notNull(), // 总对局数
  winsAsLandlord: int("winsAsLandlord").default(0).notNull(), // 作为地主获胜次数
  winsAsFarmer: int("winsAsFarmer").default(0).notNull(), // 作为农民获胜次数
  lossesAsLandlord: int("lossesAsLandlord").default(0).notNull(), // 作为地主失败次数
  lossesAsFarmer: int("lossesAsFarmer").default(0).notNull(), // 作为农民失败次数
  
  // 叫地主统计
  totalBids: int("totalBids").default(0).notNull(), // 总叫地主次数
  successfulBids: int("successfulBids").default(0).notNull(), // 成功叫到地主次数
  
  // 性能统计
  avgThinkingTime: float("avgThinkingTime").default(0).notNull(), // 平均思考时间（毫秒）
  avgRoundsPerGame: float("avgRoundsPerGame").default(0).notNull(), // 平均每局回合数
  
  // 评分
  eloRating: float("eloRating").default(1500).notNull(), // ELO评分
  
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ModelStats = typeof modelStats.$inferSelect;
export type InsertModelStats = typeof modelStats.$inferInsert;
