"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  UploadFileCollection,
  UploadFileItemFactory,
  type UploadFileItem
} from "@/lib/file-upload-model";

type UseFuturisticFileUploaderOptions = {
  disabled: boolean;
  maxFiles: number;
  multiple: boolean;
  onFilesChange?: (files: File[]) => void;
};

export function useFuturisticFileUploader({
  disabled,
  maxFiles,
  multiple,
  onFilesChange
}: UseFuturisticFileUploaderOptions) {
  const [items, setItems] = useState<UploadFileItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadAreaRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<UploadFileItem[]>([]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    return () => new UploadFileCollection(itemsRef.current).revokePreviews();
  }, []);

  const stats = useMemo(() => new UploadFileCollection(items).stats(), [items]);

  function selectFiles(selectedFiles: FileList | null) {
    if (!selectedFiles || disabled) return;

    pulseUploadArea();

    const nextItems = Array.from(selectedFiles)
      .slice(0, multiple ? maxFiles : 1)
      .map((file) => UploadFileItemFactory.create(file));

    setItems((previous) => {
      const merged = multiple ? [...previous, ...nextItems].slice(0, maxFiles) : nextItems;
      onFilesChange?.(new UploadFileCollection(merged).files());
      return merged;
    });

    nextItems.forEach((item) => simulateUpload(item.id));
  }

  function removeFile(fileId: string, event?: React.MouseEvent) {
    event?.stopPropagation();

    setItems((previous) => {
      const fileToRemove = previous.find((file) => file.id === fileId);
      if (fileToRemove?.preview) URL.revokeObjectURL(fileToRemove.preview);

      const updated = previous.filter((file) => file.id !== fileId);
      onFilesChange?.(new UploadFileCollection(updated).files());
      return updated;
    });
  }

  function clearFiles() {
    new UploadFileCollection(items).revokePreviews();
    setItems([]);
    onFilesChange?.([]);
  }

  function openFileDialog() {
    if (!disabled) fileInputRef.current?.click();
  }

  function handleDragEnter(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!disabled) setIsDragging(true);
  }

  function handleDragLeave(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    selectFiles(event.dataTransfer.files);
  }

  function handleKeyboardOpen(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") openFileDialog();
  }

  function pulseUploadArea() {
    if (!uploadAreaRef.current) return;
    uploadAreaRef.current.classList.add("pulse-animation");
    window.setTimeout(() => uploadAreaRef.current?.classList.remove("pulse-animation"), 800);
  }

  function simulateUpload(fileId: string) {
    let progress = 0;
    const interval = window.setInterval(() => {
      progress += Math.floor(Math.random() * 15) + 12;

      setItems((previous) =>
        previous.map((item) => {
          if (item.id !== fileId) return item;
          const nextProgress = Math.min(progress, 100);
          return {
            ...item,
            progress: nextProgress,
            uploaded: nextProgress >= 100
          };
        })
      );

      if (progress >= 100) window.clearInterval(interval);
    }, 180);
  }

  return {
    items,
    stats,
    isDragging,
    expanded,
    fileInputRef,
    uploadAreaRef,
    setExpanded,
    selectFiles,
    removeFile,
    clearFiles,
    openFileDialog,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleKeyboardOpen
  };
}

