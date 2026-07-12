"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function LoginGate() {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-white/40 backdrop-blur-sm">
      <Card className="pointer-events-auto w-full max-w-sm border-none bg-white/60 shadow-xl ring-1 ring-white/60 backdrop-blur-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-semibold tracking-tight">
            Map Diary
          </CardTitle>
          <CardDescription className="text-base">
            その日の場所・予定・写真・日記を地図の上でひとつに。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button size="lg" onClick={() => signIn("google")}>
            Googleでログイン
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
