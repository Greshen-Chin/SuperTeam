import dynamic from "next/dynamic";

const VideoStorageView = dynamic(() =>
  import("@/features/storage/vault-page").then((m) => m.VideoStorageView)
);

export default function VideoStoragePage() {
  return <VideoStorageView />;
}
