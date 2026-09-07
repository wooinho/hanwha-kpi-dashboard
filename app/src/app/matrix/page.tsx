import { loadDataset } from "@/lib/loadData";
import { MatrixClient } from "./MatrixClient";

export default function MatrixPage() {
  const data = loadDataset();
  return <MatrixClient data={data} />;
}
