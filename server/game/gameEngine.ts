/**
 * 斗地主游戏引擎 - 游戏状态管理和核心逻辑
 */

import { nanoid } from "nanoid";
import { Card, dealCards, hasCards, removeCards, sortCards, cardsToStrings } from "./cards";
import { CardPattern, recognizePattern, canBeat, CardType } from "./cardTypes";

// 游戏阶段
export enum GamePhase {
  BIDDING = "bidding",     // 叫地主阶段
  PLAYING = "playing",     // 出牌阶段
  FINISHED = "finished",   // 游戏结束
}

// 玩家位置
export type PlayerPosition = 0 | 1 | 2;

// 叫地主动作
export interface BidAction {
  type: "bid" | "pass";
  amount?: number; // 1, 2, 3
}

// 出牌动作
export interface PlayAction {
  type: "play" | "pass";
  cards?: Card[];
}

// 游戏状态
export interface GameState {
  gameId: string;
  phase: GamePhase;
  
  // 玩家信息
  player0ModelId: number;
  player1ModelId: number;
  player2ModelId: number;
  
  // 手牌
  hands: {
    player0: Card[];
    player1: Card[];
    player2: Card[];
  };
  
  // 地主牌
  landlordCards: Card[];
  
  // 叫地主信息
  currentBidder: PlayerPosition;
  highestBid: number;
  highestBidder: PlayerPosition | null;
  passCount: number; // 连续pass的次数
  
  // 出牌信息
  landlordPosition: PlayerPosition | null;
  currentPlayer: PlayerPosition;
  lastPlayedCards: Card[] | null;
  lastPlayedPattern: CardPattern | null;
  lastPlayer: PlayerPosition | null;
  consecutivePasses: number; // 本轮连续pass的次数
  
  // 游戏历史
  roundNumber: number;
  history: GameAction[];
  
  // 游戏结果
  winner: PlayerPosition | null;
  winnerType: "landlord" | "farmer" | null;
  
  // 时间戳
  startedAt: Date;
  finishedAt: Date | null;
}

// 游戏动作记录
export interface GameAction {
  roundNumber: number;
  playerPosition: PlayerPosition;
  actionType: "bid" | "pass_bid" | "play" | "pass_play";
  cards?: string[];
  cardType?: string;
  bidAmount?: number;
  timestamp: Date;
}

/**
 * 创建新游戏
 */
export function createGame(
  player0ModelId: number,
  player1ModelId: number,
  player2ModelId: number
): GameState {
  const dealt = dealCards();
  
  return {
    gameId: nanoid(),
    phase: GamePhase.BIDDING,
    
    player0ModelId,
    player1ModelId,
    player2ModelId,
    
    hands: {
      player0: dealt.player0,
      player1: dealt.player1,
      player2: dealt.player2,
    },
    
    landlordCards: dealt.landlordCards,
    
    currentBidder: 0,
    highestBid: 0,
    highestBidder: null,
    passCount: 0,
    
    landlordPosition: null,
    currentPlayer: 0,
    lastPlayedCards: null,
    lastPlayedPattern: null,
    lastPlayer: null,
    consecutivePasses: 0,
    
    roundNumber: 0,
    history: [],
    
    winner: null,
    winnerType: null,
    
    startedAt: new Date(),
    finishedAt: null,
  };
}

/**
 * 处理叫地主动作
 */
