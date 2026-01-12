import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

interface FamilyMember {
  memberId: string;
  customerId: string;
  fullName: string;
  relationshipType: string;
  totalPoints: number;
  visitCount: number;
}

export default function FamilyCheckIn() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scannedQR, setScannedQR] = useState<string | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [isScanning, setIsScanning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getGroupByCustomer = trpc.family.getGroupByCustomer.useQuery(
    { customerId: scannedQR || "" },
    { enabled: !!scannedQR }
  );

  const getMembers = trpc.family.getMembers.useQuery(
    { groupId: getGroupByCustomer.data?.groupId || "" },
    { enabled: !!getGroupByCustomer.data?.groupId }
  );

  const recordVisit = trpc.customers.recordVisit.useMutation();

  useEffect(() => {
    if (getMembers.data) {
      setFamilyMembers(getMembers.data);
      // 親を自動選択
      const parentMember = getMembers.data.find(m => m.relationshipType === "parent");
      if (parentMember) {
        setSelectedMembers(new Set([parentMember.customerId]));
      }
    }
  }, [getMembers.data]);

  useEffect(() => {
    if (!isScanning) return;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          scanQRCode();
        }
      } catch (error) {
        toast.error("カメラへのアクセスが拒否されました");
        setIsScanning(false);
      }
    };

    startCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, [isScanning]);

  const scanQRCode = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;

    if (!canvas || !video) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scan = () => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code) {
          setScannedQR(code.data);
          setIsScanning(false);
          return;
        }
      }
      requestAnimationFrame(scan);
    };

    scan();
  };

  const handleMemberToggle = (customerId: string) => {
    const newSelected = new Set(selectedMembers);
    if (newSelected.has(customerId)) {
      newSelected.delete(customerId);
    } else {
      newSelected.add(customerId);
    }
    setSelectedMembers(newSelected);
  };

  const handleSubmit = async () => {
    if (selectedMembers.size === 0) {
      toast.error("来院者を選択してください");
      return;
    }

    setIsSubmitting(true);
    try {
      for (const customerId of Array.from(selectedMembers)) {
        await recordVisit.mutateAsync({ customerId });
      }
      toast.success(`${selectedMembers.size}人の来院を記録しました`);
      setScannedQR(null);
      setFamilyMembers([]);
      setSelectedMembers(new Set());
    } catch (error) {
      toast.error("来院記録に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!scannedQR) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-50 to-white p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>ファミリー来院管理</CardTitle>
            <CardDescription>親のQRコードをスキャンしてください</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isScanning ? (
              <Button onClick={() => setIsScanning(true)} className="w-full" size="lg">
                カメラを起動
              </Button>
            ) : (
              <div className="space-y-4">
                <video
                  ref={videoRef}
                  className="w-full rounded-lg border-2 border-blue-300"
                  style={{ maxHeight: "300px" }}
                />
                <canvas ref={canvasRef} className="hidden" />
                <Button
                  onClick={() => setIsScanning(false)}
                  variant="outline"
                  className="w-full"
                >
                  キャンセル
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-50 to-white p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>本日の来院者を選択</CardTitle>
          <CardDescription>
            {familyMembers.length}人のファミリーメンバーが登録されています
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {familyMembers.length > 0 ? (
            <>
              <div className="space-y-3">
                {familyMembers.map(member => (
                  <div key={member.customerId} className="flex items-center space-x-3 p-3 border rounded-lg">
                    <Checkbox
                      checked={selectedMembers.has(member.customerId)}
                      onCheckedChange={() => handleMemberToggle(member.customerId)}
                      id={member.customerId}
                    />
                    <label
                      htmlFor={member.customerId}
                      className="flex-1 cursor-pointer"
                    >
                      <div className="font-medium">{member.fullName}</div>
                      <div className="text-sm text-gray-500">
                        {member.relationshipType === "parent" && "親"}
                        {member.relationshipType === "child" && "子"}
                        {member.relationshipType === "spouse" && "配偶者"}
                        {member.relationshipType === "other" && "その他"}
                        {" "}• ポイント: {member.totalPoints}
                      </div>
                    </label>
                  </div>
                ))}
              </div>

              <div className="pt-4 space-y-2">
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || selectedMembers.size === 0}
                  className="w-full"
                  size="lg"
                >
                  {isSubmitting ? "記録中..." : `${Array.from(selectedMembers).length}人を記録`}
                </Button>
                <Button
                  onClick={() => {
                    setScannedQR(null);
                    setFamilyMembers([]);
                    setSelectedMembers(new Set());
                  }}
                  variant="outline"
                  className="w-full"
                >
                  別のQRコードをスキャン
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">ファミリーメンバーを読み込み中...</p>
              <Button
                onClick={() => {
                  setScannedQR(null);
                  setIsScanning(true);
                }}
                variant="outline"
              >
                再度スキャン
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
