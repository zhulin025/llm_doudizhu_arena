/**
 * 客户端出牌合法性验证工具
 */

type Card = {
  suit: string;
  rank: string;
};

type CardPattern = {
  type: string;
  rank?: number;
  length?: number;
};

// 牌面值映射
const RANK_VALUES: Record<string, number> = {
  '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14, '2': 15,
  '小王': 16, '大王': 17
};

/**
 * 获取牌的数值
 */
function getCardValue(card: Card): number {
  return RANK_VALUES[card.rank] || 0;
}

/**
 * 识别牌型
 */
export function recognizePattern(cards: Card[]): CardPattern {
  if (cards.length === 0) {
    return { type: 'INVALID' };
  }
  
  // 按rank分组
  const rankGroups = new Map<string, Card[]>();
  for (const card of cards) {
    const existing = rankGroups.get(card.rank) || [];
    existing.push(card);
    rankGroups.set(card.rank, existing);
  }
  
  const groups = Array.from(rankGroups.values());
  const groupSizes = groups.map(g => g.length).sort((a, b) => b - a);
  
  // 火箭（大王+小王）
  if (cards.length === 2 && 
      cards.some(c => c.rank === '小王') && 
      cards.some(c => c.rank === '大王')) {
    return { type: 'ROCKET' };
  }
  
  // 炸弹
  if (cards.length === 4 && groupSizes[0] === 4) {
    return { type: 'BOMB', rank: getCardValue(groups[0]![0]!) };
  }
  
  // 单张
  if (cards.length === 1) {
    return { type: 'SINGLE', rank: getCardValue(cards[0]!) };
  }
  
  // 对子
  if (cards.length === 2 && groupSizes[0] === 2) {
    return { type: 'PAIR', rank: getCardValue(groups[0]![0]!) };
  }
  
  // 三张
  if (cards.length === 3 && groupSizes[0] === 3) {
    return { type: 'TRIO', rank: getCardValue(groups[0]![0]!) };
  }
  
  // 三带一
  if (cards.length === 4 && groupSizes[0] === 3 && groupSizes[1] === 1) {
    const trio = groups.find(g => g.length === 3)!;
    return { type: 'TRIO_SINGLE', rank: getCardValue(trio[0]!) };
  }
  
  // 三带一对
  if (cards.length === 5 && groupSizes[0] === 3 && groupSizes[1] === 2) {
    const trio = groups.find(g => g.length === 3)!;
    return { type: 'TRIO_PAIR', rank: getCardValue(trio[0]!) };
  }
  
  // 顺子（至少5张连续的单牌）
  if (cards.length >= 5 && groupSizes[0] === 1) {
    const values = groups.map(g => getCardValue(g[0]!)).sort((a, b) => a - b);
    const isConsecutive = values.every((v, i) => i === 0 || v === values[i - 1]! + 1);
    const hasJokerOr2 = values.some(v => v >= 15);
    
    if (isConsecutive && !hasJokerOr2) {
      return { type: 'STRAIGHT', rank: values[0]!, length: cards.length };
    }
  }
  
  // 连对（至少3对连续的对子）
  if (cards.length >= 6 && cards.length % 2 === 0 && groupSizes[0] === 2) {
    const values = groups.map(g => getCardValue(g[0]!)).sort((a, b) => a - b);
    const isConsecutive = values.every((v, i) => i === 0 || v === values[i - 1]! + 1);
    const hasJokerOr2 = values.some(v => v >= 15);
    
    if (isConsecutive && !hasJokerOr2 && values.length >= 3) {
      return { type: 'CONSECUTIVE_PAIRS', rank: values[0]!, length: values.length };
    }
  }
  
  // 飞机（至少2组连续的三张）
  if (cards.length >= 6 && groupSizes[0] === 3) {
    const trioGroups = groups.filter(g => g.length === 3);
    if (trioGroups.length >= 2) {
      const values = trioGroups.map(g => getCardValue(g[0]!)).sort((a, b) => a - b);
      const isConsecutive = values.every((v, i) => i === 0 || v === values[i - 1]! + 1);
      const hasJokerOr2 = values.some(v => v >= 15);
      
      if (isConsecutive && !hasJokerOr2) {
        const wingCount = cards.length - trioGroups.length * 3;
        if (wingCount === 0) {
          return { type: 'AIRPLANE', rank: values[0]!, length: trioGroups.length };
        } else if (wingCount === trioGroups.length) {
          return { type: 'AIRPLANE_SINGLE', rank: values[0]!, length: trioGroups.length };
        } else if (wingCount === trioGroups.length * 2) {
          return { type: 'AIRPLANE_PAIR', rank: values[0]!, length: trioGroups.length };
        }
      }
    }
  }
  
  // 四带二
  if (cards.length === 6 && groupSizes[0] === 4) {
    return { type: 'QUAD_DUAL', rank: getCardValue(groups[0]![0]!) };
  }
  
  if (cards.length === 8 && groupSizes[0] === 4 && groupSizes[1] === 2 && groupSizes[2] === 2) {
    return { type: 'QUAD_DUAL_PAIR', rank: getCardValue(groups[0]![0]!) };
  }
  
  return { type: 'INVALID' };
}

