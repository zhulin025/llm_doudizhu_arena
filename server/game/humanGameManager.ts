/**
 * 人类玩家游戏管理器
 */

import { GameState, GamePhase, PlayerPosition, BidAction, PlayAction, createGame, processBidAction, processPlayAction, getPlayerModelId, getPlayerHand } from "./gameEngine";
import { aiMakeBidDecision, aiMakePlayDecision } from "./aiPlayer";
import { createGame as dbCreateGame, updateGame, createGameAction, updateModelStatsAfterGame, getAiModelById } from "../db";
import { cardsToStrings } from "./cards";

// 人类玩家游戏会话
export interface HumanGameSession {
  gameState: GameState;
  humanPlayerPosition: PlayerPosition;
  waitingForHuman: boolean;
  currentAction: "bidding" | "playing" | null;
}

// 人类游戏会话存储
const humanGameSessions = new Map<string, HumanGameSession>();

// 游戏事件类型
export type HumanGameEvent = {
  type: "game_created" | "ai_action" | "waiting_for_human" | "human_action" | "game_finished" | "error";
  gameId: string;
  data: any;
  timestamp: Date;
};

// 事件监听器
type HumanGameEventListener = (event: HumanGameEvent) => void;
const humanEventListeners = new Map<string, HumanGameEventListener[]>();

/**
 * 订阅人类游戏事件
 */
export function subscribeToHumanGame(gameId: string, listener: HumanGameEventListener): () => void {
  if (!humanEventListeners.has(gameId)) {
    humanEventListeners.set(gameId, []);
  }
  
  const listeners = humanEventListeners.get(gameId)!;
  listeners.push(listener);
  
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
function emitHumanGameEvent(event: HumanGameEvent): void {
  const listeners = humanEventListeners.get(event.gameId);
  if (listeners) {
    listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error("Error in human game event listener:", error);
      }
    });
  }
}

/**
 * 创建人类玩家游戏
 * @param humanPlayerPosition 人类玩家位置 (0, 1, 或 2)
 * @param ai1ModelId AI玩家1的模型ID
 * @param ai2ModelId AI玩家2的模型ID
 */
export async function startHumanGame(
  humanPlayerPosition: PlayerPosition,
  ai1ModelId: number,
  ai2ModelId: number
): Promise<string> {
  // 根据人类玩家位置分配模型ID
  let player0ModelId: number;
  let player1ModelId: number;
  let player2ModelId: number;
  
  // 使用 -1 表示人类玩家
  if (humanPlayerPosition === 0) {
    player0ModelId = -1;
    player1ModelId = ai1ModelId;
    player2ModelId = ai2ModelId;
  } else if (humanPlayerPosition === 1) {
    player0ModelId = ai1ModelId;
    player1ModelId = -1;
    player2ModelId = ai2ModelId;
  } else {
    player0ModelId = ai1ModelId;
    player1ModelId = ai2ModelId;
    player2ModelId = -1;
  }
  
  // 创建游戏状态
  const gameState = createGame(player0ModelId, player1ModelId, player2ModelId);
  const gameId = gameState.gameId;
  
  // 创建人类游戏会话
  const session: HumanGameSession = {
    gameState,
    humanPlayerPosition,
    waitingForHuman: humanPlayerPosition === 0, // 如果人类是第一个玩家，立即等待
    currentAction: gameState.phase === GamePhase.BIDDING ? "bidding" : null,
  };
  
  humanGameSessions.set(gameId, session);
  
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
    console.error("Failed to save human game to database:", error);
  }
  
  // 发送游戏创建事件
  emitHumanGameEvent({
    type: "game_created",
    gameId,
    data: { gameState, humanPlayerPosition },
    timestamp: new Date(),
  });
  
  // 如果第一个玩家不是人类，开始AI回合
  if (humanPlayerPosition !== 0) {
    processAITurns(gameId).catch(error => {
      console.error(`Human game ${gameId} error:`, error);
    });
  } else {
    // 通知等待人类操作
    emitHumanGameEvent({
      type: "waiting_for_human",
      gameId,
      data: { phase: gameState.phase, position: humanPlayerPosition },
      timestamp: new Date(),
    });
  }
  
  return gameId;
}

/**
 * 处理AI回合（直到轮到人类玩家）
 */
