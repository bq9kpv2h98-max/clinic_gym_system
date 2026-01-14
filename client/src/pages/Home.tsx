import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { QrCode, Users, TrendingUp, Calendar, ClipboardList, UserCheck, CheckCircle } from "lucide-react";
import { useLocation } from "wouter";

export default function Home() {
  const [, navigate] = useLocation();
  const { isAuthenticated, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">分析ツール</h1>
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
          <h2 className="text-4xl font-bold mb-4">整体院・パーソナルジム</h2>
          <p className="text-xl text-gray-600 mb-8">
            スマートフォンで診察券を管理。来院時はQRコードをかざすだけ。
          </p>
          <div className="flex gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => navigate("/reservation")}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Calendar className="mr-2 h-5 w-5" />
              予約する
            </Button>
            <Button
              size="lg"
              onClick={() => navigate("/register-qr")}
              variant="outline"
              className="border-blue-600 text-blue-600 hover:bg-blue-50"
            >
              <QrCode className="mr-2 h-5 w-5" />
              診察券を発行する
            </Button>
          </div>
        </section>

        {/* 予約手順 */}
        <section className="mb-16">
          <h3 className="text-3xl font-bold text-center mb-12">3ステップで簡単予約</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-10 w-10 text-blue-600" />
              </div>
              <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-4 text-sm font-bold">
                1
              </div>
              <h4 className="text-xl font-semibold mb-2">希望日時を選択</h4>
              <p className="text-gray-600">
                カレンダーから第1〜3希望日時を選択します
              </p>
            </div>

            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                <ClipboardList className="h-10 w-10 text-blue-600" />
              </div>
              <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-4 text-sm font-bold">
                2
              </div>
              <h4 className="text-xl font-semibold mb-2">お客様情報を入力</h4>
              <p className="text-gray-600">
                お名前、電話番号、メールアドレスを入力します
              </p>
            </div>

            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-10 w-10 text-blue-600" />
              </div>
              <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-4 text-sm font-bold">
                3
              </div>
              <h4 className="text-xl font-semibold mb-2">予約完了</h4>
              <p className="text-gray-600">
                確認メールが届きます。当日お待ちしております
              </p>
            </div>
          </div>
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
          <p className="mb-8 text-lg">予約は3ステップで簡単。診察券登録は1分で完了します。</p>
          <div className="flex gap-4 justify-center">
            <Button
              size="lg"
              variant="secondary"
              onClick={() => navigate("/reservation")}
            >
              <Calendar className="mr-2 h-5 w-5" />
              予約する
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="bg-white text-blue-600 hover:bg-gray-100"
              onClick={() => navigate("/register-qr")}
            >
              <QrCode className="mr-2 h-5 w-5" />
              診察券を発行する
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
