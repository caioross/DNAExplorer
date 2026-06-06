import SnpDetail from "@/components/SnpDetail";

export default function SnpPage({ params }: { params: { rsid: string } }) {
  return <SnpDetail rsid={params.rsid} />;
}