async function processAITurns(gameId: string): Promise<void> {
  const session = humanGameSessions.get(gameId);
  if (!session) {
    throw new Error("Game session not found");
  }
  
  let state = session.gameState;
  
  // 持续处理AI回合，直到轮到人类或游戏结束
  while (state.phase !== GamePhase.FINISHED) {
    const currentPlayer = state.phase === GamePhase.BIDDING ? state.currentBidder : state.currentPlayer;
    
    // 如果轮到人类玩家，停止并等待
    if (currentPlayer === session.humanPlayerPosition) {
      session.waitingForHuman = true;
      session.currentAction = state.phase === GamePhase.BIDDING ? "bidding" : "playing";
      
      emitHumanGameEvent({
        type: "waiting_for_human",
        gameId,
        data: { phase: state.phase, position: currentPlayer },
        timestamp: new Date(),
      });
      
      break;
    }
    
    // AI玩家回合
    if (state.phase === GamePhase.BIDDING) {
      state = await processAIBiddingTurn(session, state, currentPlayer);
    } else if (state.phase === GamePhase.PLAYING) {
      state = await processAIPlayingTurn(session, state, currentPlayer);
    }
    
    session.gameState = state;
    humanGameSessions.set(gameId, session);
  }
  
  // 检查游戏是否结束
  if (state.phase === GamePhase.FINISHED) {
    await finishHumanGame(session);
  }
}

/**
 * 处理AI叫地主回合
 */
async function processAIBiddingTurn(
  session: HumanGameSession,
  state: GameState,
  currentPlayer: PlayerPosition
): Promise<GameState> {
  const modelId = getPlayerModelId(state, currentPlayer);
  const model = await getAiModelById(modelId);
  
  if (!model) {
    throw new Error(`Model ${modelId} not found`);
  }
  
  const aiDecision = await aiMakeBidDecision(state, currentPlayer, model.modelId);
  const bidDecision = aiDecision.decision as BidAction;
  const newState = processBidAction(state, bidDecision);
  
  // 保存动作
  try {
    await createGameAction({
      gameId: state.gameId,
      roundNumber: state.roundNumber,
      playerPosition: currentPlayer,
      actionType: aiDecision.decision.type === "bid" ? "bid" : "pass_bid",
      cards: null,
      cardType: null,
      bidAmount: bidDecision.amount || null,
      thinkingTime: aiDecision.thinkingTime,
      aiReasoning: aiDecision.reasoning,
      gameState: null,
    });
  } catch (error) {
    console.error("Failed to save AI bidding action:", error);
  }
  
  // 发送AI动作事件
  emitHumanGameEvent({
    type: "ai_action",
    gameId: state.gameId,
    data: {
      playerPosition: currentPlayer,
      action: aiDecision.decision,
      reasoning: aiDecision.reasoning,
      phase: newState.phase,
    },
    timestamp: new Date(),
  });
  
  return newState;
}

/**
 * 处理AI出牌回合
 */
