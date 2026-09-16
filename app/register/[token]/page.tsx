import { getRegistrationToken } from "@/lib/auth/users";
import RegisterForm from "./RegisterForm";

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const regToken = await getRegistrationToken(token);

  if (!regToken) {
    return (
      <StatusScreen
        title="Invalid Link"
        message="This registration link does not exist. Please ask your admin for a new one."
      />
    );
  }

  if (regToken.used_at) {
    return (
      <StatusScreen
        title="Link Already Used"
        message="This registration link has already been used to create an account. Please ask your admin for a new one."
      />
    );
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[var(--wk-canvas)] p-4">
      <div className="w-full max-w-md">
        <div className="rounded-lg border border-[var(--wk-line)] bg-[var(--wk-surface)] p-8 shadow-sm">
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-2xl font-black text-[var(--wk-ink)]">
              Wokkang
            </h1>
            <p className="text-sm text-[var(--wk-muted)]">
              Create your account
            </p>
          </div>
          <RegisterForm token={token} />
        </div>
      </div>
    </div>
  );
}

function StatusScreen({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[var(--wk-canvas)] p-4">
      <div className="w-full max-w-md">
        <div className="rounded-lg border border-[var(--wk-line)] bg-[var(--wk-surface)] p-8 text-center shadow-sm">
          <h1 className="mb-3 text-xl font-bold text-[var(--wk-ink)]">
            {title}
          </h1>
          <p className="text-[var(--wk-muted)]">{message}</p>
        </div>
      </div>
    </div>
  );
}
