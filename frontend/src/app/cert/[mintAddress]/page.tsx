import CertificatePage from "@/features/hackathon/CertificatePage";

type PageProps = {
  params: Promise<{
    mintAddress: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  const { mintAddress } = await params;
  return <CertificatePage mintAddress={mintAddress} />;
}
