"use client";

import { useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const THUMBNAIL_SIZE = 64;
const EXPANDED_SIZE = 160;

export function PhotoThumbnail({ id, url }: { id: string; url: string }) {
  const [deleting, setDeleting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    setDeleting(true);
    try {
      await fetch(`/api/photos/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  const size = expanded ? EXPANDED_SIZE : THUMBNAIL_SIZE;

  return (
    <div
      className="group relative shrink-0 cursor-pointer transition-[width,height] duration-200"
      style={{ width: size, height: size }}
      onClick={() => setExpanded((v) => !v)}
    >
      <Image
        src={url}
        alt=""
        width={EXPANDED_SIZE}
        height={EXPANDED_SIZE}
        unoptimized
        className="h-full w-full rounded-lg object-cover"
      />
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        aria-label="写真を削除"
        className={cn(
          "absolute -top-1.5 -left-1.5 flex size-6 items-center justify-center rounded-full bg-black/70 text-white shadow transition-opacity group-hover:opacity-100 disabled:opacity-100",
          expanded ? "opacity-100" : "opacity-0",
        )}
      >
        <X className="size-3.5" strokeWidth={2.5} />
      </button>
    </div>
  );
}
