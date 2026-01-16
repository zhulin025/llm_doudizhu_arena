/**
 * 游戏音效系统
 * 使用Web Audio API生成简单的音效
 */

class SoundSystem {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;
  
  constructor() {
    if (typeof window !== 'undefined') {
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (e) {
        console.warn('Web Audio API not supported');
      }
    }
  }
  
  /**
   * 播放简单的提示音
   */
  private playTone(frequency: number, duration: number, volume: number = 0.3) {
    if (!this.enabled || !this.audioContext) return;
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }
  
  /**
   * 出牌音效
   */
  playCard() {
    this.playTone(523.25, 0.1, 0.2); // C5
  }
  
  /**
   * 叫地主音效
   */
  playBid() {
    this.playTone(659.25, 0.15, 0.25); // E5
    setTimeout(() => this.playTone(783.99, 0.15, 0.25), 100); // G5
  }
  
  /**
   * 胜利音效
   */
  playWin() {
    this.playTone(523.25, 0.2, 0.3); // C5
    setTimeout(() => this.playTone(659.25, 0.2, 0.3), 150); // E5
    setTimeout(() => this.playTone(783.99, 0.3, 0.3), 300); // G5
  }
  
  /**
   * 失败音效
   */
  playLose() {
    this.playTone(392.00, 0.3, 0.25); // G4
    setTimeout(() => this.playTone(329.63, 0.4, 0.25), 200); // E4
  }
  
  /**
   * Pass音效
   */
  playPass() {
    this.playTone(293.66, 0.15, 0.2); // D4
  }
  
  /**
   * 炸弹音效
   */
  playBomb() {
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        this.playTone(100 + i * 50, 0.05, 0.3);
      }, i * 30);
    }
  }
  
  /**
   * 切换音效开关
   */
  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }
  
  /**
   * 设置音效开关
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }
  
  /**
   * 获取音效状态
   */
  isEnabled() {
    return this.enabled;
  }
}

// 导出单例
export const soundSystem = new SoundSystem();
