"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createRequest } from "@/server/actions/create-request";
import {
  DESCRIPTION_MAX,
  type FieldErrors,
  REQUEST_FIELDS,
  type RequestField,
  type RequestFormValues,
  validateField,
  validateForm,
} from "@/server/validation/request.schema";
import { useDemandes } from "./demandes-provider";
import { fieldA11y, FormField } from "./form-field";

const EMPTY: RequestFormValues = { customerName: "", customerEmail: "", customerPhone: "", subject: "", description: "" };

const IDS: Record<RequestField, string> = {
  customerName: "f-name",
  customerEmail: "f-email",
  customerPhone: "f-phone",
  subject: "f-subject",
  description: "f-desc",
};

const LEGEND = "mb-3.5 p-0 text-xs font-extrabold tracking-[.08em] text-doztra-muted uppercase";

export function RequestForm({ submissionId }: { submissionId: string }) {
  const router = useRouter();
  const { markFresh, notify } = useDemandes();
  const [values, setValues] = useState<RequestFormValues>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Un champ déjà en erreur est revalidé à chaque frappe ; sinon on attend la sortie du champ.
  function change(field: RequestField, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: validateField(field, value) }));
  }

  function blur(field: RequestField) {
    if (!values[field].trim() && !errors[field]) return;
    setErrors((e) => ({ ...e, [field]: validateField(field, values[field]) }));
  }

  function focusFirst(errs: FieldErrors) {
    const first = REQUEST_FIELDS.find((f) => errs[f]);
    if (first) setTimeout(() => document.getElementById(IDS[first])?.focus(), 30);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const errs = validateForm(values);
    if (Object.keys(errs).length) {
      setErrors(errs);
      setSubmitError(null);
      focusFirst(errs);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await createRequest({ submissionId, ...values });
      if (res.ok) {
        markFresh(res.data.id);
        notify("Demande enregistrée");
        router.push("/demandes");
        return;
      }
      setSubmitting(false);
      if (res.code === "VALIDATION_ERROR" && res.fields) {
        setErrors(res.fields as FieldErrors);
        focusFirst(res.fields as FieldErrors);
      } else {
        setSubmitError(res.message);
      }
    } catch {
      setSubmitting(false);
      setSubmitError(
        "Connexion au serveur impossible. Votre saisie est conservée : vous pouvez réessayer sans risque de doublon."
      );
    }
  }

  const bind = (field: RequestField) => ({
    ...fieldA11y(IDS[field], errors[field]),
    name: field,
    value: values[field],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => change(field, e.target.value),
    onBlur: () => blur(field),
  });

  const descLength = values.description.trim().length;
  const descOut = descLength > DESCRIPTION_MAX || (descLength > 0 && descLength < 10);

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-[26px]">
      {submitError && (
        <Alert className="flex gap-3 rounded-[14px] border border-doztra-error-border bg-doztra-error-bg px-4 py-3.5">
          <span
            aria-hidden="true"
            className="grid size-6 flex-none place-items-center rounded-lg bg-doztra-error-chip text-[13px] font-extrabold text-doztra-error"
          >
            !
          </span>
          <div className="flex flex-col gap-0.5">
            <AlertTitle className="text-sm font-bold text-doztra-error-title">L’enregistrement a échoué</AlertTitle>
            <AlertDescription className="text-[13.5px] text-doztra-muted-2">{submitError}</AlertDescription>
          </div>
        </Alert>
      )}

      <fieldset className="m-0 flex flex-col gap-4 border-0 p-0">
        <legend className={LEGEND}>Client</legend>
        <FormField id={IDS.customerName} label="Nom du client ou de l’entreprise *" error={errors.customerName}>
          <Input {...bind("customerName")} type="text" autoComplete="organization" maxLength={160} autoFocus />
        </FormField>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-4">
          <FormField id={IDS.customerEmail} label="E-mail" optional error={errors.customerEmail}>
            <Input {...bind("customerEmail")} type="email" inputMode="email" autoComplete="email" />
          </FormField>
          <FormField id={IDS.customerPhone} label="Téléphone" optional error={errors.customerPhone}>
            <Input
              {...bind("customerPhone")}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+224 6XX XX XX XX"
            />
          </FormField>
        </div>
      </fieldset>

      <div className="h-px bg-doztra-line" />

      <fieldset className="m-0 flex flex-col gap-4 border-0 p-0">
        <legend className={LEGEND}>Demande</legend>
        <FormField id={IDS.subject} label="Objet *" error={errors.subject}>
          <Input {...bind("subject")} type="text" />
        </FormField>
        <FormField
          id={IDS.description}
          label="Description *"
          error={errors.description}
          aside={
            <span
              aria-live="polite"
              className={`text-[12.5px] tabular-nums ${descOut ? "text-doztra-error" : "text-doztra-muted"}`}
            >
              {descLength.toLocaleString("fr-FR")} / 5&nbsp;000
            </span>
          }
        >
          <Textarea {...bind("description")} rows={6} />
        </FormField>
      </fieldset>

      <div className="flex flex-wrap-reverse justify-end gap-2.5 pt-1">
        <Button
          variant="outline"
          size="none"
          nativeButton={false}
          render={<Link href="/demandes" />}
          className="min-h-[50px] max-w-[200px] flex-[1_1_140px] rounded-[13px] px-5 py-[13px] text-[15px]"
        >
          Annuler
        </Button>
        <Button
          type="submit"
          size="none"
          disabled={submitting}
          aria-busy={submitting}
          className={`min-h-[50px] max-w-[260px] flex-[1_1_180px] rounded-[13px] px-5 py-[13px] text-[15px] shadow-[0_8px_24px_-10px_rgba(123,92,245,.8)] ${submitting ? "opacity-70" : ""}`}
        >
          {submitting ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}
