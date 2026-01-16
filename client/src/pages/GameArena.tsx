import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import { ArrowLeft, Play, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function GameArena() {
  const [player0ModelId, setPlayer0ModelId] = useState<number | null>(null);
  const [player1ModelId, setPlayer1ModelId] = useState<number | null>(null);
  const [player2ModelId, setPlayer2ModelId] = useState<number | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  // 获取可用模型列表
  const { data: models, isLoading: modelsLoading } = trpc.models.list.useQuery();

  // 开始游戏mutation
  const startGameMutation = trpc.game.start.useMutation({
    onSuccess: (data) => {
      setGameId(data.gameId);
      toast.success("游戏已开始！");
      setIsStarting(false);
    },
    onError: (error) => {
      toast.error(`启动游戏失败: ${error.message}`);
      setIsStarting(false);
    },
  });

  // 查询游戏状态
  const { data: gameState, refetch: refetchGameState } = trpc.game.getState.useQuery(
    { gameId: gameId || "" },
    { enabled: !!gameId, refetchInterval: 1000 }
  );

  const handleStartGame = () => {
    if (!player0ModelId || !player1ModelId || !player2ModelId) {
      toast.error("请选择三个AI模型");
      return;
    }

    if (player0ModelId === player1ModelId || player1ModelId === player2ModelId || player0ModelId === player2ModelId) {
      toast.error("请选择不同的AI模型");
      return;
    }

    setIsStarting(true);
    startGameMutation.mutate({
      player0ModelId,
      player1ModelId,
      player2ModelId,
    });
  };

  const handleNewGame = () => {
    setGameId(null);
    setPlayer0ModelId(null);
    setPlayer1ModelId(null);
    setPlayer2ModelId(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                返回首页
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="text-3xl">🎴</div>
              <div>
                <h1 className="text-xl font-bold text-white">对战竞技场</h1>
                <p className="text-xs text-gray-400">AI模型斗地主对战</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {!gameId ? (
          // 游戏配置界面
          <div className="max-w-2xl mx-auto">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-2xl">配置对战</CardTitle>
                <CardDescription className="text-gray-400">
                  选择三个AI模型进行斗地主对战
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {modelsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
                  </div>
                ) : models && models.length > 0 ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-white">玩家 0</label>
                      <Select value={player0ModelId?.toString() || ""} onValueChange={(v) => setPlayer0ModelId(Number(v))}>
                        <SelectTrigger className="bg-white/5 border-white/10 text-white">
                          <SelectValue placeholder="选择AI模型" />
                        </SelectTrigger>
                        <SelectContent>
                          {models.map((model) => (
                            <SelectItem key={model.id} value={model.id.toString()}>
                              {model.name} ({model.provider})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-white">玩家 1</label>
                      <Select value={player1ModelId?.toString() || ""} onValueChange={(v) => setPlayer1ModelId(Number(v))}>
                        <SelectTrigger className="bg-white/5 border-white/10 text-white">
                          <SelectValue placeholder="选择AI模型" />
                        </SelectTrigger>
                        <SelectContent>
                          {models.map((model) => (
                            <SelectItem key={model.id} value={model.id.toString()}>
                              {model.name} ({model.provider})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-white">玩家 2</label>
                      <Select value={player2ModelId?.toString() || ""} onValueChange={(v) => setPlayer2ModelId(Number(v))}>
                        <SelectTrigger className="bg-white/5 border-white/10 text-white">
                          <SelectValue placeholder="选择AI模型" />
                        </SelectTrigger>
                        <SelectContent>
                          {models.map((model) => (
                            <SelectItem key={model.id} value={model.id.toString()}>
                              {model.name} ({model.provider})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button 
                      onClick={handleStartGame} 
                      disabled={isStarting || !player0ModelId || !player1ModelId || !player2ModelId}
                      className="w-full"
                      size="lg"
                    >
                      {isStarting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          正在启动游戏...
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          开始对战
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-400 mb-4">还没有可用的AI模型</p>
                    <Link href="/models">
                      <Button variant="outline">添加模型</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          // 游戏进行界面
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">游戏进行中</h2>
                <p className="text-sm text-gray-400">游戏ID: {gameId}</p>
              </div>
              <Button onClick={handleNewGame} variant="outline">
                开始新游戏
              </Button>
            </div>

            {gameState ? (
              <div className="grid lg:grid-cols-3 gap-6">
                {/* 玩家0 */}
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">
                      玩家 0
                      {gameState.landlordPosition === 0 && (
                        <span className="ml-2 text-yellow-400">👑 地主</span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-gray-300">
                      <p>手牌数量: {gameState.player0HandCount}</p>
                      {gameState.currentPlayer === 0 && (
                        <p className="text-purple-400 font-semibold">当前回合</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 玩家1 */}
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">
                      玩家 1
                      {gameState.landlordPosition === 1 && (
                        <span className="ml-2 text-yellow-400">👑 地主</span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-gray-300">
                      <p>手牌数量: {gameState.player1HandCount}</p>
                      {gameState.currentPlayer === 1 && (
                        <p className="text-purple-400 font-semibold">当前回合</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 玩家2 */}
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">
                      玩家 2
                      {gameState.landlordPosition === 2 && (
                        <span className="ml-2 text-yellow-400">👑 地主</span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-gray-300">
                      <p>手牌数量: {gameState.player2HandCount}</p>
                      {gameState.currentPlayer === 2 && (
                        <p className="text-purple-400 font-semibold">当前回合</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
              </div>
            )}

            {/* 游戏状态 */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">游戏状态</CardTitle>
              </CardHeader>
              <CardContent className="text-gray-300">
                {gameState ? (
                  <div className="space-y-2">
                    <p>阶段: {gameState.phase === "bidding" ? "叫地主" : gameState.phase === "playing" ? "出牌" : "已结束"}</p>
                    <p>回合数: {gameState.roundNumber}</p>
                    {gameState.lastPlayedCards && (
                      <p>上次出牌: {gameState.lastPlayedCards.join(", ")}</p>
                    )}
                    {gameState.winner !== null && (
                      <p className="text-green-400 font-semibold text-lg">
                        🎉 玩家 {gameState.winner} 获胜！({gameState.winnerType === "landlord" ? "地主" : "农民"})
                      </p>
                    )}
                  </div>
                ) : (
                  <p>加载中...</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
