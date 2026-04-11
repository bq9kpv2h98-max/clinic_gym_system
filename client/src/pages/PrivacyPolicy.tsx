import React from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const PrivacyPolicy: React.FC = () => {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <Button
          variant="ghost"
          onClick={() => window.history.back()}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          戻る
        </Button>

        <h1 className="text-2xl font-bold text-gray-900 mb-8">個人情報の取り扱いについて</h1>

        <div className="space-y-8 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">1. 収集する個人情報</h2>
            <p>
              当院では、予約受付・ご連絡のために以下の個人情報をお預かりします。
            </p>
            <ul className="mt-3 ml-5 list-disc space-y-1 text-sm">
              <li>氏名</li>
              <li>電話番号</li>
              <li>メールアドレス</li>
              <li>LINE ID（任意）</li>
              <li>予約希望日時・施術内容</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">2. 利用目的</h2>
            <p>
              お預かりした個人情報は、以下の目的にのみ使用します。
            </p>
            <ul className="mt-3 ml-5 list-disc space-y-1 text-sm">
              <li>予約の確認・変更・キャンセルのご連絡</li>
              <li>施術に関するご案内</li>
              <li>当院からの重要なお知らせ</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">3. 第三者への提供</h2>
            <p>
              法令に基づく場合を除き、お客様の同意なく第三者に個人情報を提供することはありません。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">4. 個人情報の管理</h2>
            <p>
              個人情報の漏洩・紛失・改ざんを防ぐため、適切な安全管理措置を講じます。
              個人情報へのアクセスは、業務上必要な担当者のみに限定しています。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">5. 保存期間</h2>
            <p>
              個人情報は、利用目的の達成に必要な期間のみ保存し、不要となった場合は適切に廃棄します。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">6. 開示・訂正・削除のご請求</h2>
            <p>
              ご自身の個人情報の開示・訂正・削除をご希望の場合は、当院窓口またはお電話にてお申し出ください。
              本人確認のうえ、適切に対応いたします。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">7. お問い合わせ</h2>
            <p>
              個人情報の取り扱いに関するご質問・ご相談は、当院スタッフまでお気軽にお問い合わせください。
            </p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-gray-200">
          <Button
            onClick={() => window.history.back()}
            className="w-full bg-gray-900 hover:bg-gray-800 text-white"
          >
            予約フォームに戻る
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
