import { loadDataset } from "@/lib/loadData";
import { ContributionClient } from "@/components/ContributionClient";

export default function Home() {
  const data = loadDataset();
  return <ContributionClient data={data} />;
}
