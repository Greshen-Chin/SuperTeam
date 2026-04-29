import { CertificateView } from "@/features/certificate/certificate-view";
import { apiClient } from "@/lib/api-client";

type CertificatePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CertificatePage({ params }: CertificatePageProps) {
  const { id } = await params;
  const proof = await apiClient.getProof(id);
  return <CertificateView proof={proof} />;
}

