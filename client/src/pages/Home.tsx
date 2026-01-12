import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { QrCode, Users, TrendingUp } from "lucide-react";
import { useLocation } from "wouter";

export default function Home() {
  const [, navigate] = useLocation();
  const { isAuthenticated, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">診察券管理システム</h1>
          <div className="flex gap-2">
            {isAuthenticated && (
              <>
                <Button variant="ghost" onClick={() => navigate("/dashboard")}>
                  ダッシュボード
                </Button>
                <Button variant="ghost" onClick={logout}>
                  ログアウト
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* ヒーロー */}
        <section className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">QRコード診察券</h2>
          <p className="text-xl text-gray-600 mb-8">
            スマートフォンで診察券を管理。来院時はQRコードをかざすだけ。
          </p>
          <Button
            size="lg"
            onClick={() => navigate("/register")}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <QrCode className="mr-2 h-5 w-5" />
            診察券を発行する
          </Button>
        </section>

        {/* 特徴 */}
        <section className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white p-8 rounded-lg shadow-md">
            <QrCode className="h-12 w-12 text-blue-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">QRコード診察券</h3>
            <p className="text-gray-600">
              紙の診察券は不要。スマートフォンのQRコードで来院管理
            </p>
          </div>

          <div className="bg-white p-8 rounded-lg shadow-md">
            <Users className="h-12 w-12 text-blue-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">ポイント管理</h3>
            <p className="text-gray-600">
              来院するたびにポイントが貯まる。ポイントで特典と交換
            </p>
          </div>

          <div className="bg-white p-8 rounded-lg shadow-md">
            <TrendingUp className="h-12 w-12 text-blue-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">来院分析</h3>
            <p className="text-gray-600">
              来院パターンを分析。あなたに最適な施術プランを提案
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-blue-600 text-white p-12 rounded-lg text-center">
          <h3 className="text-2xl font-bold mb-4">今すぐ始めましょう</h3>
          <p className="mb-8 text-lg">3ステップで簡単登録。1分で完了します。</p>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => navigate("/register")}
          >
            診察券を発行する
          </Button>
        </section>
      </main>
    </div>
  );
}
