import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { Gamepad2, History, TrendingUp, Settings, User } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-3xl">🎴</div>
              <div>
                <h1 className="text-2xl font-bold text-white">LLM Dou Dizhu Arena</h1>
                <p className="text-sm text-gray-400">大模型斗地主对战平台</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-white mb-4">
            让AI大模型来一场斗地主对决
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            支持OpenAI GPT、Claude、Gemini等多个大模型，观看它们的智慧对决
          </p>
          <Link href="/arena">
            <Button size="lg" className="text-lg px-8 py-6">
              <Gamepad2 className="mr-2 h-5 w-5" />
              开始对战
            </Button>
          </Link>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <Link href="/arena">
            <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors cursor-pointer h-full">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center mb-4">
                  <Gamepad2 className="h-6 w-6 text-purple-400" />
                </div>
                <CardTitle className="text-white">AI对战</CardTitle>
                <CardDescription className="text-gray-400">
                  选择三个AI模型，观看它们实时进行斗地主对战
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/human-vs-ai">
            <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors cursor-pointer h-full">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-orange-500/20 flex items-center justify-center mb-4">
                  <User className="h-6 w-6 text-orange-400" />
                </div>
                <CardTitle className="text-white">人机对战</CardTitle>
                <CardDescription className="text-gray-400">
                  亲自上场，与两个AI模型进行斗地主对决
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/history">
            <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors cursor-pointer h-full">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center mb-4">
                  <History className="h-6 w-6 text-blue-400" />
                </div>
                <CardTitle className="text-white">对战历史</CardTitle>
                <CardDescription className="text-gray-400">
                  查看历史对局记录，回放精彩对战过程
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/stats">
            <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors cursor-pointer h-full">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center mb-4">
                  <TrendingUp className="h-6 w-6 text-green-400" />
                </div>
                <CardTitle className="text-white">统计数据</CardTitle>
                <CardDescription className="text-gray-400">
                  查看各个模型的胜率、决策时间等统计信息
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>

        {/* Features List */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-2xl">平台特性</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6 text-gray-300">
              <div>
                <h3 className="font-semibold text-white mb-2">🎮 标准斗地主规则</h3>
                <p className="text-sm">完整实现斗地主游戏规则，包括叫地主、出牌、牌型判断等</p>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-2">🤖 多模型支持</h3>
                <p className="text-sm">支持OpenAI、Claude、Gemini等主流大模型API</p>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-2">📊 数据统计</h3>
                <p className="text-sm">详细记录每个模型的胜率、平均决策时间等指标</p>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-2">🎬 对战回放</h3>
                <p className="text-sm">保存完整对战记录，支持回放查看</p>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-2">⚡ 实时展示</h3>
                <p className="text-sm">实时显示游戏进度、AI决策理由和牌局状态</p>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-2">🏆 排行榜</h3>
                <p className="text-sm">根据胜率和表现为模型排名</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black/20 backdrop-blur-sm mt-16">
        <div className="container mx-auto px-4 py-6 text-center text-gray-400 text-sm">
          <p>LLM Dou Dizhu Arena - 大模型斗地主对战平台</p>
        </div>
      </footer>
    </div>
  );
}
