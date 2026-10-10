"use client";

import { useState, type ComponentProps } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type SignInButtonProps = Pick<ComponentProps<typeof Button>, "size" | "variant"> & {
  children: React.ReactNode;
  /** When set, the button shows a spinner and this label while redirecting. */
  pendingLabel?: string;
};

export function SignInButton({
  children,
  size = "lg",
  variant,
  pendingLabel,
}: SignInButtonProps) {
  const [pending, setPending] = useState(false);

  async function signIn() {
    setPending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    // On success the browser navigates away; only a failure lands here.
    if (error) setPending(false);
  }

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      onClick={signIn}
      disabled={pending && pendingLabel !== undefined}
      aria-busy={pending || undefined}
    >
      {pending && pendingLabel !== undefined ? (
        <>
          <Loader2 aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
          <span role="status">{pendingLabel}</span>
        </>
      ) : (
        children
      )}
    </Button>
  );
}
