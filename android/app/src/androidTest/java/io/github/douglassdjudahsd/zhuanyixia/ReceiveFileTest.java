package io.github.douglassdjudahsd.zhuanyixia;
import android.content.Intent;
import android.app.Activity;
import android.net.Uri;
import android.test.InstrumentationTestCase;
import android.webkit.WebView;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
public class ReceiveFileTest extends InstrumentationTestCase {
  private MainActivity activity;
  private String js(String code) throws Exception {
    CountDownLatch done=new CountDownLatch(1);AtomicReference<String> value=new AtomicReference<>();
    getInstrumentation().runOnMainSync(()->{android.view.ViewGroup content=activity.findViewById(android.R.id.content);((WebView)content.getChildAt(0)).evaluateJavascript(code,r->{value.set(r);done.countDown();});});
    assertTrue("JavaScript callback",done.await(10,TimeUnit.SECONDS));return value.get();
  }
  public void testWechatViewImportAndConversion() throws Exception { testReceive(Intent.ACTION_VIEW); }
  public void testWechatShareImportAndConversion() throws Exception { testReceive(Intent.ACTION_SEND); }
  private void testReceive(String action) throws Exception {
    Intent intent=new Intent(getInstrumentation().getTargetContext(),MainActivity.class).setAction(action).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_GRANT_READ_URI_PERMISSION);
    Uri uri=Uri.parse("content://io.github.douglassdjudahsd.zhuanyixia.test.files/sample.docx");
    if(Intent.ACTION_VIEW.equals(action))intent.setDataAndType(uri,"application/octet-stream");else intent.setType("application/octet-stream").putExtra(Intent.EXTRA_STREAM,uri);
    activity=(MainActivity)getInstrumentation().startActivitySync(intent);
    long end=System.currentTimeMillis()+90000;
    while(System.currentTimeMillis()<end&&!js("document.querySelector('#queue')?.textContent.includes('微信样例.docx')||false").equals("true"))Thread.sleep(500);
    assertEquals("Shared DOCX must enter queue", "true", js("document.querySelector('#queue').textContent.includes('微信样例.docx')"));
    assertEquals("Auto-select Word PDF", "\"word-pdf\"",js("document.querySelector('#mobile-tool').value"));
    js("document.querySelector('#convert').click();true");
    end=System.currentTimeMillis()+90000;
    while(System.currentTimeMillis()<end&&!js("!!document.querySelector('[data-native-save]')").equals("true"))Thread.sleep(500);
    assertEquals("PDF conversion and native save button", "true", js("!!document.querySelector('[data-native-save]')&&document.querySelector('#results').textContent.includes('微信样例.pdf')"));
    assertEquals("PDF content nonempty", "true",js("document.querySelector('#results').textContent.includes('基本段落')"));
    Uri output=Uri.parse("content://io.github.douglassdjudahsd.zhuanyixia.test.files/result.pdf");
    android.app.Instrumentation.ActivityMonitor save=getInstrumentation().addMonitor(new android.content.IntentFilter(Intent.ACTION_CREATE_DOCUMENT),new android.app.Instrumentation.ActivityResult(Activity.RESULT_OK,new Intent().setData(output)),true);
    js("document.querySelector('[data-native-save]').click();true");
    end=System.currentTimeMillis()+30000;
    while(System.currentTimeMillis()<end&&!js("document.querySelector('#job-status').textContent.includes('文件已保存')").equals("true"))Thread.sleep(500);
    getInstrumentation().removeMonitor(save);
    assertEquals("Native result persisted", "true",js("document.querySelector('#job-status').textContent.includes('文件已保存')"));
    try(java.io.InputStream input=getInstrumentation().getContext().getContentResolver().openInputStream(output)){
      byte[] header=new byte[5];assertEquals(5,input.read(header));assertEquals("%PDF-",new String(header,java.nio.charset.StandardCharsets.US_ASCII));
    }
  }
  @Override protected void tearDown() throws Exception {if(activity!=null)getInstrumentation().runOnMainSync(()->activity.finish());super.tearDown();}
}
