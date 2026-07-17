import AuthForm from "@/components/AuthForm";
import { login } from "@/app/auth/actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ checkEmail?: string }>;
}) {
  const params = await searchParams;
  const notice = params.checkEmail
    ? "Account created. Check your email to confirm, then sign in."
    : null;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 py-12 dark:bg-slate-950">
      <AuthForm mode="login" action={login} notice={notice} />
    </main>
  );
}
