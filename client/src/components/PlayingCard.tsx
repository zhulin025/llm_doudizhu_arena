import { motion } from "framer-motion";

type Card = {
  suit: string;
  rank: string;
};

interface PlayingCardProps {
  card: Card;
  selected?: boolean;
  faceDown?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * 真实扑克牌组件
 * 模拟真实扑克牌的视觉效果
 */
export function PlayingCard({
  card,
  selected = false,
  faceDown = false,
  onClick,
  disabled = false,
  className = "",
  style = {}
}: PlayingCardProps) {
  const isRed = card.suit === '♥' || card.suit === '♦';
  const isJoker = card.suit === 'Joker';
  
  // 获取扑克牌显示内容
  const getCardDisplay = () => {
    if (isJoker) {
      return card.rank === '小王' ? '🃏' : '🃟';
    }
    return (
      <div className="flex flex-col items-center justify-between h-full p-1">
        <div className="flex flex-col items-center">
          <span className="text-lg font-bold leading-none">{card.rank}</span>
          <span className="text-2xl leading-none">{card.suit}</span>
        </div>
        <span className="text-4xl">{card.suit}</span>
        <div className="flex flex-col items-center rotate-180">
          <span className="text-lg font-bold leading-none">{card.rank}</span>
          <span className="text-2xl leading-none">{card.suit}</span>
        </div>
      </div>
    );
  };
  
  return (
    <motion.button
      whileHover={!disabled && !faceDown ? { scale: 1.05, y: -5 } : {}}
      whileTap={!disabled && !faceDown ? { scale: 0.95 } : {}}
      onClick={onClick}
      disabled={disabled}
      className={`
        relative w-16 h-24 rounded-lg shadow-lg transition-all
        ${faceDown ? 'bg-gradient-to-br from-blue-600 to-blue-800' : 'bg-white'}
        ${selected ? 'ring-4 ring-blue-400 -translate-y-4' : ''}
        ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
        ${className}
      `}
      style={style}
    >
      {faceDown ? (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-12 h-16 border-4 border-white/30 rounded"></div>
        </div>
      ) : (
        <div className={`w-full h-full ${isRed ? 'text-red-600' : 'text-black'} ${isJoker ? 'flex items-center justify-center text-4xl' : ''}`}>
          {getCardDisplay()}
        </div>
      )}
    </motion.button>
  );
}
