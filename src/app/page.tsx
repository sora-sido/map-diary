import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
      <Card className="w-full max-w-md border-none shadow-none">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-semibold tracking-tight">
            Map Diary
          </CardTitle>
          <CardDescription className="text-base">
            その日の場所・予定・写真・日記を地図の上でひとつに。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button size="lg">はじめる</Button>
        </CardContent>
      </Card>
    </div>
  );
}
