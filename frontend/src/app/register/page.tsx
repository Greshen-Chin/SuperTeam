import dynamic from "next/dynamic";

const RegisterView = dynamic(() =>
  import("@/features/register/register-view").then((m) => m.RegisterView)
);

export default function RegisterPage() {
  return <RegisterView />;
}
