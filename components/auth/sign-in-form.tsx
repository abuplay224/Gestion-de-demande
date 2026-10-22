"use client";

import { useActionState } from "react";
import { fieldA11y, FormField } from "@/components/demandes/form-field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signIn, type SignInState } from "@/server/actions/auth";

export function SignInForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<SignInState, FormData>(signIn, {});

  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      {state.error && (
        <Alert className="flex gap-3 rounded-[14px] border border-doztra-error-border bg-doztra-error-bg px-4 py-3.5">
          <span
            aria-hidden="true"
            className="grid size-6 flex-none place-items-center rounded-lg bg-doztra-error-chip text-[13px] font-extrabold text-doztra-error"
          >
            !
          </span>
          <div className="flex flex-col gap-0.5">
            <AlertTitle className="text-sm font-bold text-doztra-error-title">Connexion refusée</AlertTitle>
            <AlertDescription className="text-[13.5px] text-doztra-muted-2">{state.error}</AlertDescription>
          </div>
        </Alert>
      )}

      <input type="hidden" name="next" value={next} />
      <FormField id="login-email" label="E-mail">
        <Input
          {...fieldA11y("login-email")}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          defaultValue={state.email}
          autoFocus
          required
        />
      </FormField>
      <FormField id="login-password" label="Mot de passe">
        <Input {...fieldA11y("login-password")} name="password" type="password" autoComplete="current-password" required />
      </FormField>

      <Button
        type="submit"
        size="none"
        disabled={pending}
        aria-busy={pending}
        className={`mt-1 min-h-[50px] w-full rounded-[13px] px-5 py-[13px] text-[15px] shadow-[0_8px_24px_-10px_rgba(123,92,245,.8)] ${pending ? "opacity-70" : ""}`}
      >
        {pending ? "Connexion…" : "Se connecter"}
      </Button>
      <p className="m-0 text-center text-[13px] text-doztra-muted">
        Pas de compte ou mot de passe oublié ? Adressez-vous à un administrateur Doztra.
      </p>
    </form>
  );
}
