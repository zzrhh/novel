# 小说 GitHub Pages 阅读器

这是一个纯静态小说站。章节继续放在 `books/书名/章节/*.md`，运行构建脚本后会生成 `manifest.json`，网页会自动显示最新章节。

## 本地预览

```bash
npm run build
npm run serve
```

打开 `http://localhost:4173` 即可预览。

## 发布到 GitHub Pages

目标阅读地址：

```text
https://zzrhh.github.io/novel
```

这个地址对应 GitHub Pages 的项目站点，远程仓库通常是 `zzrhh/novel`。仓库发布后，GitHub 会把它挂在 `zzrhh.github.io/novel/` 下。

第一次绑定远程仓库后：

```bash
git init
git branch -M main
git remote add origin git@github.com:zzrhh/novel.git
npm run publish -- "发布小说站"
```

以后每次生成新章节后，只需要：

```bash
npm run publish -- "更新最新章节"
```

## GitHub Pages 设置

仓库 `zzrhh/novel` 创建后，在 GitHub 的仓库设置里进入 `Settings -> Pages`。

推荐先选择 `Deploy from a branch`，请选择 `main` 分支和 `/root` 目录。这个项目的 `index.html`、`manifest.json` 和章节文件都在根目录可直接发布。

如果之后想改成 `GitHub Actions`，再把 Source 切换为 `GitHub Actions`，仓库里的 `.github/workflows/pages.yml` 会自动构建并发布。
