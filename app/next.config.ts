import type { NextConfig } from "next";

// GitHub Pages(프로젝트 사이트, https://<user>.github.io/<repo>/)에 정적 배포하기 위한 설정.
// - output: 'export' -> next build 시 서버 없이 순수 정적 HTML/JS로 out/ 에 생성
// - basePath/assetPrefix -> 저장소 이름이 도메인 루트가 아닌 하위 경로이므로 필요
// - trailingSlash -> GitHub Pages가 디렉터리 요청 시 index.html을 자동으로 찾도록 route/index.html 구조로 생성
const repoName = "hanwha-kpi-dashboard";

const nextConfig: NextConfig = {
  output: "export",
  basePath: `/${repoName}`,
  assetPrefix: `/${repoName}/`,
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
