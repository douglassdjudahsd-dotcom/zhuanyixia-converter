# 转一下 · 开源文件转换
支持安卓、iPhone 和电脑的浏览器本地转换工具。MIT 开源，文件在设备内处理，不上传转换服务器，无转换 API 密钥或收费服务。

## 普通用户
手机打开公开手机版，选择工具和文件，转换后下载或通过系统分享菜单保存。iPhone 用 Safari 的“分享 → 添加到主屏幕”；安卓用 Chrome 菜单“安装应用 / 添加到主屏幕”。

在 GitHub 的 **Releases** 下载 `zhuanyixia-v1.0.0-web.zip`，这是包含 OCR 模型、程序和第三方许可证的成品包。解压后：
- Windows：安装 [Node.js 20.19+](https://nodejs.org/)，双击 `start-windows.cmd`。
- macOS / Linux：安装 Node.js，运行 `node server.mjs`，打开 `http://127.0.0.1:8787/`。
- 自己部署：把包中的 `dist/` 放到 HTTPS 静态网站服务器。支持放在子目录，如 GitHub Pages。
请通过上述网址启动，直接双击 HTML 文件无法运行浏览器转换引擎。手机使用公开网址安装到主屏幕；这个版本是 PWA，不是 APK / IPA。

## 支持的转换
| 输入 | 输出 |
| --- | --- |
| PDF | 可编辑 DOCX、页面图片 DOCX、TXT、逐页 PNG/JPG ZIP |
| CAJ / KDH 内嵌 PDF | DOCX、PDF、TXT |
| HN / C8 文字层 | DOCX、TXT、文字重排 PDF |
| JPG / PNG / WebP | PDF（合并多图）、JPG / PNG / WebP、中英文 OCR 后 DOCX / TXT |
| DOCX | TXT、经清理的 HTML |
| TXT / Markdown 原文 | DOCX、文字重排 PDF |
| XLSX / XLS / CSV / 对象数组 JSON | XLSX、CSV、JSON |

扫描 PDF 支持中英文 OCR。单文件 30 MB，一次最多 5 个文件，PDF/CAJ 最多 80 页；图片互转保留尺寸，最多 1600 万像素。CSV/JSON 输出第一张工作表。
可编辑 Word 提取文字，不保留原图表；复杂表格、公式和分栏需要调整。页面图片模式保留外观，文字不可直接编辑。HN/C8 以文字层为主，部分专有压缩图片、加密或损坏变体暂不支持，会明确报错或提示。

## 开发与构建
```sh
npm ci
npm test
npm run dev
npm run build
npm run release
```
要求 Node.js 20.19+。构建首次从 Tesseract 官方仓库的固定提交下载中英文模型，并校验 SHA-256；之后使用本地模型。所有运行依赖随成品包提供。

`tests/browser.html` 和 `tests/affected.html` 验证实际格式转换；测试文件均为自制样例。已实测 20 项转换流程，以及 4 项 CAJ 解析检查。扫描 PDF 样例由 `python scripts/make-fixtures.py` 生成（依赖 PyMuPDF 和 python-docx），浏览器测试使用 `npm run dev`。
发布版本时，GitHub Actions 自动构建 ZIP 和校验文件并附到 Release。公开手机版由 Pages 工作流发布；在仓库 Settings → Pages 把 Source 设为 GitHub Actions。

## 隐私与许可证
用户文件仅留在本次页面内存，关闭页面会清除结果。设备缓存用于程序资源和 OCR 模型，首次使用需要联网。OCR 结果应核对数字和公式。
本项目代码使用 [MIT](LICENSE)；第三方组件和改写代码保留各自许可证与署名，见 [THIRD_PARTY.md](THIRD_PARTY.md) 和 `licenses/`。
