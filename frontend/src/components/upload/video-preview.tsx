"use client";

import { useEffect, useState } from "react";

type VideoPreviewProps = {
  file: File | null;
};

export function VideoPreview({ file }: VideoPreviewProps) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  if (!url) return null;

  return (
    <video
      className="aspect-video w-full rounded-xl border border-line bg-black object-contain"
      controls
      src={url}
    />
  );
}

