import dynamic from "next/dynamic";

const CheckPageView = dynamic(() =>
  import("@/features/check/check-page-view").then((m) => m.CheckPageView)
);

export default function CheckPage() {
  return <CheckPageView />;
}
