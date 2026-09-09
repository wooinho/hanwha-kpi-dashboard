/**
 * GitHub Contents API로 브라우저에서 직접 저장소 파일을 커밋한다 (클라이언트 전용).
 *
 * 정적 사이트(서버 없음)에서 "업로드 → 모든 방문자에게 반영"을 구현하는 표준적인 방법 -
 * 토큰은 이 함수 호출 시에만 메모리에서 사용되고, 이 코드는 토큰을 어디에도 저장/전송하지 않는다
 * (호출부에서 로컬 저장 여부를 사용자가 직접 선택하게 한다).
 *
 * 이 커밋이 main의 data/processed/**.csv 를 바꾸면 .github/workflows/rebuild-pages.yml 이 자동으로
 * 정적 빌드를 다시 만들어 docs/ 에 반영하고, GitHub Pages가 그 커밋을 서빙해 링크를 가진 모든 사람에게
 * 업데이트가 반영된다.
 */

const OWNER = "wooinho";
const REPO = "hanwha-kpi-dashboard";
const BRANCH = "main";

export interface CommitResult {
  commitUrl: string;
  contentSha: string;
}

function toBase64Utf8(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

async function githubFetch(path: string, token: string, init?: RequestInit) {
  const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.headers ?? {}),
    },
  });
  return res;
}

/** 커밋 전에 토큰이 이 저장소에 쓸 수 있는지 가볍게 확인한다 (권한 부족을 사전에 알려주기 위함). */
export async function verifyGithubToken(token: string): Promise<{ ok: boolean; message: string }> {
  const res = await githubFetch("", token);
  if (res.status === 404) return { ok: false, message: "저장소를 찾을 수 없거나 토큰에 접근 권한이 없습니다." };
  if (res.status === 401) return { ok: false, message: "토큰이 유효하지 않습니다." };
  if (!res.ok) return { ok: false, message: `GitHub API 오류 (${res.status})` };
  const data = await res.json();
  if (data.permissions?.push !== true) {
    return { ok: false, message: "이 토큰은 저장소에 쓰기(push) 권한이 없습니다. Contents: Read and write 권한이 필요합니다." };
  }
  return { ok: true, message: "토큰 확인됨 - 이 저장소에 커밋할 수 있습니다." };
}

export async function commitCsvToGithub(
  path: string,
  csvContent: string,
  message: string,
  token: string
): Promise<CommitResult> {
  // 1) 기존 파일의 sha 조회 (업데이트에는 sha가 필요, 신규 생성이면 없어도 됨)
  const getRes = await githubFetch(`contents/${path}?ref=${BRANCH}`, token);
  let sha: string | undefined;
  if (getRes.ok) {
    const existing = await getRes.json();
    sha = existing.sha;
  } else if (getRes.status !== 404) {
    throw new Error(`기존 파일 조회 실패 (${getRes.status})`);
  }

  // 2) PUT으로 생성/업데이트 커밋
  const putRes = await githubFetch(`contents/${path}`, token, {
    method: "PUT",
    body: JSON.stringify({
      message,
      content: toBase64Utf8(csvContent),
      branch: BRANCH,
      ...(sha ? { sha } : {}),
    }),
  });
  if (!putRes.ok) {
    const body = await putRes.json().catch(() => ({}));
    throw new Error(`커밋 실패 (${putRes.status}): ${body.message ?? "알 수 없는 오류"}`);
  }
  const result = await putRes.json();
  return { commitUrl: result.commit?.html_url ?? "", contentSha: result.content?.sha ?? "" };
}

export function actionsRunsUrl(): string {
  return `https://github.com/${OWNER}/${REPO}/actions`;
}
