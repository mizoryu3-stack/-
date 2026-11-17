"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { getSupabase } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/utils";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <main className="flex min-h-dvh items-center justify-center p-5">
      <form
        className="w-full max-w-sm space-y-4 rounded-2xl border bg-card p-6"
        onSubmit={async (e) => {
          e.preventDefault();
          if (password.length < 8) return setError("パスワードは8文字以上にしてください");
          setPending(true);
          const { error } = await getSupabase().auth.updateUser({ password });
          setPending(false);
          if (error) return setError(errorMessage(error));
          router.replace("/");
        }}
      >
        <h1 className="font-semibold">新しいパスワードを設定</h1>
        <Field label="新しいパスワード（8文字以上）" htmlFor="np">
          <Input id="np" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button className="w-full" disabled={pending}>{pending ? <Loader2 className="animate-spin" /> : null}保存する</Button>
      </form>
    </main>
  );
}
