import dynamic from "next/dynamic";

const VideoStorageView = dynamic(() =>
  import("@/features/storage/storage-pages").then((m) => m.VideoStorageView)
);

export default function VideoStoragePage() {
  return <VideoStorageView />;
}
