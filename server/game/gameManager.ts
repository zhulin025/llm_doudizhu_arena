/**
 * 游戏管理器 - 管理游戏会话和AI对战流程
 */

import { GameState, GamePhase, PlayerPosition, BidAction, PlayAction, createGame, processBidAction, processPlayAction, getPlayerModelId } from "./gameEngine";
import { aiMakeBidDecision, aiMakePlayDecision } from "./aiPlayer";
import { createGame as dbCreateGame, updateGame, createGameAction, updateModelStatsAfterGame, getAiModelById } from "../db";
import { cardsToStrings } from "./cards";

// 游戏会话存储（内存中）
const activeSessions = new Map<string, GameState>();

// 游戏事件类型
export type GameEvent = {
  type: "game_created" | "bidding_action" | "playing_action" | "game_finished" | "error";
  gameId: string;
  data: any;
  timestamp: Date;
};

// 游戏事件监听器
type GameEventListener = (event: GameEvent) => void;
const eventListeners = new Map<string, GameEventListener[]>();

/**
 * 订阅游戏事件
 */
export function subscribeToGame(gameId: string, listener: GameEventListener): () => void {
  if (!eventListeners.has(gameId)) {
    eventListeners.set(gameId, []);
  }
  
  const listeners = eventListeners.get(gameId)!;
  listeners.push(listener);
  
  // 返回取消订阅函数
  return () => {
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  };
}

/**
 * 发送游戏事件
 */
function emitGameEvent(event: GameEvent): void {
  const listeners = eventListeners.get(event.gameId);
  if (listeners) {
    listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error("Error in game event listener:", error);
      }
    });
  }
}

/**
 * 创建新游戏并开始AI对战
 */
export async function startNewGame(
  player0ModelId: number,
  player1ModelId: number,
  player2ModelId: number
): Promise<string> {
  // 创建游戏状态
  const gameState = createGame(player0ModelId, player1ModelId, player2ModelId);
  const gameId = gameState.gameId;
  
  // 保存到内存
  activeSessions.set(gameId, gameState);
  
  // 保存到数据库
  try {
    await dbCreateGame({
      gameId,
      status: "playing",
      player0ModelId,
      player1ModelId,
      player2ModelId,
      landlordPosition: null,
      winnerPosition: null,
      winnerType: null,
      totalRounds: 0,
      duration: null,
      initialCards: {
        player0: cardsToStrings(gameState.hands.player0),
        player1: cardsToStrings(gameState.hands.player1),
        player2: cardsToStrings(gameState.hands.player2),
        landlordCards: cardsToStrings(gameState.landlordCards),
      },
      startedAt: gameState.startedAt,
      finishedAt: null,
    });
  } catch (error) {
    console.error("Failed to save game to database:", error);
  }
  
  // 发送游戏创建事件
  emitGameEvent({
    type: "game_created",
    gameId,
    data: { gameState },
    timestamp: new Date(),
  });
  
  // 开始AI对战流程（异步）
  runGameLoop(gameId).catch(error => {
    console.error(`Game ${gameId} error:`, error);
    emitGameEvent({
      type: "error",
      gameId,
      data: { error: error.message },
      timestamp: new Date(),
    });
  });
  
  return gameId;
}

/**
 * 游戏主循环 - 自动运行AI对战
 */
async function runGameLoop(gameId: string): Promise<void> {
  let state = activeSessions.get(gameId);
  if (!state) {
    throw new Error("Game not found");
  }
  
  // 叫地主阶段
  while (state.phase === GamePhase.BIDDING) {
    state = await processBiddingPhase(state);
    activeSessions.set(gameId, state);
  }
  
  // 出牌阶段
  while (state.phase === GamePhase.PLAYING) {
    state = await processPlayingPhase(state);
    activeSessions.set(gameId, state);
  }
  
  // 游戏结束
  if (state.phase === GamePhase.FINISHED) {
    await finishGame(state);
  }
}

/**
 * 处理叫地主阶段
 */
async function processBiddingPhase(state: GameState): Promise<GameState> {
  const currentPlayer = state.currentBidder;
  const modelId = getPlayerModelId(state, currentPlayer);
  
  // 获取模型信息
  const model = await getAiModelById(modelId);
  if (!model) {
    throw new Error(`Model ${modelId} not found`);
  }
  
  // AI做决策
  const aiDecision = await aiMakeBidDecision(state, currentPlayer, model.modelId);
  
  // 处理决策
  const bidDecision = aiDecision.decision as BidAction;
  const newState = processBidAction(state, bidDecision);
  
  // 保存动作到数据库
  try {
    await createGameAction({
      gameId: state.gameId,
      roundNumber: state.roundNumber,
      playerPosition: currentPlayer,
      actionType: aiDecision.decision.type === "bid" ? "bid" : "pass_bid",
      cards: null,
      cardType: null,
      bidAmount: bidDecision.amount,
      thinkingTime: aiDecision.thinkingTime,
      aiReasoning: aiDecision.reasoning,
      gameState: null, // 可选：保存完整状态快照
    });
  } catch (error) {
    console.error("Failed to save game action:", error);
  }
  
  // 发送事件
  emitGameEvent({
    type: "bidding_action",
    gameId: state.gameId,
    data: {
      playerPosition: currentPlayer,
      action: aiDecision.decision,
      reasoning: aiDecision.reasoning,
      newPhase: newState.phase,
      landlordPosition: newState.landlordPosition,
    },
    timestamp: new Date(),
  });
  
  return newState;
}

