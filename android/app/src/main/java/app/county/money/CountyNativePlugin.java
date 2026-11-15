package app.county.money;

import android.Manifest;
import android.app.Activity;
import android.app.KeyguardManager;
import android.content.Context;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import androidx.activity.result.ActivityResult;

@CapacitorPlugin(name = "CountyNative", permissions = { @Permission(alias = "sms", strings = { Manifest.permission.READ_SMS }) })
public class CountyNativePlugin extends Plugin {
    @PluginMethod public void readSms(PluginCall call) {
        if (getPermissionState("sms") != PermissionState.GRANTED) {
            if (Boolean.FALSE.equals(call.getBoolean("requestPermission", true)))
                call.reject("SMS access is off. Tap Check messages to enable it.", "SMS_PERMISSION_REQUIRED");
            else requestPermissionForAlias("sms", call, "smsPermissionResult");
        } else collectSms(call);
    }
    @PermissionCallback private void smsPermissionResult(PluginCall call) {
        if (getPermissionState("sms") == PermissionState.GRANTED) collectSms(call);
        else call.reject("SMS permission was not granted. Manual tracking still works.");
    }
    private void collectSms(PluginCall call) {
        // Scan only the requested date window; no raw SMS leaves the device.
        getBridge().execute(() -> {
            JSArray messages = new JSArray();
            long since = System.currentTimeMillis() - 90L * 24 * 60 * 60 * 1000;
            Long requestedSince = call.getLong("since");
            if (requestedSince != null) since = Math.max(0, Math.min(requestedSince, System.currentTimeMillis()));
            long until = call.getLong("until", System.currentTimeMillis() + 1);
            try (Cursor cursor = getContext().getContentResolver().query(Uri.parse("content://sms/inbox"), new String[]{"_id", "body", "date", "address"}, "date >= ? AND date < ?", new String[]{Long.toString(since), Long.toString(until)}, "date DESC")) {
                if (cursor != null) while(cursor.moveToNext() && messages.length() < 10000) {
                    JSObject message = new JSObject();
                    String body = cursor.getString(1);
                    long timestamp = cursor.getLong(2);
                    byte[] digest = MessageDigest.getInstance("SHA-256").digest((timestamp + ":" + body).getBytes(StandardCharsets.UTF_8));
                    StringBuilder stableId = new StringBuilder();
                    for(byte b : digest) stableId.append(String.format("%02x", b & 0xff));
                    message.put("id", stableId.toString()); message.put("body", body); message.put("timestamp", timestamp); message.put("sender", cursor.getString(3)); messages.put(message);
                }
                JSObject result = new JSObject();result.put("messages", messages);call.resolve(result);
            } catch (Exception e) { call.reject("Could not read messages. Check County's SMS permission in Android settings.", e); }
        });
    }
    @PluginMethod public void authenticate(PluginCall call) {
        KeyguardManager manager = (KeyguardManager)getContext().getSystemService(Context.KEYGUARD_SERVICE);
        if (manager == null || !manager.isDeviceSecure()) { call.reject("Set a screen lock on your phone before enabling County's app lock."); return; }
        Intent intent = manager.createConfirmDeviceCredentialIntent("Unlock County", "Your money stays yours.");
        if (intent == null) { call.reject("Device authentication is unavailable."); return; }
        startActivityForResult(call, intent, "authenticationResult");
    }
    @ActivityCallback private void authenticationResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() == Activity.RESULT_OK) call.resolve();else call.reject("Unlock cancelled.");
    }
}
