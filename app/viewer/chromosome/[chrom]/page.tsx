import ChromosomeView from "@/components/ChromosomeView";

export default function ChromosomePage({ params }: { params: { chrom: string } }) {
  return <ChromosomeView chrom={params.chrom} />;
}
