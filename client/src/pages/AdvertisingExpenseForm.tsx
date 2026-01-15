/**
 * 広告費登録ページ（経費管理へリダイレクト）
 * 
 * このページは経費管理機能に統合されました。
 * 自動的に経費管理ページにリダイレクトします。
 */

import { useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

const AdvertisingExpenseForm: React.FC = () => {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // 経費管理ページにリダイレクト
    setLocation("/expenses");
  }, [setLocation]);

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>リダイレクト中...</CardTitle>
          <CardDescription>
            広告費登録機能は経費管理ページに統合されました
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    </div>
  );
};

export default AdvertisingExpenseForm;
