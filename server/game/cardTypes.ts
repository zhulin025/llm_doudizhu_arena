/**
 * 斗地主游戏 - 牌型识别和判断逻辑
 */

import { Card, Rank, countCards, sortCards } from "./cards";

// 牌型枚举
export enum CardType {
  INVALID = "invalid",
  SINGLE = "single",
  PAIR = "pair",
  TRIO = "trio",
  TRIO_SINGLE = "trio_single",
  TRIO_PAIR = "trio_pair",
  STRAIGHT = "straight",
  PAIR_STRAIGHT = "pair_straight",
  TRIO_STRAIGHT = "trio_straight",
  TRIO_STRAIGHT_SINGLE = "trio_straight_single",
  TRIO_STRAIGHT_PAIR = "trio_straight_pair",
  FOUR_DUAL_SINGLE = "four_dual_single",
  FOUR_DUAL_PAIR = "four_dual_pair",
  BOMB = "bomb",
  ROCKET = "rocket",
}

// 牌型信息接口
export interface CardPattern {
  type: CardType;
  value: number;        // 主牌值（用于比较大小）
  length: number;       // 牌型长度（顺子、连对等）
  cards: Card[];        // 原始牌
}

/**
 * 识别牌型
 */
export function recognizePattern(cards: Card[]): CardPattern {
  if (cards.length === 0) {
    return { type: CardType.INVALID, value: 0, length: 0, cards };
  }

  const sorted = sortCards(cards);
  const counts = countCards(sorted);
  const uniqueValues = Array.from(counts.keys()).sort((a, b) => a - b);
  
  console.log('[DEBUG] recognizePattern:', {
    cardCount: cards.length,
    cards: cards.map(c => `${c.suit}${c.rank}`),
    counts: Array.from(counts.entries()),
    uniqueValues,
  });

  // 火箭（双王）
  if (isRocket(sorted, counts)) {
    return { type: CardType.ROCKET, value: 17, length: 2, cards: sorted };
  }

  // 炸弹（4张相同）
  if (isBomb(counts)) {
    return { type: CardType.BOMB, value: uniqueValues[0]!, length: 4, cards: sorted };
  }

  // 单张
  if (cards.length === 1) {
    return { type: CardType.SINGLE, value: cards[0]!.value, length: 1, cards: sorted };
  }

  // 对子
  if (isPair(counts)) {
    return { type: CardType.PAIR, value: uniqueValues[0]!, length: 2, cards: sorted };
  }

  // 三张
  if (isTrio(counts)) {
    return { type: CardType.TRIO, value: uniqueValues[0]!, length: 3, cards: sorted };
  }

  // 三带一
  if (isTrioSingle(counts)) {
    const trioValue = findTrioValue(counts);
    return { type: CardType.TRIO_SINGLE, value: trioValue, length: 4, cards: sorted };
  }

  // 三带一对
  if (isTrioPair(counts)) {
    const trioValue = findTrioValue(counts);
    return { type: CardType.TRIO_PAIR, value: trioValue, length: 5, cards: sorted };
  }

  // 顺子（至少5张连续单牌）
  const straightResult = isStraight(uniqueValues, counts);
  if (straightResult) {
    return { type: CardType.STRAIGHT, value: straightResult.minValue, length: straightResult.length, cards: sorted };
  }

  // 连对（至少3对连续）
  const pairStraightResult = isPairStraight(uniqueValues, counts);
  if (pairStraightResult) {
    return { type: CardType.PAIR_STRAIGHT, value: pairStraightResult.minValue, length: pairStraightResult.length, cards: sorted };
  }

  // 飞机（至少2个连续三张）
  const trioStraightResult = isTrioStraight(uniqueValues, counts);
  if (trioStraightResult) {
    return { type: CardType.TRIO_STRAIGHT, value: trioStraightResult.minValue, length: trioStraightResult.length, cards: sorted };
  }

  // 飞机带单张
  const trioStraightSingleResult = isTrioStraightSingle(uniqueValues, counts);
  if (trioStraightSingleResult) {
    return { type: CardType.TRIO_STRAIGHT_SINGLE, value: trioStraightSingleResult.minValue, length: trioStraightSingleResult.length, cards: sorted };
  }

  // 飞机带对子
  const trioStraightPairResult = isTrioStraightPair(uniqueValues, counts);
  if (trioStraightPairResult) {
    return { type: CardType.TRIO_STRAIGHT_PAIR, value: trioStraightPairResult.minValue, length: trioStraightPairResult.length, cards: sorted };
  }

  // 四带二（单张）
  if (isFourDualSingle(counts)) {
    const fourValue = findFourValue(counts);
    return { type: CardType.FOUR_DUAL_SINGLE, value: fourValue, length: 6, cards: sorted };
  }

  // 四带二（对子）
  if (isFourDualPair(counts)) {
    const fourValue = findFourValue(counts);
    return { type: CardType.FOUR_DUAL_PAIR, value: fourValue, length: 8, cards: sorted };
  }

  return { type: CardType.INVALID, value: 0, length: 0, cards: sorted };
}

