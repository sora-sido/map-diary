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
    <div className="group relative h-24 w-24 shrink-0">
      <Image
        src={url}
        alt=""
        width={96}
        height={96}
        unoptimized
        className="h-24 w-24 rounded-xl object-cover"
      />
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        aria-label="写真を削除"
        className="absolute -top-1.5 -left-1.5 flex size-5 items-center justify-center rounded-full bg-black/70 text-white opacity-0 shadow transition-opacity group-hover:opacity-100 disabled:opacity-100"
      >
        <X className="size-3" strokeWidth={2.5} />
      </button>
    </div>
  );
}
