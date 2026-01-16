import { describe, it, expect } from 'vitest';
import { sortByRank, sortBySuit, sortByPattern, sortCards } from '../client/src/lib/cardSorting';

describe('Card Sorting', () => {
  describe('sortByRank', () => {
    it('should sort cards by rank in ascending order', () => {
      const cards = [
        { suit: '♠', rank: 'K' },
        { suit: '♥', rank: '3' },
        { suit: '♦', rank: 'A' },
        { suit: '♣', rank: '7' }
      ];
      const sorted = sortByRank(cards);
      expect(sorted[0]?.rank).toBe('3');
      expect(sorted[1]?.rank).toBe('7');
      expect(sorted[2]?.rank).toBe('K');
      expect(sorted[3]?.rank).toBe('A');
    });

    it('should sort same rank cards by suit', () => {
      const cards = [
        { suit: '♠', rank: 'K' },
        { suit: '♦', rank: 'K' },
        { suit: '♥', rank: 'K' },
        { suit: '♣', rank: 'K' }
      ];
      const sorted = sortByRank(cards);
      expect(sorted[0]?.suit).toBe('♦');
      expect(sorted[1]?.suit).toBe('♣');
      expect(sorted[2]?.suit).toBe('♥');
      expect(sorted[3]?.suit).toBe('♠');
    });

    it('should place 2 and jokers at the end', () => {
      const cards = [
        { suit: 'Joker', rank: '小王' },
        { suit: '♠', rank: '2' },
        { suit: '♥', rank: 'A' },
        { suit: 'Joker', rank: '大王' }
      ];
      const sorted = sortByRank(cards);
      expect(sorted[0]?.rank).toBe('A');
      expect(sorted[1]?.rank).toBe('2');
      expect(sorted[2]?.rank).toBe('小王');
      expect(sorted[3]?.rank).toBe('大王');
    });
  });

  describe('sortBySuit', () => {
    it('should group cards by suit', () => {
      const cards = [
        { suit: '♠', rank: 'K' },
        { suit: '♦', rank: '7' },
        { suit: '♠', rank: '3' },
        { suit: '♦', rank: 'A' }
      ];
      const sorted = sortBySuit(cards);
      expect(sorted[0]?.suit).toBe('♦');
      expect(sorted[1]?.suit).toBe('♦');
      expect(sorted[2]?.suit).toBe('♠');
      expect(sorted[3]?.suit).toBe('♠');
    });

    it('should sort within same suit by rank', () => {
      const cards = [
        { suit: '♠', rank: 'K' },
        { suit: '♠', rank: '3' },
        { suit: '♠', rank: 'A' },
        { suit: '♠', rank: '7' }
      ];
      const sorted = sortBySuit(cards);
      expect(sorted[0]?.rank).toBe('3');
      expect(sorted[1]?.rank).toBe('7');
      expect(sorted[2]?.rank).toBe('K');
      expect(sorted[3]?.rank).toBe('A');
    });
  });

  describe('sortByPattern', () => {
    it('should group cards by rank count', () => {
      const cards = [
        { suit: '♠', rank: 'K' },
        { suit: '♥', rank: 'K' },
        { suit: '♦', rank: 'K' },
        { suit: '♣', rank: 'K' },
        { suit: '♠', rank: '7' },
        { suit: '♥', rank: '7' },
        { suit: '♦', rank: 'A' }
      ];
      const sorted = sortByPattern(cards);
      // 4张K应该在最前面
      expect(sorted[0]?.rank).toBe('K');
      expect(sorted[1]?.rank).toBe('K');
      expect(sorted[2]?.rank).toBe('K');
      expect(sorted[3]?.rank).toBe('K');
      // 然后是2张7
      expect(sorted[4]?.rank).toBe('7');
      expect(sorted[5]?.rank).toBe('7');
      // 最后是单张A
      expect(sorted[6]?.rank).toBe('A');
    });

    it('should sort same count groups by rank', () => {
      const cards = [
        { suit: '♠', rank: '3' },
        { suit: '♥', rank: '3' },
        { suit: '♦', rank: '7' },
        { suit: '♣', rank: '7' }
      ];
      const sorted = sortByPattern(cards);
      // 两对，应该按点数排序
      expect(sorted[0]?.rank).toBe('3');
      expect(sorted[1]?.rank).toBe('3');
      expect(sorted[2]?.rank).toBe('7');
      expect(sorted[3]?.rank).toBe('7');
    });

    it('should handle mixed pattern cards', () => {
      const cards = [
        { suit: '♠', rank: 'A' },
        { suit: '♥', rank: 'K' },
        { suit: '♦', rank: 'K' },
        { suit: '♣', rank: 'K' },
        { suit: '♠', rank: '7' },
        { suit: '♥', rank: '3' },
        { suit: '♦', rank: '3' }
      ];
      const sorted = sortByPattern(cards);
      // 3张K
      expect(sorted[0]?.rank).toBe('K');
      expect(sorted[1]?.rank).toBe('K');
      expect(sorted[2]?.rank).toBe('K');
      // 2张3
      expect(sorted[3]?.rank).toBe('3');
      expect(sorted[4]?.rank).toBe('3');
      // 单张按点数排序
      expect(sorted[5]?.rank).toBe('7');
      expect(sorted[6]?.rank).toBe('A');
    });
  });

  describe('sortCards', () => {
    it('should apply rank sorting mode', () => {
      const cards = [
        { suit: '♠', rank: 'K' },
        { suit: '♥', rank: '3' }
      ];
      const sorted = sortCards(cards, 'rank');
      expect(sorted[0]?.rank).toBe('3');
      expect(sorted[1]?.rank).toBe('K');
    });

    it('should apply suit sorting mode', () => {
      const cards = [
        { suit: '♠', rank: 'K' },
        { suit: '♦', rank: '3' }
      ];
      const sorted = sortCards(cards, 'suit');
      expect(sorted[0]?.suit).toBe('♦');
      expect(sorted[1]?.suit).toBe('♠');
    });

    it('should apply pattern sorting mode', () => {
      const cards = [
        { suit: '♠', rank: 'K' },
        { suit: '♥', rank: 'K' },
        { suit: '♦', rank: '3' }
      ];
      const sorted = sortCards(cards, 'pattern');
      expect(sorted[0]?.rank).toBe('K');
      expect(sorted[1]?.rank).toBe('K');
      expect(sorted[2]?.rank).toBe('3');
    });
  });

  describe('Complex sorting scenarios', () => {
    it('should correctly sort a typical hand', () => {
      const cards = [
        { suit: '♠', rank: '2' },
        { suit: '♥', rank: 'A' },
        { suit: '♦', rank: 'K' },
        { suit: '♣', rank: 'K' },
        { suit: '♠', rank: 'K' },
        { suit: '♥', rank: '7' },
        { suit: '♦', rank: '7' },
        { suit: '♣', rank: '5' },
        { suit: '♠', rank: '4' },
        { suit: '♥', rank: '4' },
        { suit: '♦', rank: '3' },
        { suit: 'Joker', rank: '小王' }
      ];
      
      // 按牌型排序
      const sorted = sortByPattern(cards);
      
      // 3张K在最前面
      expect(sorted[0]?.rank).toBe('K');
      expect(sorted[1]?.rank).toBe('K');
      expect(sorted[2]?.rank).toBe('K');
      
      // 然后是对子（4和7）
      expect([sorted[3]?.rank, sorted[5]?.rank]).toContain('4');
      expect([sorted[3]?.rank, sorted[5]?.rank]).toContain('7');
      
      // 最后是单张（按点数排序）
      const singles = sorted.slice(7);
      expect(singles[0]?.rank).toBe('3');
      expect(singles[1]?.rank).toBe('5');
      expect(singles[2]?.rank).toBe('A');
      expect(singles[3]?.rank).toBe('2');
      expect(singles[4]?.rank).toBe('小王');
    });
  });
});
