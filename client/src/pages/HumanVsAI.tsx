import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import { ArrowLeft, User, Bot, Sparkles, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type Card = {
  suit: string;
  rank: string;
};

export default function HumanVsAI() {
  const [gameStarted, setGameStarted] = useState(false);
  const [gameId, setGameId] = useState<string | null>(null);
  const [humanPosition, setHumanPosition] = useState<number>(0);
  const [ai1ModelId, setAi1ModelId] = useState<number | null>(null);
  const [ai2ModelId, setAi2ModelId] = useState<number | null>(null);
  const [selectedCards, setSelectedCards] = useState<Set<number>>(new Set());
  
  const { data: models } = trpc.models.list.useQuery();
  const startGameMutation = trpc.humanGame.start.useMutation();
  const { data: gameState, refetch: refetchGameState } = trpc.humanGame.getState.useQuery(
    { gameId: gameId! },
    { enabled: !!gameId, refetchInterval: 1000 }
  );
  const bidMutation = trpc.humanGame.bid.useMutation();
  const playMutation = trpc.humanGame.play.useMutation();
  
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
      toast.success("游戏开始！");
    } catch (error: any) {
      toast.error(error.message || "启动游戏失败");
    }
  };
  
  const handleBid = async (amount?: number) => {
    if (!gameId) return;
    
    try {
      if (amount) {
        await bidMutation.mutateAsync({
          gameId,
          action: { type: "bid", amount },
        });
      } else {
        await bidMutation.mutateAsync({
          gameId,
          action: { type: "pass" },
        });
      }
      await refetchGameState();
    } catch (error: any) {
      toast.error(error.message || "叫地主失败");
    }
  };
  
  const handlePlay = async () => {
    if (!gameId || selectedCards.size === 0) return;
    
    const humanHand = getHumanHand();
    if (!humanHand) return;
    
    const cardsToPlay = Array.from(selectedCards)
      .map(index => humanHand[index])
      .filter(Boolean) as Card[];
    
    try {
      await playMutation.mutateAsync({
        gameId,
        action: { type: "play", cards: cardsToPlay as any },
      });
      setSelectedCards(new Set());
      await refetchGameState();
    } catch (error: any) {
      toast.error(error.message || "出牌失败");
    }
  };
  
  const handlePass = async () => {
    if (!gameId) return;
    
    try {
      await playMutation.mutateAsync({
        gameId,
        action: { type: "pass" },
      });
      await refetchGameState();
    } catch (error: any) {
      toast.error(error.message || "Pass失败");
    }
  };
  
  const toggleCardSelection = (index: number) => {
    const newSelection = new Set(selectedCards);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    setSelectedCards(newSelection);
  };
  
  const getHumanHand = (): Card[] | null => {
    if (!gameState) return null;
    const { gameState: gs, humanPlayerPosition: pos } = gameState;
    if (pos === 0) return gs.hands.player0;
    if (pos === 1) return gs.hands.player1;
    return gs.hands.player2;
  };
  
  const getPlayerName = (position: number): string => {
    if (!gameState) return `玩家${position}`;
    if (position === gameState.humanPlayerPosition) return "你";
    return `AI ${position}`;
  };
  
  const getCardDisplay = (card: Card): string => {
    if (card.suit === "Joker") {
      return card.rank === "小王" ? "🃏" : "🃟";
    }
    return `${card.suit}${card.rank}`;
  };
  
  const isMyTurn = (): boolean => {
    if (!gameState) return false;
    const { gameState: gs, humanPlayerPosition, waitingForHuman } = gameState;
    if (!waitingForHuman) return false;
    
    if (String(gs.phase) === "BIDDING") {
      return gs.currentBidder === humanPlayerPosition;
    } else if (String(gs.phase) === "PLAYING") {
      return gs.currentPlayer === humanPlayerPosition;
    }
    return false;
  };
  
  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <header className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  返回首页
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-white">人机对战</h1>
                <p className="text-xs text-gray-400">挑战AI模型</p>
              </div>
            </div>
          </div>
        </header>
        
        <main className="container mx-auto px-4 py-8">
          <Card className="max-w-2xl mx-auto bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">配置对战</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  你的位置
                </label>
                <Select value={humanPosition.toString()} onValueChange={(v) => setHumanPosition(parseInt(v))}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">玩家0（先手）</SelectItem>
                    <SelectItem value="1">玩家1</SelectItem>
                    <SelectItem value="2">玩家2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  AI对手1
                </label>
                <Select value={ai1ModelId?.toString() || ""} onValueChange={(v) => setAi1ModelId(parseInt(v))}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
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
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  AI对手2
                </label>
                <Select value={ai2ModelId?.toString() || ""} onValueChange={(v) => setAi2ModelId(parseInt(v))}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
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
                disabled={!ai1ModelId || !ai2ModelId || startGameMutation.isPending}
              >
                {startGameMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    启动中...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    开始游戏
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }
  
  if (!gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }
  
  const humanHand = getHumanHand();
  const { gameState: gs, humanPlayerPosition, waitingForHuman, currentAction } = gameState;
  const myTurn = isMyTurn();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  返回
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-white">人机对战</h1>
                <p className="text-xs text-gray-400">
              {String(gs.phase) === "BIDDING" && "叫地主阶段"}
              {String(gs.phase) === "PLAYING" && "出牌阶段"}
              {String(gs.phase) === "FINISHED" && "游戏结束"}
                </p>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-sm text-gray-400">回合 {gs.roundNumber}</div>
              {myTurn && (
                <div className="text-sm text-green-400 font-medium">轮到你了！</div>
              )}
            </div>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        {/* 其他玩家信息 */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[0, 1, 2].map((pos) => {
            const isHuman = pos === humanPlayerPosition;
            const isCurrent = String(gs.phase) === "BIDDING" ? gs.currentBidder === pos : gs.currentPlayer === pos;
            const handCount = pos === 0 ? gs.hands.player0.length : pos === 1 ? gs.hands.player1.length : gs.hands.player2.length;
            const isLandlord = gs.landlordPosition === pos;
            
            return (
              <Card key={pos} className={`bg-white/5 border-white/10 ${isCurrent ? 'ring-2 ring-blue-500' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isHuman ? <User className="h-5 w-5 text-blue-400" /> : <Bot className="h-5 w-5 text-purple-400" />}
                      <span className="text-white font-medium">{getPlayerName(pos)}</span>
                      {isLandlord && <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded">地主</span>}
                    </div>
                    <div className="text-gray-400 text-sm">{handCount}张</div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        
        {/* 叫地主界面 */}
        {String(gs.phase) === "BIDDING" && myTurn && (
          <Card className="mb-8 bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">叫地主</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Button onClick={() => handleBid()} variant="outline" disabled={bidMutation.isPending}>
                  不叫
                </Button>
                {[1, 2, 3].map((amount) => (
                  <Button 
                    key={amount}
                    onClick={() => handleBid(amount)}
                    disabled={bidMutation.isPending || amount <= (gs.highestBid || 0)}
                  >
                    叫{amount}分
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* 出牌历史 */}
        {String(gs.phase) === "PLAYING" && gs.lastPlayedCards && gs.lastPlayedCards.length > 0 && (
          <Card className="mb-8 bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-sm">上次出牌</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                {gs.lastPlayedCards.map((card, idx) => (
                  <div key={idx} className="bg-white text-black px-3 py-2 rounded text-lg font-bold">
                    {getCardDisplay(card)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* 手牌 */}
        {humanHand && (
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">你的手牌</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                {humanHand.map((card, index) => (
                  <button
                    key={index}
                    onClick={() => toggleCardSelection(index)}
                    className={`px-4 py-3 rounded text-lg font-bold transition-all ${
                      selectedCards.has(index)
                        ? 'bg-blue-500 text-white transform -translate-y-2'
                        : 'bg-white text-black hover:bg-gray-200'
                    }`}
                    disabled={!myTurn || String(gs.phase) !== "PLAYING"}
                  >
                    {getCardDisplay(card)}
                  </button>
                ))}
              </div>
              
              {String(gs.phase) === "PLAYING" && myTurn && (
                <div className="flex gap-4">
                  <Button 
                    onClick={handlePlay}
                    disabled={selectedCards.size === 0 || playMutation.isPending}
                  >
                    出牌
                  </Button>
                  <Button 
                    onClick={handlePass}
                    variant="outline"
                    disabled={playMutation.isPending || gs.consecutivePasses === 0}
                  >
                    不出
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        
        {/* 游戏结束 */}
        {String(gs.phase) === "FINISHED" && (
          <Card className="mt-8 bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">游戏结束</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <div className="text-3xl font-bold text-white mb-4">
                  {gs.winner === humanPlayerPosition ? "🎉 你赢了！" : "😢 你输了"}
                </div>
                <div className="text-gray-400 mb-6">
                  获胜者: {getPlayerName(gs.winner!)} ({gs.winnerType === "landlord" ? "地主" : "农民"})
                </div>
                <Link href="/">
                  <Button>返回首页</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
