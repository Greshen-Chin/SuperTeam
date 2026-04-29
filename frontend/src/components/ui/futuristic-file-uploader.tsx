"use client";

import {
  AlertCircle,
  Archive,
  Check,
  Code,
  File,
  FileText,
  Film,
  Image as ImageIcon,
  Maximize,
  Minimize,
  Music,
  Trash2,
  Upload,
  X
} from "lucide-react";
import { formatFileSize, type UploadFileItem } from "@/lib/file-upload-model";
import { cn } from "@/lib/utils";
import { useFuturisticFileUploader } from "./use-futuristic-file-uploader";

type FuturisticFileUploaderProps = {
  accept?: string;
  disabled?: boolean;
  maxFiles?: number;
  multiple?: boolean;
  title?: string;
  description?: string;
  ctaLabel?: string;
  onFilesChange?: (files: File[]) => void;
};

export function FuturisticFileUploader({
  accept = "video/*",
  disabled = false,
  maxFiles = 1,
  multiple = false,
  title = "VidChain Uploader",
  description = "Drop a video here",
  ctaLabel = "Select Video",
  onFilesChange
}: FuturisticFileUploaderProps) {
  const uploader = useFuturisticFileUploader({
    disabled,
    maxFiles,
    multiple,
    onFilesChange
  });

  return (
    <div className="mx-auto w-full overflow-hidden rounded-xl border border-cyan-800/30 bg-black shadow-xl shadow-cyan-900/10">
      <UploaderHeader
        expanded={uploader.expanded}
        title={title}
        onToggleExpanded={() => uploader.setExpanded((value) => !value)}
      />

      {uploader.expanded ? (
        <>
          <UploadDropArea
            accept={accept}
            ctaLabel={ctaLabel}
            description={description}
            disabled={disabled}
            fileInputRef={uploader.fileInputRef}
            isDragging={uploader.isDragging}
            multiple={multiple}
            uploadAreaRef={uploader.uploadAreaRef}
            onDragEnter={uploader.handleDragEnter}
            onDragLeave={uploader.handleDragLeave}
            onDragOver={uploader.handleDragOver}
            onDrop={uploader.handleDrop}
            onFileSelect={uploader.selectFiles}
            onKeyboardOpen={uploader.handleKeyboardOpen}
            onOpenDialog={uploader.openFileDialog}
          />

          <UploadProgress
            overallProgress={uploader.stats.overallProgress}
            total={uploader.stats.total}
            totalSize={uploader.stats.totalSize}
            uploaded={uploader.stats.uploaded}
          />

          <FileList files={uploader.items} onClear={uploader.clearFiles} onRemove={uploader.removeFile} />
        </>
      ) : null}

      <UploaderStyles />
    </div>
  );
}

function UploaderHeader({
  expanded,
  title,
  onToggleExpanded
}: {
  expanded: boolean;
  title: string;
  onToggleExpanded: () => void;
}) {
  return (
    <div className="flex items-center justify-between border-b border-cyan-900/30 bg-gradient-to-r from-gray-900 to-black p-3">
      <div className="flex items-center">
        <div className="mr-3 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-600">
          <Upload className="h-4 w-4 text-white" />
        </div>
        <h2 className="font-bold tracking-wide text-white">{title}</h2>
      </div>

      <button
        className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-800 transition-colors hover:bg-gray-700"
        type="button"
        onClick={onToggleExpanded}
      >
        {expanded ? <Minimize className="h-4 w-4 text-gray-300" /> : <Maximize className="h-4 w-4 text-gray-300" />}
      </button>
    </div>
  );
}

function UploadDropArea({
  accept,
  ctaLabel,
  description,
  disabled,
  fileInputRef,
  isDragging,
  multiple,
  uploadAreaRef,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  onFileSelect,
  onKeyboardOpen,
  onOpenDialog
}: {
  accept: string;
  ctaLabel: string;
  description: string;
  disabled: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  isDragging: boolean;
  multiple: boolean;
  uploadAreaRef: React.RefObject<HTMLDivElement | null>;
  onDragEnter: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  onFileSelect: (files: FileList | null) => void;
  onKeyboardOpen: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  onOpenDialog: () => void;
}) {
  return (
    <div
      ref={uploadAreaRef}
      className={cn("overflow-hidden transition-all duration-300", isDragging ? "scale-[0.98]" : "scale-100")}
      role="button"
      tabIndex={0}
      onClick={onOpenDialog}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onKeyDown={onKeyboardOpen}
    >
      <input
        ref={fileInputRef}
        accept={accept}
        className="hidden"
        disabled={disabled}
        multiple={multiple}
        type="file"
        onChange={(event) => onFileSelect(event.target.files)}
      />

      <div
        className={cn(
          "m-3 cursor-pointer rounded-lg border border-dashed bg-gradient-to-b from-gray-900 to-black p-6 transition-colors",
          isDragging ? "border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)]" : "border-gray-700 hover:border-gray-500",
          disabled && "cursor-not-allowed opacity-60"
        )}
      >
        <div className="flex flex-col items-center justify-center text-center">
          <div
            className={cn(
              "mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-800",
              isDragging && "bg-cyan-900/50"
            )}
          >
            <Upload className={cn("h-8 w-8 transition-all", isDragging ? "text-cyan-400" : "text-gray-400")} />
          </div>

          <h3 className={cn("mb-2 font-medium transition-colors", isDragging ? "text-cyan-400" : "text-white")}>
            {isDragging ? "Release to upload" : description}
          </h3>
          <p className="mb-4 text-sm text-gray-500">or click to browse</p>
          <div className="rounded-full bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-1.5 text-sm font-medium text-white">
            {ctaLabel}
          </div>
        </div>
      </div>
    </div>
  );
}

