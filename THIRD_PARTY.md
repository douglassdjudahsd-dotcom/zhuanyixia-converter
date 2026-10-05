# 第三方组件与格式研究

依赖许可随 npm 包保留；发布产物包含 PDF.js 的字体、字符映射和 WebAssembly 许可文件。

- PDF.js / Tesseract.js / tesseract.js-core / tesseract-ocr tessdata_fast：Apache-2.0。
- pdf-lib、docx、Mammoth、SheetJS、Vite、fflate：MIT 或各项目随包许可。
- DOMPurify：Apache-2.0 或 MPL-2.0。
- CAJ/PDF/KDH 格式研究来源：https://github.com/caj2pdf/caj2pdf 。顶层代码以 GLWTPL 发布，许可副本在 `licenses/CAJ2PDF-LICENSE`。
- HN 文字记录的 JavaScript 适配依据 HNParsePage.py。Copyright 2021 Hin-Tak Leung `<htl10@users.sourceforge.net>`，依照 FreeType Project License。保留署名与许可副本 `licenses/FTL.txt`。本项目改写为有界的浏览器字节流解析，保留文字/换行映射，忽略专有压缩图片。
- OCR 模型源：https://github.com/tesseract-ocr/tessdata_fast ，`eng.traineddata` 和 `chi_sim.traineddata`，作为 gzip 静态资源分发。

这些第三方组件及模型由其各自作者持有版权。本应用未调用知网的账号或付费转换服务。
