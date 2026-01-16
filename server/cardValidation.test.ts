import { describe, it, expect } from 'vitest';
import { recognizePattern, canBeat, getPatternName } from '../client/src/lib/cardValidation';

describe('Card Validation', () => {
  describe('recognizePattern', () => {
    it('should recognize single card', () => {
      const cards = [{ suit: '♠', rank: 'A' }];
      const pattern = recognizePattern(cards);
      expect(pattern.type).toBe('SINGLE');
      expect(pattern.rank).toBe(14);
    });

    it('should recognize pair', () => {
      const cards = [
        { suit: '♠', rank: 'K' },
        { suit: '♥', rank: 'K' }
      ];
      const pattern = recognizePattern(cards);
      expect(pattern.type).toBe('PAIR');
      expect(pattern.rank).toBe(13);
    });

    it('should recognize trio', () => {
      const cards = [
        { suit: '♠', rank: 'Q' },
        { suit: '♥', rank: 'Q' },
        { suit: '♦', rank: 'Q' }
      ];
      const pattern = recognizePattern(cards);
      expect(pattern.type).toBe('TRIO');
      expect(pattern.rank).toBe(12);
    });

    it('should recognize bomb', () => {
      const cards = [
        { suit: '♠', rank: '7' },
        { suit: '♥', rank: '7' },
        { suit: '♦', rank: '7' },
        { suit: '♣', rank: '7' }
      ];
      const pattern = recognizePattern(cards);
      expect(pattern.type).toBe('BOMB');
      expect(pattern.rank).toBe(7);
    });

    it('should recognize rocket', () => {
      const cards = [
        { suit: 'Joker', rank: '小王' },
        { suit: 'Joker', rank: '大王' }
      ];
      const pattern = recognizePattern(cards);
      expect(pattern.type).toBe('ROCKET');
    });

    it('should recognize straight', () => {
      const cards = [
        { suit: '♠', rank: '3' },
        { suit: '♥', rank: '4' },
        { suit: '♦', rank: '5' },
        { suit: '♣', rank: '6' },
        { suit: '♠', rank: '7' }
      ];
      const pattern = recognizePattern(cards);
      expect(pattern.type).toBe('STRAIGHT');
      expect(pattern.rank).toBe(3);
      expect(pattern.length).toBe(5);
    });

    it('should recognize trio with single', () => {
      const cards = [
        { suit: '♠', rank: '8' },
        { suit: '♥', rank: '8' },
        { suit: '♦', rank: '8' },
        { suit: '♣', rank: '3' }
      ];
      const pattern = recognizePattern(cards);
      expect(pattern.type).toBe('TRIO_SINGLE');
      expect(pattern.rank).toBe(8);
    });

    it('should recognize invalid pattern', () => {
      const cards = [
        { suit: '♠', rank: 'A' },
        { suit: '♥', rank: 'K' },
        { suit: '♦', rank: 'Q' }
      ];
      const pattern = recognizePattern(cards);
      expect(pattern.type).toBe('INVALID');
    });
  });

  describe('canBeat', () => {
    it('should allow any valid pattern when no last played cards', () => {
      const cards = [{ suit: '♠', rank: 'A' }];
      const result = canBeat(cards, null);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid pattern', () => {
      const cards = [
        { suit: '♠', rank: 'A' },
        { suit: '♥', rank: 'K' }
      ];
      const result = canBeat(cards, null);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('不是有效的牌型');
    });

    it('should allow higher single to beat lower single', () => {
      const lastPlayed = [{ suit: '♠', rank: '5' }];
      const selected = [{ suit: '♥', rank: '7' }];
      const result = canBeat(selected, lastPlayed);
      expect(result.valid).toBe(true);
    });

    it('should reject lower single', () => {
      const lastPlayed = [{ suit: '♠', rank: '9' }];
      const selected = [{ suit: '♥', rank: '7' }];
      const result = canBeat(selected, lastPlayed);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('牌不够大');
    });

    it('should reject mismatched pattern types', () => {
      const lastPlayed = [
        { suit: '♠', rank: '5' },
        { suit: '♥', rank: '5' }
      ];
      const selected = [{ suit: '♦', rank: '7' }];
      const result = canBeat(selected, lastPlayed);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('牌型不匹配');
    });

    it('should allow bomb to beat any non-bomb', () => {
      const lastPlayed = [
        { suit: '♠', rank: 'A' },
        { suit: '♥', rank: 'A' }
      ];
      const selected = [
        { suit: '♠', rank: '7' },
        { suit: '♥', rank: '7' },
        { suit: '♦', rank: '7' },
        { suit: '♣', rank: '7' }
      ];
      const result = canBeat(selected, lastPlayed);
      expect(result.valid).toBe(true);
    });

    it('should allow rocket to beat bomb', () => {
      const lastPlayed = [
        { suit: '♠', rank: 'A' },
        { suit: '♥', rank: 'A' },
        { suit: '♦', rank: 'A' },
        { suit: '♣', rank: 'A' }
      ];
      const selected = [
        { suit: 'Joker', rank: '小王' },
        { suit: 'Joker', rank: '大王' }
      ];
      const result = canBeat(selected, lastPlayed);
      expect(result.valid).toBe(true);
    });

    it('should reject bomb against rocket', () => {
      const lastPlayed = [
        { suit: 'Joker', rank: '小王' },
        { suit: 'Joker', rank: '大王' }
      ];
      const selected = [
        { suit: '♠', rank: 'A' },
        { suit: '♥', rank: 'A' },
        { suit: '♦', rank: 'A' },
        { suit: '♣', rank: 'A' }
      ];
      const result = canBeat(selected, lastPlayed);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('炸弹无法打过火箭');
    });
  });

  describe('getPatternName', () => {
    it('should return correct pattern names', () => {
      expect(getPatternName({ type: 'SINGLE' })).toBe('单张');
      expect(getPatternName({ type: 'PAIR' })).toBe('对子');
      expect(getPatternName({ type: 'TRIO' })).toBe('三张');
      expect(getPatternName({ type: 'BOMB' })).toBe('炸弹');
      expect(getPatternName({ type: 'ROCKET' })).toBe('火箭');
      expect(getPatternName({ type: 'STRAIGHT' })).toBe('顺子');
      expect(getPatternName({ type: 'INVALID' })).toBe('无效牌型');
    });
  });
});
