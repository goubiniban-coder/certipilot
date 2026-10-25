"use client";

import { useActionState } from "react";
import { ActionForm } from "@/components/forms/action-form";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { issueCertificate, revokeCertificate } from "./actions";

export function IssueCertificateForm({
  sessionId,
  sessionCandidateId,
  recommendationId,
  recommendationCode,
}: {
  sessionId: string;
  sessionCandidateId: string;
  recommendationId: string;
  recommendationCode: string;
}) {
  const [state, action] = useActionState(issueCertificate, {});
  return (
    <ActionForm action={action} className="grid gap-2">
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="sessionCandidateId" value={sessionCandidateId} />
      <input type="hidden" name="recommendationId" value={recommendationId} />
      <div>
        <SubmitButton variant="success" pendingLabel="Délivrance…">
          Délivrer le certificat {recommendationCode}
        </SubmitButton>
      </div>
      <FormMessage state={state} />
    </ActionForm>
  );
}

export function RevokeCertificateForm({ certificateId }: { certificateId: string }) {
  const [state, action] = useActionState(revokeCertificate, {});
  const errors = state.fieldErrors?.reason;
  return (
    <ActionForm action={action} className="grid gap-3">
      <input type="hidden" name="certificateId" value={certificateId} />
      <div className="grid gap-2">
        <Label htmlFor="revoke-reason">Motif de la révocation</Label>
        <Textarea id="revoke-reason" name="reason" rows={3} aria-invalid={errors ? true : undefined} />
        {errors ? <p className="font-semibold text-destructive">{errors.join(" ")}</p> : null}
      </div>
      <p className="text-sm text-muted-foreground">
        La révocation est définitive. Le certificat reste archivé et sa page de vérification indique « Révoqué ».
      </p>
      <div>
        <SubmitButton variant="destructive" pendingLabel="Révocation…">
          Révoquer le certificat
        </SubmitButton>
      </div>
      <FormMessage state={state} />
    </ActionForm>
  );
}
