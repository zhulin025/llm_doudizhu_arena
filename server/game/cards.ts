/**
 * 斗地主游戏 - 扑克牌数据结构和工具函数
 */

// 花色枚举
export enum Suit {
  SPADE = "♠",    // 黑桃
  HEART = "♥",    // 红桃
  CLUB = "♣",     // 梅花
  DIAMOND = "♦",  // 方块
  JOKER = "🃏",   // 王
}

// 牌面值枚举（按大小排序）
export enum Rank {
  THREE = "3",
  FOUR = "4",
  FIVE = "5",
  SIX = "6",
  SEVEN = "7",
  EIGHT = "8",
  NINE = "9",
  TEN = "10",
  JACK = "J",
  QUEEN = "Q",
  KING = "K",
  ACE = "A",
  TWO = "2",
  SMALL_JOKER = "小王",
  BIG_JOKER = "大王",
}

// 扑克牌接口
export interface Card {
  suit: Suit;
  rank: Rank;
  value: number; // 用于比较大小的数值
}



// 牌面值到数值的映射
const RANK_VALUES: Record<Rank, number> = {
  [Rank.THREE]: 3,
  [Rank.FOUR]: 4,
  [Rank.FIVE]: 5,
  [Rank.SIX]: 6,
  [Rank.SEVEN]: 7,
  [Rank.EIGHT]: 8,
  [Rank.NINE]: 9,
  [Rank.TEN]: 10,
  [Rank.JACK]: 11,
  [Rank.QUEEN]: 12,
  [Rank.KING]: 13,
  [Rank.ACE]: 14,
  [Rank.TWO]: 15,
  [Rank.SMALL_JOKER]: 16,
  [Rank.BIG_JOKER]: 17,
};

/**
 * 创建一副完整的扑克牌（54张）
 */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  
  // 添加普通牌（52张）
  const suits = [Suit.SPADE, Suit.HEART, Suit.CLUB, Suit.DIAMOND];
  const ranks = [
    Rank.THREE, Rank.FOUR, Rank.FIVE, Rank.SIX, Rank.SEVEN,
    Rank.EIGHT, Rank.NINE, Rank.TEN, Rank.JACK, Rank.QUEEN,
    Rank.KING, Rank.ACE, Rank.TWO
  ];
  
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({
        suit,
        rank,
        value: RANK_VALUES[rank],
      });
    }
  }
  
  // 添加大小王
  deck.push({
    suit: Suit.JOKER,
    rank: Rank.SMALL_JOKER,
    value: RANK_VALUES[Rank.SMALL_JOKER],
  });
  
  deck.push({
    suit: Suit.JOKER,
    rank: Rank.BIG_JOKER,
    value: RANK_VALUES[Rank.BIG_JOKER],
  });
  
  return deck;
}

/**
 * 洗牌（Fisher-Yates算法）
 */
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  return shuffled;
}

/**
 * 发牌
 * @returns 返回三个玩家的手牌和三张底牌
 */
export function dealCards(): {
  player0: Card[];
  player1: Card[];
  player2: Card[];
  landlordCards: Card[];
} {
  const deck = shuffleDeck(createDeck());
  
  return {
    player0: sortCards(deck.slice(0, 17)),
    player1: sortCards(deck.slice(17, 34)),
    player2: sortCards(deck.slice(34, 51)),
    landlordCards: sortCards(deck.slice(51, 54)),
  };
}

/**
 * 排序手牌（按牌面值从小到大）
 */
export function sortCards(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => a.value - b.value);
}

/**
 * 将牌转换为字符串表示
 */
export function cardToString(card: Card): string {
  if (card.rank === Rank.SMALL_JOKER || card.rank === Rank.BIG_JOKER) {
    return card.rank;
  }
  return `${card.suit}${card.rank}`;
}

/**
 * 将牌数组转换为字符串数组
 */
export function cardsToStrings(cards: Card[]): string[] {
  return cards.map(cardToString);
}

/**
 * 从字符串解析牌
 */
export function stringToCard(str: string): Card | null {
  if (str === Rank.SMALL_JOKER) {
    return {
      suit: Suit.JOKER,
      rank: Rank.SMALL_JOKER,
      value: RANK_VALUES[Rank.SMALL_JOKER],
    };
  }
  
  if (str === Rank.BIG_JOKER) {
    return {
      suit: Suit.JOKER,
      rank: Rank.BIG_JOKER,
      value: RANK_VALUES[Rank.BIG_JOKER],
    };
  }
  
  // 解析普通牌
  const suitChar = str[0];
  const rankStr = str.slice(1);
  
  const suit = Object.values(Suit).find(s => s === suitChar);
  const rank = Object.values(Rank).find(r => r === rankStr);
  
  if (!suit || !rank) {
    return null;
  }
  
  return {
    suit,
    rank,
    value: RANK_VALUES[rank],
  };
}

/**
 * 从字符串数组解析牌数组
 */
export function stringsToCards(strings: string[]): Card[] {
  const cards: Card[] = [];
  for (const str of strings) {
    const card = stringToCard(str);
    if (card) {
      cards.push(card);
    }
  }
  return cards;
}

/**
 * 统计牌的数量分布
 * @returns Record<value, count>
 */
export function countCards(cards: Card[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const card of cards) {
    counts.set(card.value, (counts.get(card.value) || 0) + 1);
  }
  return counts;
}

/**
 * 检查手牌中是否包含指定的牌
 */
export function hasCards(hand: Card[], cards: Card[]): boolean {
  // 使用suit+rank来比较，而不是value
  const handCardIds = hand.map(c => `${c.suit}-${c.rank}`);
  const cardIds = cards.map(c => `${c.suit}-${c.rank}`);
  
  console.log('[DEBUG] hasCards:', {
    hand: hand.map(c => ({ suit: c.suit, rank: c.rank, value: c.value })),
    cards: cards.map(c => ({ suit: c.suit, rank: c.rank, value: c.value })),
    handCardIds,
    cardIds,
  });
  
  // 统计每种牌ID的数量
  const handCounts = new Map<string, number>();
  handCardIds.forEach(id => handCounts.set(id, (handCounts.get(id) || 0) + 1));
  
  const cardCounts = new Map<string, number>();
  cardIds.forEach(id => cardCounts.set(id, (cardCounts.get(id) || 0) + 1));
  
  // 检查每种牌ID的数量是否足够
  for (const [cardId, needCount] of Array.from(cardCounts.entries())) {
    const haveCount = handCounts.get(cardId) || 0;
    if (haveCount < needCount) {
      console.log(`[DEBUG] hasCards FAILED: cardId=${cardId}, need=${needCount}, have=${haveCount}`);
      return false;
    }
  }
  
  return true;
}

/**
 * 从手牌中移除指定的牌
 */
export function removeCards(hand: Card[], cards: Card[]): Card[] {
  const result = [...hand];
  
  // 统计需要移除的牌ID
  const cardCounts = new Map<string, number>();
  cards.forEach(c => {
    const id = `${c.suit}-${c.rank}`;
    cardCounts.set(id, (cardCounts.get(id) || 0) + 1);
  });
  
  // 从后往前移除匹配的牌
  for (const [cardId, count] of Array.from(cardCounts.entries())) {
    let removed = 0;
    for (let i = result.length - 1; i >= 0 && removed < count; i--) {
      const id = `${result[i]!.suit}-${result[i]!.rank}`;
      if (id === cardId) {
        result.splice(i, 1);
        removed++;
      }
    }
  }
  
  return result;
}
