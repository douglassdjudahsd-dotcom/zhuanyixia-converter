package io.github.douglassdjudahsd.zhuanyixia;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.provider.OpenableColumns;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.ServiceWorkerClient;
import android.webkit.ServiceWorkerController;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends Activity {
    private static final String ORIGIN = "https://appassets.androidplatform.net";
    private static final String HOME = ORIGIN + "/assets/www/index.html";
    private static final int PICK = 100, SAVE = 101;
    private WebView web;
    private volatile boolean trustedPage = false;
    private volatile boolean destroyed = false;
    private ValueCallback<Uri[]> chooser;
    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private final Map<String, File> imports = new ConcurrentHashMap<>();
    private final JSONArray pending = new JSONArray();
    private final JSONArray pendingErrors = new JSONArray();
    private final Bridge bridge = new Bridge();
    private File importDir, exportDir;
    private Export export;
    private static final class Export {
        String id, name, mime;
        long expected, written;
        int index;
        File file;
        FileOutputStream stream;
        boolean ready;
    }

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        importDir = new File(getCacheDir(), "imports");
        exportDir = new File(getCacheDir(), "exports");
        importDir.mkdirs(); exportDir.mkdirs();
        // These directories contain only our transient selected-file copies.
        for (File dir : new File[]{importDir, exportDir}) {
            File[] old = dir.listFiles();
            if (old != null) for (File file : old) if (file.isFile()) file.delete();
        }
        web = new WebView(this);
        setContentView(web);
        web.setBackgroundColor(0xfff7f8fb);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportMultipleWindows(false);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        web.addJavascriptInterface(bridge, "AndroidConverter");
        web.setWebViewClient(new WebViewClient() {
            @Override public void onPageStarted(WebView view, String url, android.graphics.Bitmap icon) {
                trustedPage = HOME.equals(url);
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return localResponse(request.getUrl());
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                // The bridge stays attached only to the bundled app. Never load received HTML.
                return !HOME.equals(request.getUrl().toString());
            }
            @Override public boolean onRenderProcessGone(WebView view, android.webkit.RenderProcessGoneDetail detail) {
                trustedPage = false;
                new AlertDialog.Builder(MainActivity.this).setMessage("手机内存不足，转换页面已关闭。请重新打开应用并减少文件数量。")
                    .setPositiveButton("关闭", (dialog, which) -> finish()).show();
                return true;
            }
        });
        ServiceWorkerController.getInstance().setServiceWorkerClient(new ServiceWorkerClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebResourceRequest request) {
                return localResponse(request.getUrl());
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (chooser != null) chooser.onReceiveValue(null);
                chooser = callback;
                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*");
                intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, params.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE);
                try { startActivityForResult(intent, PICK); }
                catch (Exception error) { chooser.onReceiveValue(null); chooser = null; notifyError("手机没有可用的文件选择器。"); }
                return true;
            }
        });
        web.loadUrl(HOME);
        receive(getIntent());
    }

    private WebResourceResponse localResponse(Uri uri) {
        try {
            if (!"https".equals(uri.getScheme()) || !"appassets.androidplatform.net".equals(uri.getHost())) return denied();
            String path = uri.getPath();
            if (path == null || path.contains("..") || path.contains("\\") || path.indexOf('\0') >= 0) return denied();
            if (path.startsWith("/imports/")) {
                File file = imports.get(path.substring(9));
                return file != null ? new WebResourceResponse("application/octet-stream", null, new FileInputStream(file)) : denied();
            }
            if (!path.startsWith("/assets/www/")) return denied();
            String name = path.substring(8), lower = name.toLowerCase(Locale.ROOT), mime = "application/octet-stream";
            if (lower.endsWith(".html")) mime = "text/html";
            else if (lower.endsWith(".js") || lower.endsWith(".mjs")) mime = "application/javascript";
            else if (lower.endsWith(".css")) mime = "text/css";
            else if (lower.endsWith(".json") || lower.endsWith(".webmanifest")) mime = "application/json";
            else if (lower.endsWith(".wasm")) mime = "application/wasm";
            else if (lower.endsWith(".svg")) mime = "image/svg+xml";
            else if (lower.endsWith(".png")) mime = "image/png";
            WebResourceResponse response = new WebResourceResponse(mime, "UTF-8", getAssets().open(name));
            response.setResponseHeaders(Map.of("Cache-Control", "no-store", "X-Content-Type-Options", "nosniff"));
            return response;
        } catch (Exception error) { return denied(); }
    }
    private static WebResourceResponse denied() {
        return new WebResourceResponse("text/plain", "UTF-8", 404, "Not found", Map.of(), new ByteArrayInputStream(new byte[0]));
    }

    @Override protected void onNewIntent(Intent intent) { super.onNewIntent(intent); setIntent(intent); receive(intent); }
    private void receive(Intent intent) {
        if (intent == null) return;
        LinkedHashSet<Uri> uris = new LinkedHashSet<>();
        String action = intent.getAction();
        if (Intent.ACTION_VIEW.equals(action) && intent.getData() != null) uris.add(intent.getData());
        if (Intent.ACTION_SEND.equals(action)) {
            Uri stream = intent.getParcelableExtra(Intent.EXTRA_STREAM);
            if (stream != null) uris.add(stream);
        }
        if (Intent.ACTION_SEND_MULTIPLE.equals(action)) {
            ArrayList<Uri> streams = intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM);
            if (streams != null) uris.addAll(streams);
        }
        if ((Intent.ACTION_SEND.equals(action) || Intent.ACTION_SEND_MULTIPLE.equals(action)) && intent.getClipData() != null) {
            for (int i = 0; i < intent.getClipData().getItemCount(); i++) {
                Uri uri = intent.getClipData().getItemAt(i).getUri();
                if (uri != null) uris.add(uri);
            }
        }
        if (uris.isEmpty()) return;
        if (uris.size() > 5) notifyError("一次最多接收5个文件，已接收前5个。");
        io.execute(() -> {
            int count = 0;
            for (Uri uri : uris) {
                if (count++ >= 5 || destroyed) break;
                String id = UUID.randomUUID().toString();
                File file = new File(importDir, id);
                try {
                    // Scoped provider grants are required. Never read arbitrary file:// paths.
                    if (!"content".equals(uri.getScheme())) throw new Exception("请通过微信分享或系统文件选择器发送此文件。");
                    if (imports.size() >= 10) throw new Exception("待接收文件过多，请先完成当前转换。");
                    String name = "文件", mime = getContentResolver().getType(uri);
                    try (Cursor cursor = getContentResolver().query(uri, new String[]{OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE}, null, null, null)) {
                        if (cursor != null && cursor.moveToFirst()) {
                            int column = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                            if (column >= 0) name = cursor.getString(column);
                            column = cursor.getColumnIndex(OpenableColumns.SIZE);
                            if (column >= 0 && !cursor.isNull(column) && cursor.getLong(column) > FileRules.INPUT_LIMIT) throw new Exception("文件超过30 MB，请选择较小文件。");
                        }
                    }
                    name = FileRules.safeName(name);
                    long size;
                    try (InputStream input = getContentResolver().openInputStream(uri); OutputStream output = new FileOutputStream(file)) {
                        if (input == null) throw new Exception("无法读取文件。");
                        size = FileRules.copyBounded(input, output, FileRules.INPUT_LIMIT);
                    }
                    imports.put(id, file);
                    JSONObject item = new JSONObject().put("id", id).put("name", name).put("size", size).put("mime", FileRules.mime(name, mime)).put("url", ORIGIN + "/imports/" + id);
                    synchronized (pending) { pending.put(item); }
                } catch (Exception error) { file.delete(); notifyError("接收文件失败：" + error.getMessage()); }
            }
            dispatch("android-files", new JSONObject());
        });
    }

    private void dispatch(String event, JSONObject detail) {
        if (destroyed) return;
        runOnUiThread(() -> {
            if (!destroyed && trustedPage) web.evaluateJavascript("window.dispatchEvent(new CustomEvent(" + JSONObject.quote(event) + ",{detail:" + detail + "}))", null);
        });
    }
    private void notifyError(String message) {
        synchronized (pendingErrors) { pendingErrors.put(message); }
        dispatch("android-files", new JSONObject());
    }

    public final class Bridge {
        @JavascriptInterface public String takeIncomingFiles() {
            if (!trustedPage) return "[]";
            synchronized (pending) { String result = pending.toString(); while (pending.length() > 0) pending.remove(0); return result; }
        }
        @JavascriptInterface public String takeIncomingErrors() {
            if (!trustedPage) return "[]";
            synchronized (pendingErrors) { String result = pendingErrors.toString(); while (pendingErrors.length() > 0) pendingErrors.remove(0); return result; }
        }
        @JavascriptInterface public void releaseImport(String id) {
            File file = imports.remove(id);
            if (file != null) file.delete();
        }
        @JavascriptInterface public synchronized String beginExport(String name, String mime, long size) {
            if (!trustedPage || export != null || size < 0 || size > FileRules.OUTPUT_LIMIT) return "";
            try {
                Export value = new Export();
                value.id = UUID.randomUUID().toString(); value.name = FileRules.safeName(name);
                value.mime = FileRules.mime(value.name, mime); value.expected = size;
                value.file = new File(exportDir, value.id); value.stream = new FileOutputStream(value.file);
                export = value;
                return value.id;
            } catch (Exception error) { return ""; }
        }
        @JavascriptInterface public synchronized boolean appendExport(String id, int index, String encoded) {
            if (!trustedPage || export == null || export.ready || !export.id.equals(id) || export.index != index || encoded == null || encoded.length() > 65536) return false;
            try {
                byte[] data = Base64.decode(encoded, Base64.DEFAULT);
                if (export.written + data.length > export.expected) return false;
                export.stream.write(data); export.written += data.length; export.index++;
                return true;
            } catch (Exception error) { return false; }
        }
        @JavascriptInterface public synchronized boolean finishExport(String id) {
            if (!trustedPage || export == null || !export.id.equals(id) || export.ready || export.written != export.expected) return false;
            try {
                export.stream.close(); export.ready = true;
                Export value = export;
                runOnUiThread(() -> {
                    try { startActivityForResult(new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType(value.mime).putExtra(Intent.EXTRA_TITLE, value.name), SAVE); }
                    catch (Exception error) { completeExport(value, false, "手机没有可用的保存文件入口。"); }
                });
                return true;
            } catch (Exception error) { return false; }
        }
        @JavascriptInterface public synchronized void cancelExport(String id) {
            if (export != null && export.id.equals(id) && !export.ready) cleanupExport(export);
        }
    }
    private void cleanupExport(Export value) {
        synchronized (bridge) {
            try { value.stream.close(); } catch (Exception ignored) {}
            value.file.delete();
            if (export == value) export = null;
        }
    }
    private void completeExport(Export value, boolean ok, String error) {
        cleanupExport(value);
        try { dispatch("android-save", new JSONObject().put("id", value.id).put("ok", ok).put("error", error)); }
        catch (Exception ignored) {}
    }
    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request == PICK && chooser != null) {
            ValueCallback<Uri[]> callback = chooser; chooser = null;
            callback.onReceiveValue(result == RESULT_OK ? WebChromeClient.FileChooserParams.parseResult(result, data) : null);
        }
        if (request == SAVE && export != null) {
            Export value = export;
            if (result != RESULT_OK || data == null || data.getData() == null) { completeExport(value, false, "已取消保存。"); return; }
            Uri uri = data.getData();
            io.execute(() -> {
                try (InputStream input = new FileInputStream(value.file); OutputStream output = getContentResolver().openOutputStream(uri, "wt")) {
                    if (output == null) throw new Exception("无法打开保存位置。");
                    FileRules.copyBounded(input, output, FileRules.OUTPUT_LIMIT);
                    output.flush();
                    completeExport(value, true, "");
                } catch (Exception error) { completeExport(value, false, "保存失败：" + error.getMessage()); }
            });
        }
    }
    @Override public void onBackPressed() {
        new AlertDialog.Builder(this).setMessage("退出会清除本次文件和转换结果，请先保存。")
            .setPositiveButton("退出", (dialog, which) -> finish()).setNegativeButton("继续使用", null).show();
    }
    @Override protected void onDestroy() {
        destroyed = true; trustedPage = false;
        if (chooser != null) { chooser.onReceiveValue(null); chooser = null; }
        io.shutdownNow();
        if (export != null) cleanupExport(export);
        for (File file : imports.values()) file.delete();
        imports.clear();
        web.removeJavascriptInterface("AndroidConverter"); web.destroy();
        super.onDestroy();
    }
}
