import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { ArrowLeft, Loader2, Trophy } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function ModelStats() {
  const { data: stats, isLoading: statsLoading } = trpc.models.stats.useQuery();
  const { data: models, isLoading: modelsLoading } = trpc.models.list.useQuery();

  const isLoading = statsLoading || modelsLoading;

  // 合并模型信息和统计数据
  const modelStatsData = stats?.map((stat) => {
    const model = models?.find((m) => m.id === stat.modelId);
    return {
      ...stat,
      modelName: model?.name || `模型 ${stat.modelId}`,
      modelProvider: model?.provider || "未知",
    };
  }).sort((a, b) => {
    const winRateA = a.totalGames > 0 ? ((a.winsAsLandlord + a.winsAsFarmer) / a.totalGames) * 100 : 0;
    const winRateB = b.totalGames > 0 ? ((b.winsAsLandlord + b.winsAsFarmer) / b.totalGames) * 100 : 0;
    return winRateB - winRateA;
  });

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
              <h1 className="text-xl font-bold text-white">模型统计</h1>
              <p className="text-xs text-gray-400">查看各模型的表现数据</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-400" />
              模型排行榜
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
              </div>
            ) : modelStatsData && modelStatsData.length > 0 ? (
              <div className="space-y-4">
                {modelStatsData.map((stat, index) => {
                  const totalWins = stat.winsAsLandlord + stat.winsAsFarmer;
                  const winRate = stat.totalGames > 0 ? ((totalWins / stat.totalGames) * 100).toFixed(1) : "0.0";
                  
                  return (
                    <div
                      key={stat.modelId}
                      className="p-4 rounded-lg bg-white/5 border border-white/10"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl font-bold text-purple-400">
                            #{index + 1}
                          </div>
                          <div>
                            <h3 className="text-white font-semibold text-lg">{stat.modelName}</h3>
                            <p className="text-sm text-gray-400">{stat.modelProvider}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-400">{winRate}%</div>
                          <p className="text-xs text-gray-400">胜率</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-400">总对局</p>
                          <p className="text-white font-semibold">{stat.totalGames}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">总胜利</p>
                          <p className="text-white font-semibold">{totalWins}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">地主胜率</p>
                          <p className="text-white font-semibold">
                            {stat.winsAsLandlord + stat.lossesAsLandlord > 0
                              ? ((stat.winsAsLandlord / (stat.winsAsLandlord + stat.lossesAsLandlord)) * 100).toFixed(1)
                              : "0.0"}%
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400">农民胜率</p>
                          <p className="text-white font-semibold">
                            {stat.winsAsFarmer + stat.lossesAsFarmer > 0
                              ? ((stat.winsAsFarmer / (stat.winsAsFarmer + stat.lossesAsFarmer)) * 100).toFixed(1)
                              : "0.0"}%
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-400">平均思考时间</p>
                          <p className="text-white">{stat.avgThinkingTime.toFixed(0)}ms</p>
                        </div>
                        <div>
                          <p className="text-gray-400">平均回合数</p>
                          <p className="text-white">{stat.avgRoundsPerGame.toFixed(1)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-400">还没有统计数据</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
