import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Link } from "wouter";
import { ArrowLeft, User, Bot, Sparkles, Loader2, Play, Pause, Send, Lightbulb } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { PlayingCard } from "@/components/PlayingCard";
import { getHint } from "@/lib/cardHint";
import { recognizePattern, canBeat, getPatternName } from "@/lib/cardValidation";
import { motion, AnimatePresence } from "framer-motion";
import { soundSystem } from "@/lib/sounds";

type Card = {
  suit: string;
  rank: string;
  value?: number; // 可选，用于后端验证
};

type MoveRecord = {
  player: string;
  action: string;
  cards?: string;
  dialogue?: string;
};

export default function HumanVsAI() {
  const [gameStarted, setGameStarted] = useState(false);
  const [gameId, setGameId] = useState<string | null>(null);
  const [humanPosition, setHumanPosition] = useState<number>(0);
  const [ai1ModelId, setAi1ModelId] = useState<number | null>(null);
  const [ai2ModelId, setAi2ModelId] = useState<number | null>(null);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set()); // 存储牌的唯一标识：suit+rank
  const [gameSpeed, setGameSpeed] = useState<number>(1);
  const [isPaused, setIsPaused] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [moveHistory, setMoveHistory] = useState<MoveRecord[]>([]);
  const [showHint, setShowHint] = useState(false);
  
  const { data: models } = trpc.models.list.useQuery();
  const startGameMutation = trpc.humanGame.start.useMutation();
  const { data: gameState, refetch: refetchGameState } = trpc.humanGame.getState.useQuery(
    { gameId: gameId! },
    { enabled: !!gameId && !isPaused, refetchInterval: 1000 / gameSpeed }
  );
  const bidMutation = trpc.humanGame.bid.useMutation();
  const playMutation = trpc.humanGame.play.useMutation();
  
  // 获取玩家信息
  const getPlayerInfo = (position: number) => {
    if (!gameState) return { name: "Player", isHuman: false, modelName: "" };
    
    const isHuman = position === humanPosition;
    if (isHuman) {
      return { name: "Human", isHuman: true, modelName: "Human" };
    }
    
    const aiIndex = position < humanPosition ? position : position - 1;
    const modelId = aiIndex === 0 ? ai1ModelId : ai2ModelId;
    const model = models?.find(m => m.id === modelId);
    return { name: model?.name || "AI", isHuman: false, modelName: model?.name || "AI" };
  };
  
  // 获取玩家角色
  const getPlayerRole = (position: number) => {
    if (!gameState) return "";
    return gameState.gameState?.landlordPosition === position ? "Landlord" : "Peasant";
  };
  
  // 获取玩家手牌
  const getPlayerHand = (position: number): Card[] => {
    if (!gameState) return [];
    const hands = gameState.gameState?.hands as any;
    const hand = hands?.[`player${position}`];
    if (!hand) return [];
    // 返回完整的Card对象，包含suit, rank和value
    return hand.map((c: any) => ({ suit: c.suit, rank: c.rank, value: c.value }));
  };
  
  // 获取AI对话
  const getAIDialogue = (position: number): string => {
    if (!gameState || position === humanPosition) return "";
    
    const gameStateData = gameState.gameState as any;
    const playHistory = gameStateData?.playHistory;
    const lastAction = playHistory?.[playHistory?.length - 1];
    if (!lastAction || lastAction.playerIndex !== position) return "";
    
    const dialogues = [
      "看我这牌，直接炸翻你们！",
      "我先过，队友别让我失望。",
      "能压就压，别给地主机会。",
      "这把稳了，等我表演。",
      "让我想想怎么出牌...",
    ];
    
    return dialogues[Math.floor(Math.random() * dialogues.length)] || "";
  };
  
  // 开始游戏
  const handleStartGame = async () => {
    if (!ai1ModelId || !ai2ModelId) {
      toast.error("请选择两个AI模型");
      return;
    }
    
    try {
      const result = await startGameMutation.mutateAsync({
        humanPlayerPosition: humanPosition,
        ai1ModelId,
        ai2ModelId,
      });
      setGameId(result.gameId);
      setGameStarted(true);
      setMoveHistory([]);
      toast.success("游戏开始！");
    } catch (error: any) {
      toast.error(error.message || "启动游戏失败");
    }
  };
  
  // 叫地主
  const handleBid = async (amount?: number) => {
    if (!gameId) return;
    
    try {
      if (amount) {
        await bidMutation.mutateAsync({
          gameId,
          action: { type: "bid", amount },
        });
        soundSystem.playBid();
        setMoveHistory(prev => [...prev, {
          player: "Human",
          action: `叫地主 ${amount}分`,
        }]);
      } else {
        await bidMutation.mutateAsync({
          gameId,
          action: { type: "pass" },
        });
        soundSystem.playPass();
        setMoveHistory(prev => [...prev, {
          player: "Human",
          action: "不叫",
        }]);
      }
      await refetchGameState();
    } catch (error: any) {
      toast.error(error.message || "操作失败");
    }
  };
  
  // 出牌
  const handlePlay = async () => {
    if (!gameId || selectedCards.size === 0) return;
    
    // 先刷新游戏状态，确保使用最新的手牌数据
    await refetchGameState();
    
    const hand = getPlayerHand(humanPosition);
    const cards = hand.filter(card => selectedCards.has(`${card.suit}-${card.rank}`));
    
    console.log('[DEBUG] handlePlay:', {
      humanPosition,
      selectedCardIds: Array.from(selectedCards),
      hand: hand.map(c => ({ suit: c.suit, rank: c.rank, value: c.value })),
      cards: cards.map(c => ({ suit: c.suit, rank: c.rank, value: c.value })),
    });
    
    try {
      await playMutation.mutateAsync({
        gameId,
        action: { type: "play", cards: cards as any },
      });
      
      const pattern = recognizePattern(cards);
      if (pattern && pattern.type === 'bomb') {
        soundSystem.playBomb();
      } else {
        soundSystem.playCard();
      }
      
      setMoveHistory(prev => [...prev, {
        player: "Human",
        action: "出牌",
        cards: cards.map(c => c.rank).join(' '),
      }]);
      
      setSelectedCards(new Set());
      await refetchGameState();
    } catch (error: any) {
      toast.error(error.message || "出牌失败");
    }
  };
  
  // Pass
  const handlePass = async () => {
    if (!gameId) return;
    
    try {
      await playMutation.mutateAsync({
        gameId,
        action: { type: "pass" },
      });
      soundSystem.playPass();
      setMoveHistory(prev => [...prev, {
        player: "Human",
        action: "Pass",
      }]);
      await refetchGameState();
    } catch (error: any) {
      toast.error(error.message || "操作失败");
    }
  };
  
  // HINT提示
  const handleHint = () => {
    const hand = getPlayerHand(humanPosition);
    const lastPlayed = gameState?.gameState?.lastPlayedCards || null;
    const hint = getHint(hand as any, lastPlayed);
    
    if (hint) {
      toast.success(`提示: ${hint.description}`);
      // 自动选中提示的牌
      const cardIds = new Set<string>();
      hint.cards.forEach(hintCard => {
        const cardId = `${hintCard.suit}-${hintCard.rank}`;
        cardIds.add(cardId);
      });
      setSelectedCards(cardIds);
    } else {
      toast.info("建议Pass");
    }
  };
  
  // 发送聊天消息
  const handleSendMessage = () => {
    if (!chatMessage.trim()) return;
    setMoveHistory(prev => [...prev, {
      player: "Human",
      action: "聊天",
      dialogue: chatMessage,
    }]);
    setChatMessage("");
  };
  
  // 选牌
  const toggleCardSelection = (card: Card) => {
    const cardId = `${card.suit}-${card.rank}`;
    setSelectedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  };
  
  // 获取选中牌的验证信息
  const getSelectionValidation = () => {
    if (selectedCards.size === 0) return null;
    
    const hand = getPlayerHand(humanPosition);
    const cards = hand.filter(card => selectedCards.has(`${card.suit}-${card.rank}`));
    const pattern = recognizePattern(cards);
    
    if (!pattern) {
      return { valid: false, message: "不是有效牌型" };
    }
    
    // 检查是否需要压牌
    const lastPlayed = gameState?.gameState?.lastPlayedCards;
    const lastPlayer = gameState?.gameState?.lastPlayer;
    const currentPlayer = gameState?.gameState?.currentPlayer;
    
    // 如果是新一轮（当前玩家就是上次出牌的人），不需要压牌
    const isNewRound = lastPlayer !== null && lastPlayer === currentPlayer;
    
    if (lastPlayed && lastPlayed.length > 0 && !isNewRound) {
      const canBeatLast = canBeat(cards, lastPlayed);
      if (!canBeatLast) {
        return { valid: false, message: `${getPatternName(pattern)} - 无法压过上家` };
      }
    }
    
    return { valid: true, message: getPatternName(pattern) };
  };
  
  const validation = getSelectionValidation();
  const isHumanTurn = gameState?.gameState?.currentPlayer === humanPosition;
  const isBiddingPhase = gameState?.gameState?.phase === "bidding";
  const isPlayingPhase = gameState?.gameState?.phase === "playing";
  
  // 配置界面
  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
        <div className="max-w-4xl mx-auto">
          <Link href="/">
            <Button variant="ghost" className="mb-6">
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回首页
            </Button>
          </Link>
          
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <h1 className="text-3xl font-bold text-center bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                人机对战配置
              </h1>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-300">您的位置</label>
                <Select value={humanPosition.toString()} onValueChange={(v) => setHumanPosition(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">位置 0 (底部)</SelectItem>
                    <SelectItem value="1">位置 1 (左上)</SelectItem>
                    <SelectItem value="2">位置 2 (右上)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-300">AI对手 1</label>
                <Select value={ai1ModelId?.toString()} onValueChange={(v) => setAi1ModelId(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择AI模型" />
                  </SelectTrigger>
                  <SelectContent>
                    {models?.map((model) => (
                      <SelectItem key={model.id} value={model.id.toString()}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-300">AI对手 2</label>
                <Select value={ai2ModelId?.toString()} onValueChange={(v) => setAi2ModelId(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择AI模型" />
                  </SelectTrigger>
                  <SelectContent>
                    {models?.map((model) => (
                      <SelectItem key={model.id} value={model.id.toString()}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Button 
                onClick={handleStartGame} 
                className="w-full"
                disabled={!ai1ModelId || !ai2ModelId}
              >
                <Play className="mr-2 h-4 w-4" />
                开始游戏
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  // 游戏界面 - 3D桌面视角
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4">
      <div className="max-w-[1800px] mx-auto grid grid-cols-[1fr_400px] gap-4 h-[calc(100vh-2rem)]">
        {/* 左侧：3D游戏桌面 */}
        <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-xl border border-slate-700 overflow-hidden">
          {/* 3D桌面背景 */}
          <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 to-green-900/40" style={{
            clipPath: 'polygon(0 10%, 100% 0, 100% 100%, 0 90%)'
          }} />
          
          {/* 游戏桌面 */}
          <div className="relative h-full flex flex-col">
            {/* 顶部玩家区域 */}
            <div className="flex justify-around items-start p-4 h-1/3">
              {/* 左上玩家 */}
              {humanPosition !== 1 && (
                <div className="flex flex-col items-center space-y-1.5">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-slate-700 border-3 border-blue-500 flex items-center justify-center">
                      <Bot className="w-6 h-6 text-blue-400" />
                    </div>
                    {getPlayerRole(1) === "Landlord" && (
                      <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center text-xs font-bold">
                        地主
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-medium text-slate-300">{getPlayerInfo(1).modelName}</span>
                  
                  {/* AI对话气泡 */}
                  {gameState?.gameState?.currentPlayer === 1 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white/90 rounded-lg p-2 max-w-xs text-xs text-slate-800 shadow-lg"
                    >
                      {getAIDialogue(1) || "思考中..."}
                      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-white/90" />
                    </motion.div>
                  )}
                  
                  {/* 手牌（背面） */}
                  <div className="flex">
                    {getPlayerHand(1).map((_, i) => (
                      <PlayingCard
                        key={i}
                        card={{ suit: '', rank: '' }}
                        faceDown
                        disabled
                        className="w-10 h-14"
                        style={{ marginLeft: i > 0 ? '-28px' : '0' }}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-slate-400">剩余 {getPlayerHand(1).length} 张</span>
                </div>
              )}
              
              {/* 右上玩家 */}
              {humanPosition !== 2 && (
                <div className="flex flex-col items-center space-y-1.5">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-slate-700 border-3 border-purple-500 flex items-center justify-center">
                      <Bot className="w-6 h-6 text-purple-400" />
                    </div>
                    {getPlayerRole(2) === "Landlord" && (
                      <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center text-xs font-bold">
                        地主
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-medium text-slate-300">{getPlayerInfo(2).modelName}</span>
                  
                  {/* AI对话气泡 */}
                  {gameState?.gameState?.currentPlayer === 2 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white/90 rounded-lg p-2 max-w-xs text-xs text-slate-800 shadow-lg"
                    >
                      {getAIDialogue(2) || "思考中..."}
                      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-white/90" />
                    </motion.div>
                  )}
                  
                  {/* 手牌（背面） */}
                  <div className="flex">
                    {getPlayerHand(2).map((_, i) => (
                      <PlayingCard
                        key={i}
                        card={{ suit: '', rank: '' }}
                        faceDown
                        disabled
                        className="w-10 h-14"
                        style={{ marginLeft: i > 0 ? '-28px' : '0' }}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-slate-400">剩余 {getPlayerHand(2).length} 张</span>
                </div>
              )}
            </div>
            
            {/* 中央出牌区域 */}
            <div className="flex-1 flex flex-col items-center justify-center space-y-4">
              {/* 底牌显示 */}
              {gameState?.gameState?.landlordPosition !== null && gameState?.gameState?.landlordCards && gameState.gameState.landlordCards.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-yellow-900/40 border-2 border-yellow-500/50 rounded-lg p-2 flex flex-col items-center"
                >
                  <span className="text-xs text-yellow-300 mb-1 font-bold">底牌</span>
                  <div className="flex gap-1">
                    {gameState.gameState.landlordCards.map((card: any, i: number) => (
                      <PlayingCard
                        key={i}
                        card={{ suit: card.suit, rank: card.rank }}
                        className="w-10 h-14"
                      />
                    ))}
                  </div>
                </motion.div>
              )}
              
              <div className="bg-green-800/60 rounded-xl p-6 min-w-[350px] min-h-[160px] flex flex-col items-center justify-center shadow-2xl">
                {gameState?.gameState?.lastPlayedCards && gameState.gameState.lastPlayedCards.length > 0 ? (
                  <div className="flex gap-1">
                    {gameState.gameState.lastPlayedCards.map((card: any, i: number) => (
                      <PlayingCard
                        key={i}
                        card={{ suit: card.suit, rank: card.rank }}
                        className="w-14 h-20"
                      />
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-400 text-lg">等待出牌...</span>
                )}
                
                {gameState?.gameState?.currentPlayer !== undefined && (
                  <div className="mt-4 text-center">
                    <span className="text-sm text-slate-300">
                      当前玩家: {getPlayerInfo(gameState.gameState.currentPlayer).modelName}
                    </span>
                    {gameState.gameState.currentPlayer !== humanPosition && (
                      <div className="flex items-center justify-center mt-2">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-400 mr-2" />
                        <span className="text-xs text-blue-400">AI思考中...</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* 底部人类玩家区域 */}
            <div className="p-3 space-y-3">
              {/* 玩家信息 */}
              <div className="flex items-center justify-center space-x-3">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-slate-700 border-3 border-green-500 flex items-center justify-center">
                    <User className="w-6 h-6 text-green-400" />
                  </div>
                  {getPlayerRole(humanPosition) === "Landlord" && (
                    <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center text-xs font-bold">
                      地主
                    </div>
                  )}
                </div>
                <div>
                  <span className="text-base font-bold text-white">Human</span>
                  <div className="text-xs text-slate-400">剩余 {getPlayerHand(humanPosition).length} 张</div>
                </div>
              </div>
              
              {/* 紧凑型手牌展示 */}
              <div className="flex justify-center items-end min-h-[140px]">
                <div className="relative flex justify-center" style={{ width: '100%', maxWidth: '1100px', height: '120px' }}>
                  {getPlayerHand(humanPosition).map((card, i) => {
                    const total = getPlayerHand(humanPosition).length;
                    // 更紧凑的间距计算
                    const cardWidth = 70; // 卡片宽度
                    const overlapRatio = 0.5; // 重叠比例，调整为50%确保所有牌可见
                    const spacing = cardWidth * overlapRatio;
                    const totalWidth = spacing * (total - 1) + cardWidth;
                    const startX = (1100 - totalWidth) / 2;
                    
                    // 轻微的弧形效果
                    const centerIndex = (total - 1) / 2;
                    const distanceFromCenter = Math.abs(i - centerIndex);
                    const arcHeight = distanceFromCenter * 0.8;
                    
                    return (
                      <PlayingCard
                        key={i}
                        card={card}
                        selected={selectedCards.has(`${card.suit}-${card.rank}`)}
                        onClick={() => isHumanTurn && isPlayingPhase && toggleCardSelection(card)}
                        disabled={!isHumanTurn || !isPlayingPhase}
                        className="absolute bottom-0 transition-all duration-200"
                        style={{
                          left: `${startX + i * spacing}px`,
                          transform: `translateY(${selectedCards.has(`${card.suit}-${card.rank}`) ? '-30px' : `${arcHeight}px`})`,
                          zIndex: selectedCards.has(`${card.suit}-${card.rank}`) ? 100 : i,
                        }}
                      />
                    );
                  })}
                </div>
              </div>
              
              {/* 操作按钮 */}
              <div className="flex justify-center items-center gap-3 flex-wrap">
                {isBiddingPhase && isHumanTurn && (
                  <>
                    <Button onClick={() => handleBid(1)} variant="outline" size="sm">叫1分</Button>
                    <Button onClick={() => handleBid(2)} variant="outline" size="sm">叫2分</Button>
                    <Button onClick={() => handleBid(3)} variant="outline" size="sm">叫3分</Button>
                    <Button onClick={() => handleBid()} variant="ghost" size="sm">不叫</Button>
                  </>
                )}
                
                {isPlayingPhase && isHumanTurn && (
                  <>
                    <Button onClick={handleHint} variant="outline" size="sm" className="bg-yellow-500/20 hover:bg-yellow-500/30">
                      <Lightbulb className="mr-1 h-3 w-3" />
                      HINT
                    </Button>
                    <Button onClick={handlePass} variant="outline" size="sm">
                      PASS
                    </Button>
                    <Button 
                      onClick={handlePlay} 
                      disabled={selectedCards.size === 0 || !validation?.valid}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Play className="mr-1 h-3 w-3" />
                      PLAY
                    </Button>
                  </>
                )}
                
                {validation && (
                  <div className={`px-3 py-1 rounded-lg text-sm ${validation.valid ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {validation.message}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* 右侧：信息面板 */}
        <div className="flex flex-col space-y-4">
          {/* 游戏控制 */}
          <Card className="bg-slate-800/80 border-slate-700">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPaused(!isPaused)}
                >
                  {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                </Button>
                <span className="text-sm text-slate-400">
                  Turn {moveHistory.length}
                </span>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs text-slate-400">Game Speed</label>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-500">x0.125</span>
                  <Slider
                    value={[Math.log2(gameSpeed) + 3]}
                    onValueChange={([v]) => setGameSpeed(Math.pow(2, v! - 3))}
                    min={0}
                    max={6}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-xs text-slate-500">x8</span>
                </div>
                <div className="text-center text-sm text-slate-300">x{gameSpeed}</div>
              </div>
            </CardContent>
          </Card>
          
          {/* Move History */}
          <Card className="bg-slate-800/80 border-slate-700 flex-1">
            <CardContent className="p-4 h-full flex flex-col">
              <h3 className="text-lg font-semibold mb-4 text-slate-200">Move History</h3>
              <ScrollArea className="flex-1">
                <div className="space-y-2">
                  {moveHistory.map((move, i) => (
                    <div key={i} className="text-sm p-2 bg-slate-700/50 rounded">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-300">{i + 1}. {move.player}</span>
                        <span className="text-slate-400">{move.cards || move.action}</span>
                      </div>
                      {move.dialogue && (
                        <div className="text-xs text-slate-500 italic mt-1">"{move.dialogue}"</div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
          
          {/* Table Talk */}
          <Card className="bg-slate-800/80 border-slate-700">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-2 text-slate-200">Table Talk</h3>
              <div className="flex space-x-2">
                <Input
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Send anytime"
                  className="flex-1 bg-slate-700/50 border-slate-600"
                />
                <Button onClick={handleSendMessage} size="sm">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
