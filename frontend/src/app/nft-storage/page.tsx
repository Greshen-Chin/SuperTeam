import dynamic from "next/dynamic";

const NftStorageView = dynamic(() =>
  import("@/features/storage/storage-pages").then((m) => m.NftStorageView)
);

export default function NftStoragePage() {
  return <NftStorageView />;
}
