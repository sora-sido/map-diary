"use client";

import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function AuthCard() {
  const { data: session, status } = useSession();

  return (
    <Card className="w-full max-w-md border-none shadow-none">
      <CardHeader className="text-center">
        <CardTitle className="text-3xl font-semibold tracking-tight">
          Map Diary
        </CardTitle>
        <CardDescription className="text-base">
          その日の場所・予定・写真・日記を地図の上でひとつに。
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        {status === "loading" ? null : session?.user ? (
          <>
            <Avatar className="size-16">
              <AvatarImage src={session.user.image ?? undefined} />
              <AvatarFallback>{session.user.name?.[0]}</AvatarFallback>
            </Avatar>
            <p className="text-sm text-muted-foreground">
              {session.user.name} ({session.user.email})
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/calendar" className={buttonVariants({ size: "lg" })}>
                今日の予定を見る
              </Link>
              <Link
                href="/map"
                className={buttonVariants({ size: "lg", variant: "secondary" })}
              >
                地図を見る
              </Link>
              <Button size="lg" variant="outline" onClick={() => signOut()}>
                ログアウト
              </Button>
            </div>
          </>
        ) : (
          <Button size="lg" onClick={() => signIn("google")}>
            Googleでログイン
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
