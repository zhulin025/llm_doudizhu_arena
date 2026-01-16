/**
 * 手牌排序工具
 * 支持多种排序模式：按点数、按花色、按牌型
 */

type Card = {
  suit: string;
  rank: string;
};

export type SortMode = 'rank' | 'suit' | 'pattern';

// 牌面值映射
const RANK_VALUES: Record<string, number> = {
  '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14, '2': 15,
  '小王': 16, '大王': 17
};

// 花色优先级（用于同点数排序）
const SUIT_PRIORITY: Record<string, number> = {
  '♦': 1, // 方块
  '♣': 2, // 梅花
  '♥': 3, // 红桃
  '♠': 4, // 黑桃
  'Joker': 5 // 王
};

/**
 * 获取牌的数值
 */
function getCardValue(card: Card): number {
  return RANK_VALUES[card.rank] || 0;
}

/**
 * 获取花色优先级
 */
function getSuitPriority(card: Card): number {
  return SUIT_PRIORITY[card.suit] || 0;
}

/**
 * 按点数排序（升序）
 */
export function sortByRank(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => {
    const rankDiff = getCardValue(a) - getCardValue(b);
    if (rankDiff !== 0) return rankDiff;
    // 点数相同时按花色排序
    return getSuitPriority(a) - getSuitPriority(b);
  });
}

/**
 * 按花色排序
 * 先按花色分组，组内按点数排序
 */
export function sortBySuit(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => {
    const suitDiff = getSuitPriority(a) - getSuitPriority(b);
    if (suitDiff !== 0) return suitDiff;
    // 花色相同时按点数排序
    return getCardValue(a) - getCardValue(b);
  });
}

/**
 * 按牌型排序（智能分组）
 * 将相同点数的牌放在一起，便于识别牌型
 */
export function sortByPattern(cards: Card[]): Card[] {
  // 按rank分组
  const rankGroups = new Map<string, Card[]>();
  for (const card of cards) {
    const existing = rankGroups.get(card.rank) || [];
    existing.push(card);
    rankGroups.set(card.rank, existing);
  }
  
  // 按组大小和rank值排序
  const sortedGroups = Array.from(rankGroups.entries())
    .sort((a, b) => {
      // 先按组大小降序（4张>3张>2张>1张）
      const sizeDiff = b[1].length - a[1].length;
      if (sizeDiff !== 0) return sizeDiff;
      
      // 组大小相同时按点数升序
      return getCardValue(a[1][0]!) - getCardValue(b[1][0]!);
    });
  
  // 组内按花色排序
  const result: Card[] = [];
  for (const [_, group] of sortedGroups) {
    const sortedGroup = group.sort((a, b) => getSuitPriority(a) - getSuitPriority(b));
    result.push(...sortedGroup);
  }
  
  return result;
}

/**
 * 根据排序模式排序手牌
 */
export function sortCards(cards: Card[], mode: SortMode): Card[] {
  switch (mode) {
    case 'rank':
      return sortByRank(cards);
    case 'suit':
      return sortBySuit(cards);
    case 'pattern':
      return sortByPattern(cards);
    default:
      return cards;
  }
}

/**
 * 获取排序模式的友好名称
 */
export function getSortModeName(mode: SortMode): string {
  const names: Record<SortMode, string> = {
    'rank': '按点数',
    'suit': '按花色',
    'pattern': '按牌型'
  };
  return names[mode];
}

/**
 * 获取排序模式的描述
 */
export function getSortModeDescription(mode: SortMode): string {
  const descriptions: Record<SortMode, string> = {
    'rank': '按牌面大小从小到大排列',
    'suit': '按花色分组，组内按点数排列',
    'pattern': '相同点数的牌放在一起，便于识别牌型'
  };
  return descriptions[mode];
}