export function processBidAction(state: GameState, action: BidAction): GameState {
  if (state.phase !== GamePhase.BIDDING) {
    throw new Error("Not in bidding phase");
  }
  
  const newState = { ...state };
  const currentPlayer = state.currentBidder;
  
  // 记录动作
  const gameAction: GameAction = {
    roundNumber: state.roundNumber,
    playerPosition: currentPlayer,
    actionType: action.type === "bid" ? "bid" : "pass_bid",
    bidAmount: action.amount,
    timestamp: new Date(),
  };
  newState.history = [...state.history, gameAction];
  
  if (action.type === "bid") {
    if (!action.amount || action.amount < 1 || action.amount > 3) {
      throw new Error("Invalid bid amount");
    }
    if (action.amount <= state.highestBid) {
      throw new Error("Bid amount must be higher than current highest bid");
    }
    
    newState.highestBid = action.amount;
    newState.highestBidder = currentPlayer;
    newState.passCount = 0;
    
    // 如果叫了3分，直接成为地主
    if (action.amount === 3) {
      return finalizeLandlord(newState);
    }
  } else {
    newState.passCount++;
    
    // 如果三个人都pass，重新发牌
    if (newState.passCount === 3 && newState.highestBidder === null) {
      // 这里简化处理，直接让第一个玩家成为地主
      newState.highestBid = 1;
      newState.highestBidder = 0;
      return finalizeLandlord(newState);
    }
    
    // 如果有人叫过地主，且其他两人都pass，叫地主的人成为地主
    if (newState.highestBidder !== null && newState.passCount === 2) {
      return finalizeLandlord(newState);
    }
  }
  
  // 下一个玩家
  newState.currentBidder = ((currentPlayer + 1) % 3) as PlayerPosition;
  newState.roundNumber++;
  
  return newState;
}

/**
 * 确定地主并进入出牌阶段
 */
function finalizeLandlord(state: GameState): GameState {
  if (state.highestBidder === null) {
    throw new Error("No bidder found");
  }
  
  const newState = { ...state };
  newState.landlordPosition = state.highestBidder;
  newState.phase = GamePhase.PLAYING;
  newState.currentPlayer = state.highestBidder;
  
  // 地主获得三张底牌
  const landlordHand = getPlayerHand(newState, state.highestBidder);
  const updatedHand = sortCards([...landlordHand, ...state.landlordCards]);
  setPlayerHand(newState, state.highestBidder, updatedHand);
  
  return newState;
}

/**
 * 处理出牌动作
 */
export function processPlayAction(state: GameState, action: PlayAction): GameState {
  console.log('[DEBUG] processPlayAction:', {
    phase: state.phase,
    currentPlayer: state.currentPlayer,
    actionType: action.type,
    lastPlayedPattern: state.lastPlayedPattern,
    lastPlayer: state.lastPlayer,
    consecutivePasses: state.consecutivePasses,
  });
  
  if (state.phase !== GamePhase.PLAYING) {
    throw new Error("Not in playing phase");
  }
  
  const newState = { ...state };
  const currentPlayer = state.currentPlayer;
  const hand = getPlayerHand(state, currentPlayer);
  
  if (action.type === "play") {
    if (!action.cards || action.cards.length === 0) {
      throw new Error("No cards provided");
    }
    
    // 检查是否有这些牌
    if (!hasCards(hand, action.cards)) {
      throw new Error("Player does not have these cards");
    }
    
    // 识别牌型
    const pattern = recognizePattern(action.cards);
    if (pattern.type === CardType.INVALID) {
      throw new Error("Invalid card pattern");
    }
    
    // 检查是否是新一轮（当前玩家是上次出牌的人，说明其他人都pass了）
    const isNewRound = state.lastPlayer !== null && state.lastPlayer === currentPlayer;
    if (isNewRound) {
      console.log('[DEBUG] New round detected: current player is the last player who played cards');
      // 清空上一轮的出牌记录，允许自由出牌
      newState.lastPlayedCards = null;
      newState.lastPlayedPattern = null;
      newState.consecutivePasses = 0;
    }
    
    // 如果不是第一个出牌且不是新一轮，需要检查是否能压过上家
    // 注意：这里必须使用newState，因为如果是新一轮，我们已经清空了newState.lastPlayedPattern
    if (newState.lastPlayedPattern !== null) {
      console.log('[DEBUG] Checking if can beat:', {
        yourPattern: pattern,
        lastPattern: newState.lastPlayedPattern,
        lastPlayer: newState.lastPlayer,
        lastCards: newState.lastPlayedCards,
      });
      if (!canBeat(pattern, newState.lastPlayedPattern)) {
        throw new Error(`Cannot beat last played cards. Last player (${newState.lastPlayer}) played: ${cardsToStrings(newState.lastPlayedCards || []).join(', ')}. Your cards: ${cardsToStrings(action.cards).join(', ')}`);
      }
    }
    
    // 出牌
    const newHand = removeCards(hand, action.cards);
    setPlayerHand(newState, currentPlayer, newHand);
    
    newState.lastPlayedCards = action.cards;
    newState.lastPlayedPattern = pattern;
    newState.lastPlayer = currentPlayer;
    newState.consecutivePasses = 0;
    
    // 记录动作
    const gameAction: GameAction = {
      roundNumber: state.roundNumber,
      playerPosition: currentPlayer,
      actionType: "play",
      cards: cardsToStrings(action.cards),
      cardType: pattern.type,
      timestamp: new Date(),
    };
    newState.history = [...state.history, gameAction];
    
    // 检查是否获胜
    if (newHand.length === 0) {
      return finishGame(newState, currentPlayer);
    }
  } else {
    // Pass
    // 如果是第一个出牌，不能pass
    if (state.lastPlayedPattern === null) {
      throw new Error("Cannot pass when you are the first player");
    }
    
    newState.consecutivePasses++;
    
    // 记录动作
    const gameAction: GameAction = {
      roundNumber: state.roundNumber,
      playerPosition: currentPlayer,
      actionType: "pass_play",
      timestamp: new Date(),
    };
    newState.history = [...state.history, gameAction];
    
    // 如果连续两个人pass，轮到出牌的人重新出牌
    if (newState.consecutivePasses === 2) {
      newState.lastPlayedCards = null;
      newState.lastPlayedPattern = null;
      newState.consecutivePasses = 0;
      // 下一个玩家就是上次出牌的人
      newState.currentPlayer = state.lastPlayer!;
      newState.roundNumber++;
      return newState;
    }
  }
  
  // 下一个玩家
  newState.currentPlayer = ((currentPlayer + 1) % 3) as PlayerPosition;
  newState.roundNumber++;
  
  return newState;
}

