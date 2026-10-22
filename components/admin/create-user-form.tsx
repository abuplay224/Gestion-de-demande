"use client";

import { useState } from "react";
import { useDemandes } from "@/components/demandes/demandes-provider";
import { fieldA11y, FormField } from "@/components/demandes/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PASSWORD_MIN, ROLE_LABELS, ROLES } from "@/lib/roles";
import { createUser } from "@/server/actions/users";
import {
  type UserField,
  type UserFormValues,
  USER_FIELDS,
  validateUserField,
  validateUserForm,
} from "@/server/validation/user.schema";

const EMPTY: UserFormValues = { name: "", email: "", role: "agent", password: "" };
const id = (f: UserField) => `u-${f}`;

export function CreateUserForm() {
  const { notify } = useDemandes();
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<UserField, string>>>({});
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  function change(field: UserField, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: validateUserField(field, value) }));
  }

  function focusFirst(errs: Partial<Record<UserField, string>>) {
    const first = USER_FIELDS.find((f) => errs[f]);
    if (first) setTimeout(() => document.getElementById(id(first))?.focus(), 30);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    const errs = validateUserForm(values);
    setFailure(null);
    if (Object.keys(errs).length) {
      setErrors(errs);
      focusFirst(errs);
      return;
    }
    setPending(true);
    try {
      const res = await createUser(values);
      if (res.ok) {
        notify(`Compte créé pour ${values.email.trim().toLowerCase()}`);
        setValues(EMPTY);
        setErrors({});
      } else if (res.fields) {
        setErrors(res.fields);
        focusFirst(res.fields);
      } else {
        setFailure(res.message);
      }
    } catch {
      setFailure("Connexion au serveur impossible. Réessayez.");
    } finally {
      setPending(false);
    }
  }

  const bind = (field: UserField) => ({
    ...fieldA11y(id(field), errors[field]),
    name: field,
    value: values[field],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => change(field, e.target.value),
    // Ajoute une erreur locale à la sortie du champ, sans effacer une erreur renvoyée par le
    // serveur (ex. e-mail déjà utilisé) : seule une modification de la valeur la retire.
    onBlur: () => {
      const m = values[field] ? validateUserField(field, values[field]) : undefined;
      if (m) setErrors((er) => ({ ...er, [field]: m }));
    },
  });

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      {failure && (
        <Alert className="rounded-[14px] border border-doztra-error-border bg-doztra-error-bg px-4 py-3">
          <AlertDescription className="text-[13.5px] text-doztra-error-title">{failure}</AlertDescription>
        </Alert>
      )}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-4">
        <FormField id={id("name")} label="Nom complet *" error={errors.name}>
          <Input {...bind("name")} type="text" autoComplete="off" />
        </FormField>
        <FormField id={id("email")} label="E-mail *" error={errors.email}>
          <Input {...bind("email")} type="email" inputMode="email" autoComplete="off" />
        </FormField>
        <FormField id={id("role")} label="Rôle *" error={errors.role}>
          <select
            {...bind("role")}
            className="min-h-12 w-full rounded-xl border-[1.5px] border-doztra-control bg-doztra-field px-3.5 text-base text-doztra-ink aria-invalid:border-doztra-error-field"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </FormField>
        <FormField id={id("password")} label={`Mot de passe provisoire * (${PASSWORD_MIN} car. min.)`} error={errors.password}>
          <Input {...bind("password")} type="password" autoComplete="new-password" />
        </FormField>
      </div>
      <div className="flex justify-end">
        <Button
          type="submit"
          size="none"
          disabled={pending}
          aria-busy={pending}
          className={`min-h-12 rounded-[13px] px-6 py-3 text-[15px] ${pending ? "opacity-70" : ""}`}
        >
          {pending ? "Création…" : "Créer le compte"}
        </Button>
      </div>
    </form>
  );
}
