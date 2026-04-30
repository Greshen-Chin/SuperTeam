import { Suspense } from "react";
import LoginPage from "@/features/hackathon/LoginPage";

export default function Page() {
  return (
    <Suspense>
      <LoginPage />
    </Suspense>
  );
}
