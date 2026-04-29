export type UploadFileItem = {
  id: string;
  file: File;
  preview: string;
  progress: number;
  error?: string;
  uploaded: boolean;
};

export type UploadStats = {
  total: number;
  uploaded: number;
  totalSize: number;
  overallProgress: number;
};

export class UploadFileItemFactory {
  static create(file: File, progress = 0, uploaded = false): UploadFileItem {
    return {
      id: crypto.randomUUID(),
      file,
      preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : "",
      progress,
      uploaded
    };
  }
}

export class UploadFileCollection {
  constructor(private readonly items: UploadFileItem[]) {}

  stats(): UploadStats {
    const total = this.items.length;
    const uploaded = this.items.filter((file) => file.uploaded).length;
    const totalSize = this.items.reduce((acc, file) => acc + file.file.size, 0);
    const overallProgress = total
      ? Math.round(this.items.reduce((sum, file) => sum + file.progress, 0) / total)
      : 0;

    return {
      total,
      uploaded,
      totalSize,
      overallProgress
    };
  }

  files() {
    return this.items.map((item) => item.file);
  }

  revokePreviews() {
    this.items.forEach((item) => {
      if (item.preview) URL.revokeObjectURL(item.preview);
    });
  }
}

export function formatFileSize(bytes: number) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const index = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, index)).toFixed(2))} ${sizes[index]}`;
}