/**
 * 判断是否为火箭
 */
function isRocket(cards: Card[], counts: Map<number, number>): boolean {
  if (cards.length !== 2) return false;
  return cards[0]!.rank === Rank.SMALL_JOKER && cards[1]!.rank === Rank.BIG_JOKER;
}

/**
 * 判断是否为炸弹
 */
function isBomb(counts: Map<number, number>): boolean {
  if (counts.size !== 1) return false;
  return Array.from(counts.values())[0] === 4;
}

/**
 * 判断是否为对子
 */
function isPair(counts: Map<number, number>): boolean {
  if (counts.size !== 1) return false;
  return Array.from(counts.values())[0] === 2;
}

/**
 * 判断是否为三张
 */
function isTrio(counts: Map<number, number>): boolean {
  if (counts.size !== 1) return false;
  return Array.from(counts.values())[0] === 3;
}

/**
 * 判断是否为三带一
 */
function isTrioSingle(counts: Map<number, number>): boolean {
  if (counts.size !== 2) return false;
  const countValues = Array.from(counts.values()).sort((a, b) => b - a);
  return countValues[0] === 3 && countValues[1] === 1;
}

/**
 * 判断是否为三带一对
 */
function isTrioPair(counts: Map<number, number>): boolean {
  if (counts.size !== 2) return false;
  const countValues = Array.from(counts.values()).sort((a, b) => b - a);
  return countValues[0] === 3 && countValues[1] === 2;
}

/**
 * 查找三张的牌值
 */
function findTrioValue(counts: Map<number, number>): number {
  for (const value of Array.from(counts.keys())) {
    if (counts.get(value) === 3) {
      return value;
    }
  }
  return 0;
}

/**
 * 查找四张的牌值
 */
function findFourValue(counts: Map<number, number>): number {
  for (const value of Array.from(counts.keys())) {
    if (counts.get(value) === 4) {
      return value;
    }
  }
  return 0;
}

/**
 * 判断是否为顺子
 */
function isStraight(uniqueValues: number[], counts: Map<number, number>): { minValue: number; length: number } | null {
  if (uniqueValues.length < 5) return null;
  
  // 顺子不能包含2和王
  if (uniqueValues.some(v => v >= 15)) return null;
  
  // 检查是否所有牌都是单张
  for (const value of uniqueValues) {
    if (counts.get(value) !== 1) return null;
  }
  
  // 检查是否连续
  for (let i = 1; i < uniqueValues.length; i++) {
    if (uniqueValues[i]! - uniqueValues[i - 1]! !== 1) return null;
  }
  
  return { minValue: uniqueValues[0]!, length: uniqueValues.length };
}

/**
 * 判断是否为连对
 */
function isPairStraight(uniqueValues: number[], counts: Map<number, number>): { minValue: number; length: number } | null {
  if (uniqueValues.length < 3) return null;
  
  // 连对不能包含2和王
  if (uniqueValues.some(v => v >= 15)) return null;
  
  // 检查是否所有牌都是对子
  for (const value of uniqueValues) {
    if (counts.get(value) !== 2) return null;
  }
  
  // 检查是否连续
  for (let i = 1; i < uniqueValues.length; i++) {
    if (uniqueValues[i]! - uniqueValues[i - 1]! !== 1) return null;
  }
  
  return { minValue: uniqueValues[0]!, length: uniqueValues.length };
}

/**
 * 判断是否为飞机（不带翅膀）
 */
function isTrioStraight(uniqueValues: number[], counts: Map<number, number>): { minValue: number; length: number } | null {
  if (uniqueValues.length < 2) return null;
  
  // 飞机不能包含2和王
  if (uniqueValues.some(v => v >= 15)) return null;
  
  // 检查是否所有牌都是三张
  for (const value of uniqueValues) {
    if (counts.get(value) !== 3) return null;
  }
  
  // 检查是否连续
  for (let i = 1; i < uniqueValues.length; i++) {
    if (uniqueValues[i]! - uniqueValues[i - 1]! !== 1) return null;
  }
  
  return { minValue: uniqueValues[0]!, length: uniqueValues.length };
}

/**
 * 判断是否为飞机带单张
 */
