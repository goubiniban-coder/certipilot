import { Badge } from "@/components/ui/badge";
import { CERTIFICATE_STATUS_LABELS, type CertificateStatus } from "@/lib/rules";

const VARIANTS = { valid: "success", expired: "warning", revoked: "destructive" } as const;

export function CertificateStatusBadge({ status }: { status: CertificateStatus }) {
  return <Badge variant={VARIANTS[status]}>{CERTIFICATE_STATUS_LABELS[status]}</Badge>;
}
