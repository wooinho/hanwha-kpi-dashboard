import { loadDataset } from "@/lib/loadData";
import { OverviewClient } from "./OverviewClient";

export default function OverviewPage() {
  const data = loadDataset();
  return <OverviewClient data={data} />;
}
