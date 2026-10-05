package io.github.douglassdjudahsd.zhuanyixia;
import android.content.ContentProvider;
import android.content.ContentValues;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
public class FixtureProvider extends ContentProvider {
  private File fixture;
  @Override public boolean onCreate() {
    fixture=new File(getContext().getCacheDir(),"sample.docx");
    try(InputStream input=getContext().getAssets().open("sample.docx");FileOutputStream output=new FileOutputStream(fixture)){input.transferTo(output);for(String name:new String[]{"sample.pdf","scan.pdf"}){try(InputStream src=getContext().getAssets().open(name);FileOutputStream dst=new FileOutputStream(new File(getContext().getCacheDir(),name))){src.transferTo(dst);}}return true;}catch(Exception e){throw new RuntimeException(e);}
  }
  @Override public String getType(Uri uri){return "application/octet-stream";}
  @Override public Cursor query(Uri uri,String[] projection,String selection,String[] args,String order){MatrixCursor cursor=new MatrixCursor(new String[]{OpenableColumns.DISPLAY_NAME,OpenableColumns.SIZE});String name=uri.getLastPathSegment(); boolean pdf=name.equals("sample.pdf")||name.equals("scan.pdf");cursor.addRow(new Object[]{pdf?name:"微信样例.docx",pdf?new File(getContext().getCacheDir(),name).length():fixture.length()});return cursor;}
  @Override public ParcelFileDescriptor openFile(Uri uri,String mode) throws java.io.FileNotFoundException {
    String path=uri.getLastPathSegment(); File file=path.equals("result.pdf")||path.equals("sample.pdf")||path.equals("scan.pdf")?new File(getContext().getCacheDir(),path):fixture;
    return ParcelFileDescriptor.open(file,ParcelFileDescriptor.parseMode(mode));
  }
  @Override public Uri insert(Uri uri,ContentValues v){throw new UnsupportedOperationException();}
  @Override public int delete(Uri uri,String s,String[] a){throw new UnsupportedOperationException();}
  @Override public int update(Uri uri,ContentValues v,String s,String[] a){throw new UnsupportedOperationException();}
}
