/**
 * 智能出牌提示系统
 * 分析当前手牌和局势，推荐最优出牌组合
 */

type Card = {
  suit: string;
  rank: string;
};

// 牌面值映射
const RANK_VALUES: Record<string, number> = {
  '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14, '2': 15,
  '小王': 16, '大王': 17
};

function getCardValue(card: Card): number {
  return RANK_VALUES[card.rank] || 0;
}

/**
 * 按rank分组手牌
 */
function groupByRank(cards: Card[]): Map<string, Card[]> {
  const groups = new Map<string, Card[]>();
  for (const card of cards) {
    const existing = groups.get(card.rank) || [];
    existing.push(card);
    groups.set(card.rank, existing);
  }
  return groups;
}

/**
 * 查找顺子
 */
function findStraights(cards: Card[], minLength: number = 5): Card[][] {
  const groups = groupByRank(cards);
  const ranks = Array.from(groups.keys())
    .filter(r => r !== '小王' && r !== '大王' && r !== '2')
    .sort((a, b) => getCardValue({ suit: '', rank: a }) - getCardValue({ suit: '', rank: b }));
  
  const straights: Card[][] = [];
  
  for (let i = 0; i < ranks.length; i++) {
    const straight: Card[] = [];
    let currentValue = getCardValue({ suit: '', rank: ranks[i]! });
    
    for (let j = i; j < ranks.length; j++) {
      const rank = ranks[j]!;
      const value = getCardValue({ suit: '', rank });
      
      if (value === currentValue) {
        const group = groups.get(rank)!;
        straight.push(group[0]!);
        currentValue++;
      } else if (value === currentValue + 1) {
        const group = groups.get(rank)!;
        straight.push(group[0]!);
        currentValue = value + 1;
      } else {
        break;
      }
    }
    
    if (straight.length >= minLength) {
      straights.push(straight);
    }
  }
  
  return straights;
}

/**
 * 获取出牌提示
 */
export function getHint(hand: Card[], lastPlayed: Card[] | null): {
  cards: Card[];
  description: string;
} | null {
  if (!hand || hand.length === 0) return null;
  
  const groups = groupByRank(hand);
  const sortedGroups = Array.from(groups.entries())
    .sort((a, b) => a[1].length - b[1].length || getCardValue(a[1][0]!) - getCardValue(b[1][0]!));
  
  // 如果没有上家出牌，推荐最小的牌
  if (!lastPlayed || lastPlayed.length === 0) {
    // 优先出单张
    const singles = sortedGroups.filter(([_, cards]) => cards.length >= 1);
    if (singles.length > 0) {
      const [rank, cards] = singles[0]!;
      return {
        cards: [cards[0]!],
        description: `出单张 ${rank}`
      };
    }
  }
  
  // 分析上家出牌类型
  if (!lastPlayed) return null;
  const lastPlayedGroups = groupByRank(lastPlayed);
  const lastPlayedCount = lastPlayed.length;
  
  // 单张
  if (lastPlayedCount === 1) {
    const lastValue = getCardValue(lastPlayed[0]!);
    for (const [rank, cards] of sortedGroups) {
      if (cards.length >= 1 && getCardValue(cards[0]!) > lastValue) {
        return {
          cards: [cards[0]!],
          description: `出单张 ${rank} 压过 ${lastPlayed[0]!.rank}`
        };
      }
    }
  }
  
  // 对子
  if (lastPlayedCount === 2 && lastPlayedGroups.size === 1) {
    const lastValue = getCardValue(lastPlayed[0]!);
    for (const [rank, cards] of sortedGroups) {
      if (cards.length >= 2 && getCardValue(cards[0]!) > lastValue) {
        return {
          cards: [cards[0]!, cards[1]!],
          description: `出对子 ${rank}${rank} 压过 ${lastPlayed[0]!.rank}${lastPlayed[0]!.rank}`
        };
      }
    }
  }
  
  // 三张
  if (lastPlayedCount === 3 && lastPlayedGroups.size === 1) {
    const lastValue = getCardValue(lastPlayed[0]!);
    for (const [rank, cards] of sortedGroups) {
      if (cards.length >= 3 && getCardValue(cards[0]!) > lastValue) {
        return {
          cards: [cards[0]!, cards[1]!, cards[2]!],
          description: `出三张 ${rank}${rank}${rank} 压过上家`
        };
      }
    }
  }
  
  // 炸弹
  const bombs = sortedGroups.filter(([_, cards]) => cards.length === 4);
  if (bombs.length > 0) {
    const [rank, cards] = bombs[0]!;
    return {
      cards: cards,
      description: `出炸弹 ${rank}${rank}${rank}${rank}！`
    };
  }
  
  // 王炸
  const hasSmallJoker = groups.has('小王');
  const hasBigJoker = groups.has('大王');
  if (hasSmallJoker && hasBigJoker) {
    return {
      cards: [...groups.get('小王')!, ...groups.get('大王')!],
      description: '出王炸！'
    };
  }
  
  return null;
}

/**
 * 获取所有可能的出牌组合
 */
export function getAllPossiblePlays(hand: Card[]): {
  cards: Card[];
  description: string;
}[] {
  const plays: { cards: Card[]; description: string; }[] = [];
  const groups = groupByRank(hand);
  
  // 单张
  for (const [rank, cards] of Array.from(groups.entries())) {
    if (cards.length >= 1) {
      plays.push({
        cards: [cards[0]!],
        description: `单张 ${rank}`
      });
    }
  }
  
  // 对子
  for (const [rank, cards] of Array.from(groups.entries())) {
    if (cards.length >= 2) {
      plays.push({
        cards: [cards[0]!, cards[1]!],
        description: `对子 ${rank}${rank}`
      });
    }
  }
  
  // 三张
  for (const [rank, cards] of Array.from(groups.entries())) {
    if (cards.length >= 3) {
      plays.push({
        cards: [cards[0]!, cards[1]!, cards[2]!],
        description: `三张 ${rank}${rank}${rank}`
      });
    }
  }
  
  // 炸弹
  for (const [rank, cards] of Array.from(groups.entries())) {
    if (cards.length === 4) {
      plays.push({
        cards: cards,
        description: `炸弹 ${rank}${rank}${rank}${rank}`
      });
    }
  }
  
  // 王炸
  if (groups.has('小王') && groups.has('大王')) {
    plays.push({
      cards: [...groups.get('小王')!, ...groups.get('大王')!],
      description: '王炸'
    });
  }
  
  // 顺子
  const straights = findStraights(hand, 5);
  for (const straight of straights) {
    plays.push({
      cards: straight,
      description: `顺子 ${straight.map(c => c.rank).join('')}`
    });
  }
  
  return plays;
}
