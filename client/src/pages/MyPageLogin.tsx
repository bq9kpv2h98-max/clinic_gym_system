import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, User } from "lucide-react";

export default function MyPageLogin() {
  const [phone, setPhone] = useState("");
  const [, setLocation] = useLocation();


  const loginMutation = trpc.mypage.login.useMutation({
    onSuccess: (data: any) => {
      localStorage.setItem("mypage_customer_id", data.customerId);
      localStorage.setItem("mypage_customer_name", data.fullName);
      
      toast.success(`ようこそ、${data.fullName}様`);
      
      setLocation("/mypage");
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phone || phone.length < 10) {
      toast.error("電話番号を正しく入力してください（10-11桁）");
      return;
    }

    loginMutation.mutate({ phone });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <User className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">マイページログイン</CardTitle>
          <CardDescription className="text-center">
            登録済みの電話番号を入力してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">電話番号</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="09012345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
                maxLength={11}
                disabled={loginMutation.isPending}
              />
              <p className="text-xs text-muted-foreground">
                ハイフンなしで入力してください（例: 09012345678）
              </p>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ログイン中...
                </>
              ) : (
                "ログイン"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>まだ登録されていない方は</p>
            <Button
              variant="link"
              className="p-0 h-auto font-normal"
              onClick={() => setLocation("/register")}
            >
              こちらから新規登録
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
