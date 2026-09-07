import type { NextConfig } from "next";

// GitHub Pages(프로젝트 사이트, https://<user>.github.io/<repo>/)에 정적 배포하기 위한 설정.
// basePath/assetPrefix는 GITHUB_PAGES=true 일 때만 적용한다 - 그래야 로컬 `npm run dev`는
// 그대로 http://localhost:3100/ 에서 보이고, 배포 빌드(publish_to_github.bat)만 하위 경로를 쓴다.
const repoName = "hanwha-kpi-dashboard";
const isGithubPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  ...(isGithubPages
    ? { basePath: `/${repoName}`, assetPrefix: `/${repoName}/` }
    : {}),
};

export default nextConfig;
