import { loadDataset } from "@/lib/loadData";
import { PlannerClient } from "./PlannerClient";

export default function PlannerPage() {
  const data = loadDataset();
  return <PlannerClient data={data} />;
}