function isTrioStraightSingle(uniqueValues: number[], counts: Map<number, number>): { minValue: number; length: number } | null {
  // 找出所有三张的牌
  const trioValues: number[] = [];
  const singleValues: number[] = [];
  
  for (const value of uniqueValues) {
    const count = counts.get(value)!;
    if (count === 3) {
      trioValues.push(value);
    } else if (count === 1) {
      singleValues.push(value);
    } else {
      return null; // 有其他数量的牌，不符合
    }
  }
  
  // 至少2个三张
  if (trioValues.length < 2) return null;
  
  // 单张数量必须等于三张数量
  if (singleValues.length !== trioValues.length) return null;
  
  // 三张不能包含2和王
  if (trioValues.some(v => v >= 15)) return null;
  
  // 检查三张是否连续
  trioValues.sort((a, b) => a - b);
  for (let i = 1; i < trioValues.length; i++) {
    if (trioValues[i]! - trioValues[i - 1]! !== 1) return null;
  }
  
  return { minValue: trioValues[0]!, length: trioValues.length };
}

/**
 * 判断是否为飞机带对子
 */
function isTrioStraightPair(uniqueValues: number[], counts: Map<number, number>): { minValue: number; length: number } | null {
  // 找出所有三张和对子的牌
  const trioValues: number[] = [];
  const pairValues: number[] = [];
  
  for (const value of uniqueValues) {
    const count = counts.get(value)!;
    if (count === 3) {
      trioValues.push(value);
    } else if (count === 2) {
      pairValues.push(value);
    } else {
      return null; // 有其他数量的牌，不符合
    }
  }
  
  // 至少2个三张
  if (trioValues.length < 2) return null;
  
  // 对子数量必须等于三张数量
  if (pairValues.length !== trioValues.length) return null;
  
  // 三张不能包含2和王
  if (trioValues.some(v => v >= 15)) return null;
  
  // 检查三张是否连续
  trioValues.sort((a, b) => a - b);
  for (let i = 1; i < trioValues.length; i++) {
    if (trioValues[i]! - trioValues[i - 1]! !== 1) return null;
  }
  
  return { minValue: trioValues[0]!, length: trioValues.length };
}

/**
 * 判断是否为四带二（单张）
 */
function isFourDualSingle(counts: Map<number, number>): boolean {
  if (counts.size !== 3) return false;
  
  const countValues = Array.from(counts.values()).sort((a, b) => b - a);
  return countValues[0] === 4 && countValues[1] === 1 && countValues[2] === 1;
}

/**
 * 判断是否为四带二（对子）
 */
function isFourDualPair(counts: Map<number, number>): boolean {
  if (counts.size !== 3) return false;
  
  const countValues = Array.from(counts.values()).sort((a, b) => b - a);
  return countValues[0] === 4 && countValues[1] === 2 && countValues[2] === 2;
}

/**
 * 比较两个牌型的大小
 * @returns 1: pattern1 > pattern2, 0: 相等, -1: pattern1 < pattern2, null: 无法比较
 */
export function comparePatterns(pattern1: CardPattern, pattern2: CardPattern): number | null {
  // 火箭最大
  if (pattern1.type === CardType.ROCKET) return 1;
  if (pattern2.type === CardType.ROCKET) return -1;
  
  // 炸弹大于其他非火箭牌型
  if (pattern1.type === CardType.BOMB && pattern2.type !== CardType.BOMB) return 1;
  if (pattern2.type === CardType.BOMB && pattern1.type !== CardType.BOMB) return -1;
  
  // 炸弹之间比较
  if (pattern1.type === CardType.BOMB && pattern2.type === CardType.BOMB) {
    return pattern1.value > pattern2.value ? 1 : pattern1.value < pattern2.value ? -1 : 0;
  }
  
  // 牌型必须相同才能比较
  if (pattern1.type !== pattern2.type) return null;
  
  // 对于顺子、连对、飞机等，长度也必须相同
  if (
    (pattern1.type === CardType.STRAIGHT ||
      pattern1.type === CardType.PAIR_STRAIGHT ||
      pattern1.type === CardType.TRIO_STRAIGHT ||
      pattern1.type === CardType.TRIO_STRAIGHT_SINGLE ||
      pattern1.type === CardType.TRIO_STRAIGHT_PAIR) &&
    pattern1.length !== pattern2.length
  ) {
    return null;
  }
  
  // 比较主牌值
  return pattern1.value > pattern2.value ? 1 : pattern1.value < pattern2.value ? -1 : 0;
}

/**
 * 判断牌型1是否可以压过牌型2
 */
export function canBeat(pattern1: CardPattern, pattern2: CardPattern): boolean {
  const result = comparePatterns(pattern1, pattern2);
  return result === 1;
}
