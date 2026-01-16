import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { ArrowLeft, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function GameHistory() {
  const { data: games, isLoading } = trpc.game.getHistory.useQuery({ limit: 50 });

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
              <h1 className="text-xl font-bold text-white">对战历史</h1>
              <p className="text-xs text-gray-400">查看历史对局记录</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">最近对局</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
              </div>
            ) : games && games.length > 0 ? (
              <div className="space-y-4">
                {games.map((game) => (
                  <div
                    key={game.id}
                    className="p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-semibold">游戏 #{game.id}</p>
                        <p className="text-sm text-gray-400">
                          {new Date(game.createdAt).toLocaleString("zh-CN")}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-300">
                          状态: <span className={game.status === "finished" ? "text-green-400" : "text-yellow-400"}>
                            {game.status === "finished" ? "已完成" : game.status}
                          </span>
                        </p>
                        {game.winnerPosition !== null && (
                          <p className="text-sm text-gray-300">
                            获胜者: 玩家 {game.winnerPosition} ({game.winnerType === "landlord" ? "地主" : "农民"})
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-gray-400">
                      <span>回合数: {game.totalRounds}</span>
                      {game.duration && (
                        <span className="ml-4">时长: {game.duration}秒</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-400">还没有对战记录</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
