import AuthForm from "@/components/AuthForm";
import { signup } from "@/app/auth/actions";

export default function SignupPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 py-12 dark:bg-slate-950">
      <AuthForm mode="signup" action={signup} />
    </main>
  );
}