/**
 * 处理出牌阶段
 */
async function processPlayingPhase(state: GameState): Promise<GameState> {
  const currentPlayer = state.currentPlayer;
  const modelId = getPlayerModelId(state, currentPlayer);
  
  // 获取模型信息
  const model = await getAiModelById(modelId);
  if (!model) {
    throw new Error(`Model ${modelId} not found`);
  }
  
  // AI做决策
  const aiDecision = await aiMakePlayDecision(state, currentPlayer, model.modelId);
  
  // 处理决策
  const playDecision = aiDecision.decision as PlayAction;
  const newState = processPlayAction(state, playDecision);
  
  // 保存动作到数据库
  try {
    await createGameAction({
      gameId: state.gameId,
      roundNumber: state.roundNumber,
      playerPosition: currentPlayer,
      actionType: aiDecision.decision.type === "play" ? "play" : "pass_play",
      cards: playDecision.type === "play" && playDecision.cards ? cardsToStrings(playDecision.cards) : null,
      cardType: playDecision.type === "play" && playDecision.cards ? 
        (await import("./cardTypes")).recognizePattern(playDecision.cards).type : null,
      bidAmount: null,
      thinkingTime: aiDecision.thinkingTime,
      aiReasoning: aiDecision.reasoning,
      gameState: null,
    });
  } catch (error) {
    console.error("Failed to save game action:", error);
  }
  
  // 发送事件
  emitGameEvent({
    type: "playing_action",
    gameId: state.gameId,
    data: {
      playerPosition: currentPlayer,
      action: aiDecision.decision,
      reasoning: aiDecision.reasoning,
      phase: newState.phase,
      winner: newState.winner,
    },
    timestamp: new Date(),
  });
  
  return newState;
}

/**
 * 完成游戏并更新统计
 */
async function finishGame(state: GameState): Promise<void> {
  const duration = Math.floor((state.finishedAt!.getTime() - state.startedAt.getTime()) / 1000);
  
  // 更新数据库
  try {
    await updateGame(state.gameId, {
      status: "finished",
      landlordPosition: state.landlordPosition!,
      winnerPosition: state.winner!,
      winnerType: state.winnerType!,
      totalRounds: state.roundNumber,
      duration,
      finishedAt: state.finishedAt,
    });
  } catch (error) {
    console.error("Failed to update game:", error);
  }
  
  // 更新每个玩家的统计数据
  for (let i = 0; i < 3; i++) {
    const position = i as PlayerPosition;
    const modelId = getPlayerModelId(state, position);
    const isLandlord = position === state.landlordPosition;
    const won = (isLandlord && state.winnerType === "landlord") || 
                (!isLandlord && state.winnerType === "farmer");
    
    // 收集该玩家的思考时间
    const thinkingTimes = state.history
      .filter(action => action.playerPosition === position)
      .map(action => 1000); // 默认值，实际应该从action中获取
    
    try {
      await updateModelStatsAfterGame(modelId, isLandlord, won, thinkingTimes, state.roundNumber);
    } catch (error) {
      console.error(`Failed to update stats for model ${modelId}:`, error);
    }
  }
  
  // 发送游戏结束事件
  emitGameEvent({
    type: "game_finished",
    gameId: state.gameId,
    data: {
      winner: state.winner,
      winnerType: state.winnerType,
      landlordPosition: state.landlordPosition,
      totalRounds: state.roundNumber,
      duration,
    },
    timestamp: new Date(),
  });
  
  // 清理内存中的游戏状态（延迟清理，给客户端时间获取最终状态）
  setTimeout(() => {
    activeSessions.delete(state.gameId);
    eventListeners.delete(state.gameId);
  }, 60000); // 1分钟后清理
}

/**
 * 获取游戏状态
 */
export function getGameState(gameId: string): GameState | undefined {
  return activeSessions.get(gameId);
}

/**
 * 获取所有活跃游戏
 */
export function getActiveGames(): string[] {
  return Array.from(activeSessions.keys());
}
