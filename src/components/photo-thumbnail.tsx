"use client";

import { useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";

export function PhotoThumbnail({ id, url }: { id: string; url: string }) {
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setDeleting(true);
    try {
      await fetch(`/api/photos/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="group relative h-16 w-16 shrink-0">
      <Image
        src={url}
        alt=""
        width={64}
        height={64}
        unoptimized
        className="h-16 w-16 rounded-lg object-cover"
      />
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        aria-label="写真を削除"
        className="absolute -top-1 -left-1 flex size-4 items-center justify-center rounded-full bg-black/70 text-white opacity-0 shadow transition-opacity group-hover:opacity-100 disabled:opacity-100"
      >
        <X className="size-2.5" strokeWidth={2.5} />
      </button>
    </div>
  );
}