function UploadProgress({
  overallProgress,
  total,
  totalSize,
  uploaded
}: {
  overallProgress: number;
  total: number;
  totalSize: number;
  uploaded: number;
}) {
  if (total === 0) return null;

  return (
    <div className="px-3">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
        <div
          className="h-full bg-gradient-to-r from-cyan-400 to-blue-600 transition-all duration-300"
          style={{ width: `${overallProgress}%` }}
        />
      </div>

      <div className="mt-1 flex items-center justify-between px-0.5 text-xs">
        <div className="text-gray-500">
          {uploaded} of {total} files - {formatFileSize(totalSize)}
        </div>
        <div className="font-medium text-cyan-400">{overallProgress}%</div>
      </div>
    </div>
  );
}

function FileList({
  files,
  onClear,
  onRemove
}: {
  files: UploadFileItem[];
  onClear: () => void;
  onRemove: (fileId: string, event?: React.MouseEvent) => void;
}) {
  if (files.length === 0) return null;

  return (
    <div className="mt-3 px-3 pb-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-400">Files</h3>
        <button className="text-red-500 transition-colors hover:text-red-400" type="button" onClick={onClear}>
          <Trash2 size={14} />
        </button>
      </div>

      <div className="scrollbar-thin max-h-64 space-y-2 overflow-y-auto pr-1">
        {files.map((file) => (
          <FileRow key={file.id} file={file} onRemove={onRemove} />
        ))}
      </div>
    </div>
  );
}

function FileRow({
  file,
  onRemove
}: {
  file: UploadFileItem;
  onRemove: (fileId: string, event?: React.MouseEvent) => void;
}) {
  return (
    <div className="group relative flex overflow-hidden rounded-lg border border-gray-800 bg-gray-900 transition-colors hover:border-gray-700">
      <FilePreview file={file} />

      <div className="min-w-0 flex-1 p-2 pl-3">
        <div className="truncate text-sm font-medium text-white">{file.file.name}</div>
        <div className="mt-0.5 flex items-center justify-between">
          <div className="text-xs text-gray-500">{formatFileSize(file.file.size)}</div>
          <FileStatus file={file} />
        </div>

        {!file.uploaded ? <FileProgress file={file} /> : null}
      </div>

      <button
        className="absolute right-2 top-2 text-gray-500 opacity-0 transition-opacity hover:text-white group-hover:opacity-100"
        type="button"
        onClick={(event) => onRemove(file.id, event)}
      >
        <X size={16} />
      </button>
    </div>
  );
}

function FilePreview({ file }: { file: UploadFileItem }) {
  return (
    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center bg-gray-800">
      {file.preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt={file.file.name} className="h-full w-full object-cover" src={file.preview} />
      ) : (
        <div className="text-cyan-400">{getFileIcon(file.file.type)}</div>
      )}
    </div>
  );
}

function FileProgress({ file }: { file: UploadFileItem }) {
  return (
    <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-gray-800">
      <div
        className={cn(
          "h-full transition-all duration-200",
          file.error ? "bg-red-500" : "bg-gradient-to-r from-cyan-400 to-blue-600"
        )}
        style={{ width: `${file.progress}%` }}
      />
    </div>
  );
}

function FileStatus({ file }: { file: UploadFileItem }) {
  if (file.uploaded) {
    return (
      <span className="flex items-center gap-1 text-xs text-green-400">
        <Check size={12} />
        Complete
      </span>
    );
  }

  if (file.error) {
    return (
      <span className="flex items-center gap-1 text-xs text-red-400">
        <AlertCircle size={12} />
        Error
      </span>
    );
  }

  return <span className="text-xs text-cyan-400">{file.progress}%</span>;
}

function getFileIcon(type: string) {
  if (type.startsWith("image/")) return <ImageIcon size={20} />;
  if (type.startsWith("video/")) return <Film size={20} />;
  if (type.startsWith("audio/")) return <Music size={20} />;
  if (type.startsWith("text/")) return <FileText size={20} />;
  if (type.includes("compressed") || type.includes("zip") || type.includes("rar")) return <Archive size={20} />;
  if (type.includes("json") || type.includes("javascript") || type.includes("html") || type.includes("css")) return <Code size={20} />;
  return <File size={20} />;
}

function UploaderStyles() {
  return (
    <style jsx>{`
      .scrollbar-thin::-webkit-scrollbar {
        width: 4px;
      }

      .scrollbar-thin::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0.1);
        border-radius: 4px;
      }

      .scrollbar-thin::-webkit-scrollbar-thumb {
        background: rgba(6, 182, 212, 0.3);
        border-radius: 4px;
      }

      .scrollbar-thin::-webkit-scrollbar-thumb:hover {
        background: rgba(6, 182, 212, 0.5);
      }

      .pulse-animation {
        animation: pulse 0.8s ease-out;
      }

      @keyframes pulse {
        0% {
          box-shadow: 0 0 0 0 rgba(6, 182, 212, 0.5);
        }
        70% {
          box-shadow: 0 0 0 20px rgba(6, 182, 212, 0);
        }
        100% {
          box-shadow: 0 0 0 0 rgba(6, 182, 212, 0);
        }
      }
    `}</style>
  );
}

