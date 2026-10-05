package io.github.douglassdjudahsd.zhuanyixia;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.Locale;

/** Bounds and names apply to streams, including providers that lie about their size. */
public final class FileRules {
    public static final long INPUT_LIMIT = 30L * 1024 * 1024;
    public static final long OUTPUT_LIMIT = 64L * 1024 * 1024;
    public static String safeName(String value) {
        if (value == null || value.isBlank()) return "文件";
        String name = value.replaceAll("[\\\\/\\p{Cntrl}]", "_");
        if (name.length() > 200) {
            int dot = name.lastIndexOf('.');
            String suffix = dot > 0 && name.length() - dot < 16 ? name.substring(dot) : "";
            name = name.substring(0, 200 - suffix.length()) + suffix;
        }
        return name;
    }
    public static String mime(String name, String supplied) {
        String lower = name.toLowerCase(Locale.ROOT);
        String[][] types = {{".pdf","application/pdf"},{".docx","application/vnd.openxmlformats-officedocument.wordprocessingml.document"},{".jpg","image/jpeg"},{".jpeg","image/jpeg"},{".png","image/png"},{".webp","image/webp"},{".txt","text/plain"},{".md","text/plain"},{".csv","text/csv"},{".json","application/json"},{".xlsx","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"},{".xls","application/vnd.ms-excel"}};
        for (String[] type : types) if (lower.endsWith(type[0])) return type[1];
        return supplied == null || supplied.isBlank() ? "application/octet-stream" : supplied;
    }
    public static long copyBounded(InputStream input, OutputStream output, long limit) throws IOException {
        byte[] buffer = new byte[32768];
        long total = 0;
        for (int read; (read = input.read(buffer)) != -1;) {
            total += read;
            if (total > limit) throw new IOException("文件超过 " + limit / 1024 / 1024 + " MB 限制");
            output.write(buffer, 0, read);
        }
        return total;
    }
    private FileRules() {}
}
