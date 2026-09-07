import { loadDataset } from "@/lib/loadData";
import { TrendsClient } from "./TrendsClient";

export default function TrendsPage() {
  const data = loadDataset();
  return <TrendsClient data={data} />;
}