/**
 * 结束游戏
 */
function finishGame(state: GameState, winner: PlayerPosition): GameState {
  const newState = { ...state };
  newState.phase = GamePhase.FINISHED;
  newState.winner = winner;
  newState.winnerType = winner === state.landlordPosition ? "landlord" : "farmer";
  newState.finishedAt = new Date();
  
  return newState;
}

/**
 * 获取玩家手牌
 */
export function getPlayerHand(state: GameState, position: PlayerPosition): Card[] {
  switch (position) {
    case 0:
      return state.hands.player0;
    case 1:
      return state.hands.player1;
    case 2:
      return state.hands.player2;
  }
}

/**
 * 设置玩家手牌
 */
function setPlayerHand(state: GameState, position: PlayerPosition, hand: Card[]): void {
  switch (position) {
    case 0:
      state.hands.player0 = hand;
      break;
    case 1:
      state.hands.player1 = hand;
      break;
    case 2:
      state.hands.player2 = hand;
      break;
  }
}

/**
 * 获取玩家模型ID
 */
export function getPlayerModelId(state: GameState, position: PlayerPosition): number {
  switch (position) {
    case 0:
      return state.player0ModelId;
    case 1:
      return state.player1ModelId;
    case 2:
      return state.player2ModelId;
  }
}

/**
 * 获取游戏状态的公开信息（隐藏其他玩家的手牌）
 */
export function getPublicGameState(state: GameState, forPlayer: PlayerPosition): any {
  return {
    gameId: state.gameId,
    phase: state.phase,
    roundNumber: state.roundNumber,
    
    // 当前玩家的完整手牌
    myHand: cardsToStrings(getPlayerHand(state, forPlayer)),
    
    // 其他玩家的手牌数量
    player0HandCount: state.hands.player0.length,
    player1HandCount: state.hands.player1.length,
    player2HandCount: state.hands.player2.length,
    
    // 地主信息
    landlordPosition: state.landlordPosition,
    landlordCards: state.phase === GamePhase.PLAYING ? cardsToStrings(state.landlordCards) : null,
    
    // 叫地主信息
    currentBidder: state.phase === GamePhase.BIDDING ? state.currentBidder : null,
    highestBid: state.highestBid,
    highestBidder: state.highestBidder,
    
    // 出牌信息
    currentPlayer: state.phase === GamePhase.PLAYING ? state.currentPlayer : null,
    lastPlayedCards: state.lastPlayedCards ? cardsToStrings(state.lastPlayedCards) : null,
    lastPlayer: state.lastPlayer,
    
    // 游戏结果
    winner: state.winner,
    winnerType: state.winnerType,
  };
}
