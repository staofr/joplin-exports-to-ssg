# Changelog

This document tracks the custom modifications made to the `joplin-exports-to-ssg` plugin. 

## [Custom Release] - 2026-04-25

### ✨ 新增与增强功能 (Features & Enhancements)

- **极简极速导出引擎**：重构了导出逻辑，移除了对特定静态站点生成器（Hugo, Gatsby, Jekyll）的过度适配，专注于纯粹且高效的 Markdown (`.md`) 文件导出。
- **自定义 Front Matter 模板**：
  - 导出对话框中默认预填了包含 `title`, `description`, `date` 的 YAML Front Matter。
  - **动态变量替换**：支持在模板中使用中文占位符。系统在导出时会自动将 `自动获取笔记名称` 替换为笔记的真实标题，将 `自动获取目前日期` 替换为导出当天的日期（格式：`YYYY-MM-DD`）。
- **新增 Footer Matter (页脚模板) 支持**：
  - 在导出界面新增了 Footer Matter 文本框。
  - 默认预填了包含微信、电话、邮箱、Discord、Telegram 等图标链接的 HTML “联系我”代码片段。
  - 导出时，系统会自动将该部分内容无缝追加到每篇笔记的末尾。
- **默认导出路径预设**：将导出路径（Export Path）默认设定为 `C:\md2blogN\content\posts`，省去每次手动输入的繁琐（仍支持手动修改）。
- **纯净版文件名**：移除了原版导出时强制追加在文件名后缀的笔记 ID（如 `-82d6b...`），现在导出的文件仅由干净的笔记标题组成（例如 `我的笔记.md`）。

### 🐛 错误修复与稳定性提升 (Bug Fixes & Stability)

- **修复原版“假导出”致命 Bug (Critical)**：
  - **问题描述**：原版插件存在严重的分页缺陷，默认只会获取数据库前 100 篇笔记。若导出文件夹中的笔记不在前 100 篇之列，系统会报“导出成功”但实际未输出任何文件。
  - **修复方案**：引入了精准的目录查询与 `while` 循环分页拉取机制（Pagination）。无论文件夹中有几百还是几千篇笔记，如今均能 100% 完整抓取并顺利导出。如果目标文件夹确实为空，系统会弹出 `No notes found in this folder!` 警告。
- **修复非法字符导致导出崩溃的问题**：
  - 新增了文件名净化器（Sanitizer）。系统在生成 Markdown 文件前，会自动将笔记标题中的 Windows 非法字符（如 `/`, `\`, `:`, `?`, `"`, `<`, `>`, `|`, `*`）替换为中划线 `-`，彻底杜绝了因包含特殊字符而导致的本地文件写入崩溃问题。
- **完善的错误拦截提示**：
  - 为整个后台导出流程加入了完整的 `try...catch` 错误捕获处理。一旦出现因权限不足或磁盘满等情况导致写入失败，系统将弹出详细的错误视窗，而不再是“静默失败”。

### 🗑️ 移除的冗余功能 (Removals)

- 移除了对外部静态资源（如本地图片、PDF附件）的复制搬运和链接路径重写逻辑，进一步加快了纯文本 Markdown 博客的生成速度。
- 移除了 SSG 选项单选框（Hugo / Gatsby / Jekyll / Custom）。
- 移除了冗余的资源子目录（Resource Sub-path）等输入项，使界面保持极简。
