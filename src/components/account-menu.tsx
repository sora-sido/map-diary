"use client";

import { signOut, useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function AccountMenu() {
  const { data: session } = useSession();
  if (!session?.user) return null;

  return (
    <Popover>
      <PopoverTrigger className="rounded-full shadow-lg ring-1 ring-white/60 backdrop-blur-xl">
        <Avatar className="size-9">
          <AvatarImage src={session.user.image ?? undefined} />
          <AvatarFallback>{session.user.name?.[0]}</AvatarFallback>
        </Avatar>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-56 border-none bg-white/60 p-3 shadow-xl ring-1 ring-white/60 backdrop-blur-xl"
      >
        <p className="mb-0.5 text-sm font-medium">{session.user.name}</p>
        <p className="mb-3 text-xs text-muted-foreground">
          {session.user.email}
        </p>
        <Button
          size="sm"
          variant="outline"
          className="w-full"
          onClick={() => signOut()}
        >
          ログアウト
        </Button>
      </PopoverContent>
    </Popover>
  );
}
