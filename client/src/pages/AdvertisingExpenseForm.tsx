import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DollarSign, Plus, CheckCircle, AlertCircle, Loader, Calendar } from "lucide-react";
import { trpc } from "@/lib/trpc";

const AdvertisingExpenseForm: React.FC = () => {
  const [channelName, setChannelName] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split("T")[0]);
  const [amount, setAmount] = useState("");
  const [budget, setBudget] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [facilityId] = useState("default");
  const [channelId, setChannelId] = useState("");

  // Note: 実際の実装では、チャネル一覧とexpenses一覧を取得するエンドポイントが必要
  // 現在は createChannel と recordExpense のみ実装されているため、
  // ここでは仮のデータを使用します
  const recordExpenseMutation = trpc.advertising.recordExpense.useMutation();
  const createChannelMutation = trpc.advertising.createChannel.useMutation();

  const utils = trpc.useUtils();

  // チャネル追加
  const handleAddChannel = async () => {
    if (!channelName) {
      setMessage({ type: "error", text: "チャネル名を入力してください" });
      return;
    }

    try {
      const result = await createChannelMutation.mutateAsync({
        facilityId,
        channelName,
        channelType: "other",
        description: budget ? `月間予算: ¥${budget}` : undefined,
      });

      setMessage({
        type: "success",
        text: `チャネル「${channelName}」を追加しました`,
      });

      setChannelId(result.channelId);
      setChannelName("");
      setBudget("");
    } catch (error: any) {
      setMessage({
        type: "error",
        text: `チャネル追加失敗: ${error.message}`,
      });
    }
  };

  // 広告費記録
  const handleRecordExpense = async () => {
    if (!channelId || !amount) {
      setMessage({ type: "error", text: "チャネルと金額を入力してください" });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      await recordExpenseMutation.mutateAsync({
        facilityId,
        channelId,
        expenseDate,
        amount: parseFloat(amount),
        budget: budget ? parseFloat(budget) : undefined,
      });

      setMessage({
        type: "success",
        text: `広告費を記録しました\n金額: ¥${parseFloat(amount).toLocaleString()}`,
      });

      setAmount("");
    } catch (error: any) {
      setMessage({
        type: "error",
        text: `広告費記録失敗: ${error.message}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* ヘッダー */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <DollarSign className="w-8 h-8" />
            広告費入力
          </h1>
          <p className="text-gray-600 mt-2">
            広告チャネルと広告費を登録・管理できます
          </p>
        </div>

        {/* メッセージ表示 */}
        {message && (
          <Alert variant={message.type === "success" ? "default" : "destructive"}>
            {message.type === "success" ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <AlertDescription className="whitespace-pre-line">
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 広告チャネル追加 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                新しいチャネルを追加
              </CardTitle>
              <CardDescription>
                Google Ads、Facebook、チラシなどの広告チャネルを登録します
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="channelName">チャネル名</Label>
                <Input
                  id="channelName"
                  type="text"
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  placeholder="例: Google Ads"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="budget">月間予算（オプション）</Label>
                <Input
                  id="budget"
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="例: 100000"
                />
                <p className="text-sm text-gray-500">
                  月間の広告予算を設定できます
                </p>
              </div>

              <Button
                onClick={handleAddChannel}
                disabled={!channelName}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-5 h-5 mr-2" />
                チャネルを追加
              </Button>
            </CardContent>
          </Card>

          {/* 広告費記録 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                広告費を記録
              </CardTitle>
              <CardDescription>
                日付とチャネルを選択して広告費を記録します
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="expenseChannel">チャネルID</Label>
                <Input
                  id="expenseChannel"
                  type="text"
                  value={channelId}
                  onChange={(e) => setChannelId(e.target.value)}
                  placeholder="作成したチャネルIDを入力"
                />
                <p className="text-sm text-gray-500">
                  左側でチャネルを作成すると、チャネルIDが表示されます
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expenseDate">日付</Label>
                <Input
                  id="expenseDate"
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">金額（円）</Label>
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="例: 50000"
                />
              </div>

              <Button
                onClick={handleRecordExpense}
                disabled={isSubmitting || !channelId || !amount}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin mr-2" />
                    記録中...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    広告費を記録
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* 使い方ガイド */}
        <Card>
          <CardHeader>
            <CardTitle>使い方</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                1. 広告チャネルを追加
              </h3>
              <p className="text-sm text-gray-600">
                左側のフォームでチャネル名と予算を入力して、「チャネルを追加」ボタンをクリックします。
                チャネルIDが生成されますので、コピーしておいてください。
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                2. 広告費を記録
              </h3>
              <p className="text-sm text-gray-600">
                右側のフォームでチャネルID、日付、金額を入力して、「広告費を記録」ボタンをクリックします。
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                3. 広告効果を分析
              </h3>
              <p className="text-sm text-gray-600">
                ダッシュボードの「広告分析」タブで、CPA、ROASなどの指標を確認できます。
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdvertisingExpenseForm;
