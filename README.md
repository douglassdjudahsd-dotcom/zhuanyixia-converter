# 转一下 · 开源文件转换

[在线使用手机版](https://douglassdjudahsd-dotcom.github.io/zhuanyixia-converter/) · [下载成品包](https://github.com/douglassdjudahsd-dotcom/zhuanyixia-converter/releases/latest)
支持安卓、iPhone 和电脑的浏览器本地转换工具。MIT 开源，文件在设备内处理，不上传转换服务器，无转换 API 密钥或收费服务。

## 普通用户
安卓可以在 [Releases](https://github.com/douglassdjudahsd-dotcom/zhuanyixia-converter/releases/latest) 下载 `zhuanyixia-v1.1.0-android.apk` 直接安装，支持 Android 8.0 及以上。应用内置程序和中英文 OCR 模型，可离线转换；请保持 Android System WebView 为较新版本。iPhone 使用下面的通用手机版。

**微信文件：**在聊天中打开文件，点右上角菜单，选择“用其他应用打开”或“分享”，再选“转一下”。入口名称和可用性随微信版本变化；也可先保存到手机，再在应用里选择文件。应用自动识别收到文件的扩展名/MIME 并选择合适工具，不读取微信聊天数据库。一次同类文件最多 5 个，不同类型请分批处理。转换完成后点“保存文件”选择系统文件夹。

手机打开公开手机版，选择工具和文件，转换后下载或通过系统分享菜单保存。iPhone 用 Safari 的“分享 → 添加到主屏幕”；安卓用 Chrome 菜单“安装应用 / 添加到主屏幕”。

在 GitHub 的 **Releases** 下载 `zhuanyixia-v1.1.0-web.zip`，这是包含 OCR 模型、程序和第三方许可证的成品包。解压后：
- Windows：安装 [Node.js 20.19+](https://nodejs.org/)，双击 `start-windows.cmd`。
- macOS / Linux：安装 Node.js，运行 `node server.mjs`，打开 `http://127.0.0.1:8787/`。
- 自己部署：把包中的 `dist/` 放到 HTTPS 静态网站服务器。支持放在子目录，如 GitHub Pages。
请通过上述网址启动，直接双击 HTML 文件无法运行浏览器转换引擎。手机使用公开网址安装到主屏幕；网页版是 PWA；安卓另有 APK，iPhone 当前使用 PWA。

## 支持的转换
| 输入 | 输出 |
| --- | --- |
| PDF | 可编辑 DOCX、页面图片 DOCX、TXT、逐页 PNG/JPG ZIP |
| CAJ / KDH 内嵌 PDF | DOCX、PDF、TXT |
| HN / C8 文字层 | DOCX、TXT、文字重排 PDF |
| JPG / PNG / WebP | PDF（合并多图）、JPG / PNG / WebP、中英文 OCR 后 DOCX / TXT |
| DOCX | PDF、TXT、经清理的 HTML |
| TXT / Markdown 原文 | DOCX、文字重排 PDF |
| XLSX / XLS / CSV / 对象数组 JSON | XLSX、CSV、JSON |

Word 转 PDF 支持 .docx，保留基本段落、表格、图片并按 A4 重排。复杂分栏、页眉页脚、批注、公式和特殊字体可能改变。生成的 PDF 页面为图片，不包含可搜索文字；旧版 .doc 请先另存为 .docx。

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

`tests/browser.html` 和 `tests/affected.html` 验证实际格式转换；测试文件均为自制样例。浏览器测试覆盖 PDF、CAJ/KDH/HN/C8、OCR、Word、图片与表格；`tests/word-pdf.html` 验证中文表格、图片与多页 Word → PDF。扫描 PDF 样例由 `python scripts/make-fixtures.py` 生成（依赖 PyMuPDF 和 python-docx），浏览器测试使用 `npm run dev`。
发布版本时，GitHub Actions 自动构建 ZIP 和校验文件并附到 Release。公开手机版由 Pages 工作流发布；在仓库 Settings → Pages 把 Source 设为 GitHub Actions。

## 安卓源码与构建
需要 JDK 17 和 Android SDK（平台 34、Build Tools 34.0.0），设置 `ANDROID_HOME`。
```sh
npm ci
npm run build
npm run test:android-files
cd android
./gradlew assembleRelease
# Windows 使用 gradlew.bat
```
这会产生未签名的 `android/app/build/outputs/apk/release/app-release-unsigned.apk`。发行 APK 在本地使用独立发行密钥签名，密钥不进入公开仓库。自行发行时生成自己的密钥，并在仓库根目录设置 `ZHUANYIXIA_KEYSTORE`、`ZHUANYIXIA_KEY_ALIAS`、`ZHUANYIXIA_STORE_PASSWORD`、`ZHUANYIXIA_KEY_PASSWORD` 后执行 `npm run android:sign`；可用 `ANDROID_BUILD_TOOLS` 覆盖默认的 34.0.0。密钥必须备份，后续升级使用同一密钥。

GitHub Actions 构建安卓源代码，并用模拟内容提供器验证 Android VIEW / SEND 接收、DOCX → PDF 和原生保存链路；它不登录微信。调试 APK 仅供开发测试，普通用户请下载 Release 中已签名的 APK。实际微信菜单还需要在用户手机上确认。

## 隐私与许可证
网页版用户文件留在本次页面内存，关闭页面会清除结果。安卓导入文件会在应用私有缓存临时复制，读入页面后删除；取消或结束保存会清理临时输出，下次启动还会清理残留临时文件。只有用户选定的输入和保存位置可访问，无通讯录、聊天记录或全盘存储权限。设备缓存用于程序资源和 OCR 模型，首次使用需要联网。OCR 结果应核对数字和公式。
本项目代码使用 [MIT](LICENSE)；第三方组件和改写代码保留各自许可证与署名，见 [THIRD_PARTY.md](THIRD_PARTY.md) 和 `licenses/`。
