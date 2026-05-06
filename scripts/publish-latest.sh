#!/usr/bin/env bash
set -euo pipefail

message="${1:-更新小说章节}"
remote="${GIT_REMOTE:-origin}"
branch="${GIT_BRANCH:-main}"

npm run build

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "当前目录还不是 Git 仓库。请先 git init 并绑定 GitHub Pages 仓库远程地址。"
  exit 1
fi

git add .github .nojekyll index.html assets manifest.json package.json scripts books

if git diff --cached --quiet; then
  echo "没有需要发布的新内容。"
  exit 0
fi

git commit -m "$message"
git push "$remote" "$branch"
