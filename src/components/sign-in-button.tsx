"use client";

import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type SignInButtonProps = Pick<ComponentProps<typeof Button>, "size" | "variant"> & {
  children: React.ReactNode;
};

export function SignInButton({ children, size = "lg", variant }: SignInButtonProps) {
  async function signIn() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <Button type="button" size={size} variant={variant} onClick={signIn}>
      {children}
    </Button>
  );
}