async function processAIPlayingTurn(
  session: HumanGameSession,
  state: GameState,
  currentPlayer: PlayerPosition
): Promise<GameState> {
  const modelId = getPlayerModelId(state, currentPlayer);
  const model = await getAiModelById(modelId);
  
  if (!model) {
    throw new Error(`Model ${modelId} not found`);
  }
  
  const aiDecision = await aiMakePlayDecision(state, currentPlayer, model.modelId);
  const newState = processPlayAction(state, aiDecision.decision as PlayAction);
  
  // 保存动作
  try {
    const playDecision = aiDecision.decision as PlayAction;
    await createGameAction({
      gameId: state.gameId,
      roundNumber: state.roundNumber,
      playerPosition: currentPlayer,
      actionType: playDecision.type === "play" ? "play" : "pass_play",
      cards: playDecision.type === "play" && playDecision.cards ? cardsToStrings(playDecision.cards) : null,
      cardType: playDecision.type === "play" && playDecision.cards ? 
        (await import("./cardTypes")).recognizePattern(playDecision.cards).type : null,
      bidAmount: null,
      thinkingTime: aiDecision.thinkingTime,
      aiReasoning: aiDecision.reasoning,
      gameState: null,
    });
  } catch (error) {
    console.error("Failed to save AI playing action:", error);
  }
  
  // 发送AI动作事件
  emitHumanGameEvent({
    type: "ai_action",
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
 * 人类玩家叫地主
 */
export async function humanBidAction(gameId: string, action: BidAction): Promise<void> {
  const session = humanGameSessions.get(gameId);
  if (!session) {
    throw new Error("Game session not found");
  }
  
  if (!session.waitingForHuman || session.currentAction !== "bidding") {
    throw new Error("Not waiting for human bidding action");
  }
  
  const state = session.gameState;
  const currentPlayer = state.currentBidder;
  
  if (currentPlayer !== session.humanPlayerPosition) {
    throw new Error("Not human player's turn");
  }
  
  // 处理人类玩家动作
  const newState = processBidAction(state, action);
  session.gameState = newState;
  session.waitingForHuman = false;
  session.currentAction = null;
  
  // 保存动作
  try {
    await createGameAction({
      gameId: state.gameId,
      roundNumber: state.roundNumber,
      playerPosition: currentPlayer,
      actionType: action.type === "bid" ? "bid" : "pass_bid",
      cards: null,
      cardType: null,
      bidAmount: action.type === "bid" ? action.amount : null,
      thinkingTime: 0,
      aiReasoning: "Human player action",
      gameState: null,
    });
  } catch (error) {
    console.error("Failed to save human bidding action:", error);
  }
  
  // 发送人类动作事件
  emitHumanGameEvent({
    type: "human_action",
    gameId: state.gameId,
    data: {
      playerPosition: currentPlayer,
      action,
      phase: newState.phase,
    },
    timestamp: new Date(),
  });
  
  humanGameSessions.set(gameId, session);
  
  // 继续AI回合
  await processAITurns(gameId);
}

/**
 * 人类玩家出牌
 */
export async function humanPlayAction(gameId: string, action: PlayAction): Promise<void> {
  const session = humanGameSessions.get(gameId);
  if (!session) {
    throw new Error("Game session not found");
  }
  
  if (!session.waitingForHuman || session.currentAction !== "playing") {
    throw new Error("Not waiting for human playing action");
  }
  
  const state = session.gameState;
  const currentPlayer = state.currentPlayer;
  
  if (currentPlayer !== session.humanPlayerPosition) {
    throw new Error("Not human player's turn");
  }
  
  // 调试日志
  console.log('[DEBUG] humanPlayAction:', {
    currentPlayer,
    hand: getPlayerHand(state, currentPlayer).map(c => ({ suit: c.suit, rank: c.rank, value: c.value })),
    actionCards: action.type === 'play' ? action.cards?.map(c => ({ suit: c.suit, rank: c.rank, value: (c as any).value })) : null,
  });
  
  // 处理人类玩家动作
  const newState = processPlayAction(state, action);
  session.gameState = newState;
  session.waitingForHuman = false;
  session.currentAction = null;
  
  // 保存动作
  try {
    await createGameAction({
      gameId: state.gameId,
      roundNumber: state.roundNumber,
      playerPosition: currentPlayer,
      actionType: action.type === "play" ? "play" : "pass_play",
      cards: action.type === "play" && action.cards ? cardsToStrings(action.cards) : null,
      cardType: action.type === "play" && action.cards ? 
        (await import("./cardTypes")).recognizePattern(action.cards).type : null,
      bidAmount: null,
      thinkingTime: 0,
      aiReasoning: "Human player action",
      gameState: null,
    });
  } catch (error) {
    console.error("Failed to save human playing action:", error);
  }
  
  // 发送人类动作事件
  emitHumanGameEvent({
    type: "human_action",
    gameId: state.gameId,
    data: {
      playerPosition: currentPlayer,
      action,
      phase: newState.phase,
      winner: newState.winner,
    },
    timestamp: new Date(),
  });
  
  humanGameSessions.set(gameId, session);
  
  // 继续AI回合或结束游戏
  await processAITurns(gameId);
}

/**
 * 获取人类游戏会话
 */
export function getHumanGameSession(gameId: string): HumanGameSession | undefined {
  return humanGameSessions.get(gameId);
}

/**
 * 完成人类游戏
 */
async function finishHumanGame(session: HumanGameSession): Promise<void> {
  const state = session.gameState;
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
    console.error("Failed to update human game:", error);
  }
  
  // 更新AI玩家统计（跳过人类玩家）
  for (let i = 0; i < 3; i++) {
    const position = i as PlayerPosition;
    if (position === session.humanPlayerPosition) {
      continue; // 跳过人类玩家
    }
    
    const modelId = getPlayerModelId(state, position);
    const isLandlord = position === state.landlordPosition;
    const won = (isLandlord && state.winnerType === "landlord") || 
                (!isLandlord && state.winnerType === "farmer");
    
    const thinkingTimes = state.history
      .filter(action => action.playerPosition === position)
      .map(() => 1000);
    
    try {
      await updateModelStatsAfterGame(modelId, isLandlord, won, thinkingTimes, state.roundNumber);
    } catch (error) {
      console.error(`Failed to update stats for model ${modelId}:`, error);
    }
  }
  
  // 发送游戏结束事件
  emitHumanGameEvent({
    type: "game_finished",
    gameId: state.gameId,
    data: {
      winner: state.winner,
      winnerType: state.winnerType,
      landlordPosition: state.landlordPosition,
      totalRounds: state.roundNumber,
      duration,
      humanWon: state.winner === session.humanPlayerPosition,
    },
    timestamp: new Date(),
  });
  
  // 延迟清理
  setTimeout(() => {
    humanGameSessions.delete(state.gameId);
    humanEventListeners.delete(state.gameId);
  }, 60000);
}
