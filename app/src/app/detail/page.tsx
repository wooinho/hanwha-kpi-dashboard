import { loadDataset } from "@/lib/loadData";
import Link from "next/link";

/** /detail 인덱스 - 이벤트를 선택하지 않고 들어온 경우 목록을 보여준다. */
export default function DetailIndexPage() {
  const data = loadDataset();
  const events = [...data.events].sort((a, b) => (a.event_month < b.event_month ? 1 : -1));
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">이벤트 상세 진단</h1>
        <p className="text-sm text-gray-500">진단할 이벤트(회차)를 선택하세요.</p>
      </div>
      <div className="card divide-y divide-[var(--border)]">
        {events.map((e) => (
          <Link
            key={e.event_id}
            href={`/detail/${e.event_id}`}
            className="flex items-center justify-between px-4 py-3 text-sm hover:bg-gray-50"
          >
            <span className="text-gray-800">
              {e.event_month} · {e.event_name}
              <span className="ml-2 text-xs text-gray-400">{e.report_month} 보고서</span>
            </span>
            <span className="text-xs text-gray-400">{e.event_id}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
