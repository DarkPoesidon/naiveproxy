package com.darkpoesidon.naivebreeze;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.text.InputType;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import androidx.core.content.FileProvider;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;

public class MainActivity extends Activity {
    private static final int DARK = Color.rgb(7, 19, 29);
    private static final int CARD = Color.rgb(13, 42, 54);
    private static final int TEAL = Color.rgb(79, 211, 194);
    private static final int MUTED = Color.rgb(156, 181, 192);
    private EditText linkInput;
    private TextView status;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(DARK);
        getWindow().setNavigationBarColor(DARK);
        setContentView(buildScreen());
    }

    private View buildScreen() {
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setBackgroundColor(DARK);

        LinearLayout root = column(20);
        root.setPadding(dp(22), dp(28), dp(22), dp(28));
        scroll.addView(root, matchWrap());

        root.addView(label("NAIVE BREEZE", 13, TEAL, Typeface.BOLD));
        root.addView(label("Private Android setup", 30, Color.WHITE, Typeface.BOLD));
        root.addView(label("Two guided steps. No configuration files to edit.", 16, MUTED, Typeface.NORMAL));
        root.addView(space(16));

        LinearLayout hero = card();
        hero.addView(label("SECURE MOBILE ROUTE", 12, TEAL, Typeface.BOLD));
        hero.addView(label("Your server link becomes an Android VPN profile.", 22, Color.WHITE, Typeface.BOLD));
        hero.addView(label("Naive Breeze prepares a local profile and opens it in the maintained sing-box Android VPN client.", 15, MUTED, Typeface.NORMAL));
        root.addView(hero, matchWrap());
        root.addView(space(14));

        LinearLayout engine = card();
        engine.addView(label("STEP 1", 12, TEAL, Typeface.BOLD));
        engine.addView(label("Install the VPN engine", 20, Color.WHITE, Typeface.BOLD));
        engine.addView(label("sing-box for Android supplies the Android VPN permission, routing, and maintained Naive engine.", 14, MUTED, Typeface.NORMAL));
        Button install = button("Open official install page", false);
        install.setOnClickListener(view -> openUrl("https://sing-box.sagernet.org/clients/android/"));
        engine.addView(install, matchWrapWithTop(12));
        root.addView(engine, matchWrap());
        root.addView(space(14));

        LinearLayout profile = card();
        profile.addView(label("STEP 2", 12, TEAL, Typeface.BOLD));
        profile.addView(label("Paste your private link", 20, Color.WHITE, Typeface.BOLD));
        profile.addView(label("On your server, run: sudo naive-server client", 14, MUTED, Typeface.NORMAL));
        linkInput = new EditText(this);
        linkInput.setHint("naive+https://username:password@notes.example.com:443");
        linkInput.setHintTextColor(Color.rgb(111, 143, 154));
        linkInput.setTextColor(Color.WHITE);
        linkInput.setTextSize(14);
        linkInput.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
        linkInput.setMinLines(3);
        linkInput.setGravity(android.view.Gravity.TOP);
        linkInput.setPadding(dp(14), dp(14), dp(14), dp(14));
        linkInput.setBackground(roundRect(Color.rgb(7, 27, 38), Color.rgb(41, 117, 125), 14));
        profile.addView(linkInput, matchWrapWithTop(12));
        Button prepare = button("Prepare and open VPN profile", true);
        prepare.setOnClickListener(view -> prepareProfile());
        profile.addView(prepare, matchWrapWithTop(12));
        status = label("Your link remains on this phone.", 13, MUTED, Typeface.NORMAL);
        profile.addView(status, matchWrapWithTop(10));
        root.addView(profile, matchWrap());
        root.addView(space(14));

        LinearLayout note = card();
        note.addView(label("PRIVACY NOTE", 12, TEAL, Typeface.BOLD));
        note.addView(label("The generated profile is shared only with the Android VPN app you choose from the system prompt. Treat your private link like a password.", 14, MUTED, Typeface.NORMAL));
        root.addView(note, matchWrap());
        return scroll;
    }

    private void prepareProfile() {
        try {
            URI uri = parseNaiveLink(linkInput.getText().toString());
            File exportDir = new File(getFilesDir(), "exports");
            if (!exportDir.exists() && !exportDir.mkdirs()) throw new Exception("Could not create the local export folder.");
            File profile = new File(exportDir, "naive-breeze.json");
            try (FileOutputStream output = new FileOutputStream(profile, false)) {
                output.write(buildConfig(uri).toString(2).getBytes(StandardCharsets.UTF_8));
            }
            Uri contentUri = FileProvider.getUriForFile(this, getPackageName() + ".files", profile);
            Intent open = new Intent(Intent.ACTION_VIEW)
                .setDataAndType(contentUri, "application/json")
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            startActivity(open);
            setStatus("Profile ready. Confirm the import in sing-box for Android.", TEAL);
        } catch (ActivityNotFoundException error) {
            setStatus("Install sing-box for Android in Step 1, then try again.", Color.rgb(255, 180, 88));
        } catch (Exception error) {
            setStatus(error.getMessage(), Color.rgb(255, 135, 125));
        }
    }

    private URI parseNaiveLink(String raw) throws Exception {
        String value = raw.trim();
        if (value.startsWith("naive+")) value = value.substring(6);
        URI uri = new URI(value);
        if (!"https".equals(uri.getScheme()) && !"quic".equals(uri.getScheme())) throw new Exception("Paste a naive+https:// or naive+quic:// link.");
        if (uri.getHost() == null || uri.getRawUserInfo() == null) throw new Exception("The link must include your server, username, and password.");
        if (!uri.getRawUserInfo().contains(":")) throw new Exception("The link is missing its password.");
        return uri;
    }

    private JSONObject buildConfig(URI uri) throws Exception {
        String[] login = uri.getRawUserInfo().split(":", 2);
        String user = URLDecoder.decode(login[0], "UTF-8");
        String pass = URLDecoder.decode(login[1], "UTF-8");
        int port = uri.getPort() > 0 ? uri.getPort() : 443;
        JSONObject tls = new JSONObject().put("enabled", true).put("server_name", uri.getHost());
        JSONObject outbound = new JSONObject()
            .put("type", "naive").put("tag", "private-route")
            .put("server", uri.getHost()).put("server_port", port)
            .put("username", user).put("password", pass)
            .put("quic", "quic".equals(uri.getScheme())).put("tls", tls);
        JSONObject tun = new JSONObject()
            .put("type", "tun").put("tag", "tun-in")
            .put("address", new JSONArray().put("172.19.0.1/30").put("fdfe:dcba:9876::1/126"))
            .put("auto_route", true).put("strict_route", true).put("stack", "mixed");
        return new JSONObject()
            .put("log", new JSONObject().put("level", "info"))
            .put("inbounds", new JSONArray().put(tun))
            .put("outbounds", new JSONArray().put(outbound).put(new JSONObject().put("type", "direct").put("tag", "direct")))
            .put("route", new JSONObject().put("final", "private-route").put("auto_detect_interface", true));
    }

    private void openUrl(String url) {
        startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
    }

    private void setStatus(String text, int color) {
        status.setText(text);
        status.setTextColor(color);
    }

    private LinearLayout column(int gap) {
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setShowDividers(LinearLayout.SHOW_DIVIDER_MIDDLE);
        return layout;
    }

    private LinearLayout card() {
        LinearLayout layout = column(0);
        layout.setPadding(dp(18), dp(18), dp(18), dp(18));
        layout.setBackground(roundRect(CARD, Color.rgb(26, 77, 91), 18));
        return layout;
    }

    private TextView label(String text, int size, int color, int style) {
        TextView view = new TextView(this);
        view.setText(text);
        view.setTextColor(color);
        view.setTextSize(size);
        view.setTypeface(Typeface.create("sans", style));
        view.setLineSpacing(0, 1.15f);
        return view;
    }

    private Button button(String text, boolean primary) {
        Button view = new Button(this);
        view.setText(text);
        view.setAllCaps(false);
        view.setTextSize(15);
        view.setTextColor(primary ? Color.rgb(5, 48, 57) : Color.WHITE);
        view.setBackground(roundRect(primary ? TEAL : Color.rgb(18, 64, 76), primary ? TEAL : Color.rgb(46, 126, 134), 14));
        return view;
    }

    private GradientDrawable roundRect(int fill, int stroke, int radius) {
        GradientDrawable shape = new GradientDrawable();
        shape.setColor(fill);
        shape.setCornerRadius(dp(radius));
        shape.setStroke(dp(1), stroke);
        return shape;
    }

    private View space(int size) {
        View view = new View(this);
        view.setLayoutParams(new LinearLayout.LayoutParams(1, dp(size)));
        return view;
    }

    private LinearLayout.LayoutParams matchWrap() {
        return new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
    }

    private LinearLayout.LayoutParams matchWrapWithTop(int top) {
        LinearLayout.LayoutParams params = matchWrap();
        params.topMargin = dp(top);
        return params;
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }
}
