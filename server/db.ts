import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, aiModels, games, gameActions, modelStats, AiModel, Game, InsertGame, InsertGameAction, ModelStats, InsertModelStats } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ==================== AI Models ====================

export async function getAllAiModels(): Promise<AiModel[]> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.select().from(aiModels).where(eq(aiModels.enabled, 1));
  return result;
}

export async function getAiModelById(id: number): Promise<AiModel | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(aiModels).where(eq(aiModels.id, id)).limit(1);
  return result[0];
}

export async function createAiModel(model: Omit<AiModel, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(aiModels).values(model as any);
  return Number(result[0].insertId);
}

// ==================== Games ====================

export async function createGame(game: InsertGame): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(games).values(game);
  return Number(result[0].insertId);
}

export async function getGameByGameId(gameId: string): Promise<Game | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(games).where(eq(games.gameId, gameId)).limit(1);
  return result[0];
}

export async function updateGame(gameId: string, updates: Partial<Game>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(games).set(updates).where(eq(games.gameId, gameId));
}

export async function getRecentGames(limit: number = 20): Promise<Game[]> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.select().from(games).orderBy(games.createdAt).limit(limit);
  return result;
}

// ==================== Game Actions ====================

export async function createGameAction(action: InsertGameAction): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(gameActions).values(action);
}

export async function getGameActions(gameId: string): Promise<typeof gameActions.$inferSelect[]> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.select().from(gameActions).where(eq(gameActions.gameId, gameId));
  return result;
}

// ==================== Model Stats ====================

export async function getModelStats(modelId: number): Promise<ModelStats | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(modelStats).where(eq(modelStats.modelId, modelId)).limit(1);
  return result[0];
}

export async function upsertModelStats(stats: InsertModelStats): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(modelStats).values(stats).onDuplicateKeyUpdate({
    set: stats
  });
}

export async function getAllModelStats(): Promise<ModelStats[]> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.select().from(modelStats);
  return result;
}

/**
 * 更新模型统计数据（在游戏结束后调用）
 */
export async function updateModelStatsAfterGame(
  modelId: number,
  isLandlord: boolean,
  won: boolean,
  thinkingTimes: number[],
  rounds: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // 获取当前统计
  let stats = await getModelStats(modelId);
  
  if (!stats) {
    // 创建新的统计记录
    stats = {
      id: 0,
      modelId,
      totalGames: 0,
      winsAsLandlord: 0,
      winsAsFarmer: 0,
      lossesAsLandlord: 0,
      lossesAsFarmer: 0,
      totalBids: 0,
      successfulBids: 0,
      avgThinkingTime: 0,
      avgRoundsPerGame: 0,
      eloRating: 1500,
      updatedAt: new Date(),
    };
  }
  
  // 更新统计
  stats.totalGames++;
  
  if (isLandlord) {
    if (won) {
      stats.winsAsLandlord++;
    } else {
      stats.lossesAsLandlord++;
    }
  } else {
    if (won) {
      stats.winsAsFarmer++;
    } else {
      stats.lossesAsFarmer++;
    }
  }
  
  // 更新平均思考时间
  const avgThinking = thinkingTimes.reduce((a, b) => a + b, 0) / thinkingTimes.length;
  stats.avgThinkingTime = (stats.avgThinkingTime * (stats.totalGames - 1) + avgThinking) / stats.totalGames;
  
  // 更新平均回合数
  stats.avgRoundsPerGame = (stats.avgRoundsPerGame * (stats.totalGames - 1) + rounds) / stats.totalGames;
  
  await upsertModelStats(stats);
}
