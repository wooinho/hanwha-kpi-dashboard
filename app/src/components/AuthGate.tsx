"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Lock } from "lucide-react";

const AUTH_KEY = "hanwha-kpi-dashboard:auth:v1";

// 이 대시보드는 정적 사이트(GitHub Pages, public 저장소)라 서버가 없어 진짜 로그인 인증이 불가능하다.
// 여기서 거는 것은 "링크를 우연히 지나가다 열어본 사람"을 막는 가벼운 안내문 수준의 장치이지,
// 의도적으로 소스를 열어보는 사람까지 막는 보안 장치가 아니다(비밀번호 평문은 코드에 남기지 않고
// SHA-256 해시로 비교해 최소한의 노출은 줄였지만, 공개 저장소인 이상 완전한 보호는 불가능함).
const CREDENTIAL_HASH = "905fd3f96ea0253ba5e6f428f44d5603b778078bf7a24d531d4dd792c8a5a320";

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState<boolean | null>(null); // null = 확인 전(깜빡임 방지)
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    try {
      setAuthed(localStorage.getItem(AUTH_KEY) === "1");
    } catch {
      setAuthed(false); // 브라우저가 localStorage를 막아둔 경우 안전하게 로그인 화면부터 보여줌
    }
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setChecking(true);
    const hash = await sha256Hex(`${id}:${pw}`);
    setChecking(false);
    if (hash === CREDENTIAL_HASH) {
      try {
        localStorage.setItem(AUTH_KEY, "1");
      } catch {
        // 저장 실패해도 이번 세션 내에서는 통과시킴
      }
      setAuthed(true);
      setError(false);
    } else {
      setError(true);
      setPw("");
    }
  }

  if (authed === null) {
    return <div className="min-h-screen bg-gray-50" />;
  }

  if (!authed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-sm rounded-lg border border-[var(--border)] bg-white p-6 shadow-sm"
        >
          <div className="mb-4 flex items-center gap-2 text-gray-800">
            <Lock size={18} />
            <h1 className="text-base font-bold">한화생명 고객터치 KPI 대시보드</h1>
          </div>
          <p className="mb-4 text-xs text-gray-500">담당자만 접근할 수 있습니다. 아이디와 비밀번호를 입력해주세요.</p>

          <label className="mb-3 block text-sm">
            <span className="mb-1 block text-gray-600">아이디</span>
            <input
              value={id}
              onChange={(e) => setId(e.target.value)}
              autoFocus
              autoComplete="username"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none"
            />
          </label>
          <label className="mb-1 block text-sm">
            <span className="mb-1 block text-gray-600">비밀번호</span>
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              autoComplete="current-password"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none"
            />
          </label>

          {error && <p className="mt-2 text-xs text-red-600">아이디 또는 비밀번호가 올바르지 않습니다.</p>}

          <button
            type="submit"
            disabled={checking}
            className="mt-4 w-full rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {checking ? "확인 중..." : "로그인"}
          </button>

          <p className="mt-4 text-[11px] leading-relaxed text-gray-400">
            이 화면은 정적 사이트에 거는 간단한 접근 안내이며, 시스템 보안 인증이 아닙니다. 실제 보안이
            필요한 정보는 이 대시보드에 올리지 마세요.
          </p>
        </form>
      </div>
    );
  }

  return <>{children}</>;
}
