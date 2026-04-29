"use client";

import { FuturisticFileUploader } from "@/components/ui/futuristic-file-uploader";

type VideoDropzoneProps = {
  file: File | null;
  disabled?: boolean;
  onFileSelected: (file: File) => void;
};

export function VideoDropzone({ file, disabled, onFileSelected }: VideoDropzoneProps) {
  return (
    <FuturisticFileUploader
      accept="video/*"
      ctaLabel="Select Video"
      description={file ? file.name : "Drop video here"}
      disabled={disabled}
      maxFiles={1}
      title="VidChain Uploader"
      onFilesChange={(files) => {
        const selected = files[0];
        if (selected) onFileSelected(selected);
      }}
    />
  );
}
