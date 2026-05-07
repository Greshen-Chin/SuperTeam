import dynamic from "next/dynamic";

const MarketView = dynamic(() =>
  import("@/features/market/market-view").then((m) => m.MarketView)
);

export const metadata = { title: "License Market — VidChain" };

export default function MarketPage() {
  return <MarketView />;
}