/**
 * 判断选中的牌是否可以打过上家的牌
 */
export function canBeat(selectedCards: Card[], lastPlayedCards: Card[] | null): {
  valid: boolean;
  reason?: string;
} {
  // 如果没有上家出牌，任何合法牌型都可以
  if (!lastPlayedCards || lastPlayedCards.length === 0) {
    const pattern = recognizePattern(selectedCards);
    if (pattern.type === 'INVALID') {
      return { valid: false, reason: '不是有效的牌型' };
    }
    return { valid: true };
  }
  
  const selectedPattern = recognizePattern(selectedCards);
  const lastPattern = recognizePattern(lastPlayedCards);
  
  if (selectedPattern.type === 'INVALID') {
    return { valid: false, reason: '不是有效的牌型' };
  }
  
  // 火箭可以打任何牌
  if (selectedPattern.type === 'ROCKET') {
    return { valid: true };
  }
  
  // 炸弹可以打除了火箭和更大炸弹外的任何牌
  if (selectedPattern.type === 'BOMB') {
    if (lastPattern.type === 'ROCKET') {
      return { valid: false, reason: '炸弹无法打过火箭' };
    }
    if (lastPattern.type === 'BOMB') {
      if (selectedPattern.rank! > lastPattern.rank!) {
        return { valid: true };
      }
      return { valid: false, reason: '炸弹不够大' };
    }
    return { valid: true };
  }
  
  // 其他牌型必须类型相同
  if (selectedPattern.type !== lastPattern.type) {
    return { valid: false, reason: '牌型不匹配' };
  }
  
  // 比较同类型牌的大小
  if (selectedPattern.type === 'STRAIGHT' || 
      selectedPattern.type === 'CONSECUTIVE_PAIRS' ||
      selectedPattern.type === 'AIRPLANE' ||
      selectedPattern.type === 'AIRPLANE_SINGLE' ||
      selectedPattern.type === 'AIRPLANE_PAIR') {
    if (selectedPattern.length !== lastPattern.length) {
      return { valid: false, reason: '牌数量不匹配' };
    }
  }
  
  if (selectedPattern.rank! > lastPattern.rank!) {
    return { valid: true };
  }
  
  return { valid: false, reason: '牌不够大' };
}

/**
 * 获取牌型的友好名称
 */
export function getPatternName(pattern: CardPattern): string {
  const names: Record<string, string> = {
    'SINGLE': '单张',
    'PAIR': '对子',
    'TRIO': '三张',
    'TRIO_SINGLE': '三带一',
    'TRIO_PAIR': '三带一对',
    'STRAIGHT': '顺子',
    'CONSECUTIVE_PAIRS': '连对',
    'AIRPLANE': '飞机',
    'AIRPLANE_SINGLE': '飞机带单',
    'AIRPLANE_PAIR': '飞机带对',
    'QUAD_DUAL': '四带二',
    'QUAD_DUAL_PAIR': '四带两对',
    'BOMB': '炸弹',
    'ROCKET': '火箭',
    'INVALID': '无效牌型'
  };
  return names[pattern.type] || '未知牌型';
}
