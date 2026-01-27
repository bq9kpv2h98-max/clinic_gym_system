import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { QrCode, Users, Camera, FileText } from "lucide-react";
import { useLocation } from "wouter";

export default function StaffHome() {
  const [, setLocation] = useLocation();

  // 施術者用ホーム画面専用のPWAマニフェストを設定
  useEffect(() => {
    // 既存のマニフェストリンクを削除
    const existingManifest = document.querySelector('link[rel="manifest"]');
    if (existingManifest) {
      existingManifest.remove();
    }

    // 施術者用タブレット専用のマニフェストを追加
    const manifestLink = document.createElement('link');
    manifestLink.rel = 'manifest';
    manifestLink.href = '/manifest-tablet.json';
    document.head.appendChild(manifestLink);

    // クリーンアップ: コンポーネントがアンマウントされたら元のマニフェストに戻す
    return () => {
      manifestLink.remove();
      const defaultManifest = document.createElement('link');
      defaultManifest.rel = 'manifest';
      defaultManifest.href = '/manifest.json';
      document.head.appendChild(defaultManifest);
    };
  }, []);

  const menuItems = [
    {
      icon: QrCode,
      title: "顧客登録QRコード",
      description: "新規・既存顧客の登録用QRコードを表示",
      color: "bg-blue-500 hover:bg-blue-600",
      path: "/staff/tablet?tab=qr-codes",
    },
    {
      icon: Users,
      title: "顧客名リスト",
      description: "登録済み顧客の一覧を表示",
      color: "bg-green-500 hover:bg-green-600",
      path: "/staff/tablet?tab=customers",
    },
    {
      icon: Camera,
      title: "QRコード読み取り",
      description: "顧客のQRコードをスキャン",
      color: "bg-purple-500 hover:bg-purple-600",
      path: "/staff/scanner",
    },
    {
      icon: FileText,
      title: "カルテ管理",
      description: "カルテの作成・閲覧・編集",
      color: "bg-orange-500 hover:bg-orange-600",
      path: "/medical-records",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">施術者用ホーム</h1>
          <p className="text-gray-600 text-lg">
            必要な機能を選択してください
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <Card
                key={index}
                className="cursor-pointer transition-all duration-300 hover:shadow-2xl hover:scale-105 border-2 border-transparent hover:border-gray-300"
                onClick={() => setLocation(item.path)}
              >
                <CardContent className="p-8">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className={`${item.color} p-6 rounded-full transition-transform duration-300`}>
                      <Icon className="h-12 w-12 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-800 mb-2">
                        {item.title}
                      </h2>
                      <p className="text-gray-600 text-base">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>タブレットのホーム画面に追加すると、より便利にご利用いただけます</p>
        </div>
      </div>
    </div>
  );
}
