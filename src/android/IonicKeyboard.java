package io.ionic.keyboard;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaInterface;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CordovaWebView;
import org.apache.cordova.PluginResult;
import org.apache.cordova.PluginResult.Status;
import org.json.JSONArray;
import org.json.JSONException;

import android.content.Context;
import android.graphics.Rect;
import android.util.DisplayMetrics;
import android.view.View;
import android.view.ViewTreeObserver.OnGlobalLayoutListener;
import android.view.inputmethod.InputMethodManager;

// import additionally required classes for calculating screen height
import android.view.Display;
import android.graphics.Point;
import android.os.Build;

import android.util.Log;

public class IonicKeyboard extends CordovaPlugin {

    private static final String ResizeNone = "none";
    private static final String ResizeNative = "native";
    private static final String ResizeBody = "body";
    private static final String ResizeIonic = "ionic";
    private static final String ResizeSelector = "selector";

    private OnGlobalLayoutListener list;
    private View rootView;
    private int previousHeightDiff = 0;
    private Boolean doesResize;
    private String keyboardResizes;
    private String keyboardResizesSelector;
    private Integer keyboardResizesDelay = -1;
    private Integer paddingBottom = 0;
    private float density;

    public void initialize(CordovaInterface cordova, CordovaWebView webView) {
        super.initialize(cordova, webView);
    }

    public boolean execute(String action, JSONArray args, final CallbackContext callbackContext) throws JSONException {
        if ("setResizeMode".equals(action)) {
            String mode = args.getString(0);
            String delay = args.getString(1);

            keyboardResizesDelay = -1;
            if (delay != null) {
                keyboardResizesDelay = (int)(Float.parseFloat(delay) * 1000);
            }

            cordova.getThreadPool().execute(new Runnable() {
                public void run() {
                    if (mode.contains("ionic")) {
                        keyboardResizes = ResizeIonic;
                    } else if (mode.contains("body")) {
                        keyboardResizes = ResizeBody;
                    } else if (mode.contains("native")) {
                        keyboardResizes = ResizeNative;
                    } else if (mode.contains("selector:")) {
                        keyboardResizes = ResizeSelector;
                        keyboardResizesSelector = mode.substring(9, mode.length());
                    } else {
                        keyboardResizes = ResizeNone;
                    }
                }
            });
            return true;
        }
        if ("hide".equals(action)) {
            cordova.getThreadPool().execute(new Runnable() {
                public void run() {
                    //http://stackoverflow.com/a/7696791/1091751
                    InputMethodManager inputManager = (InputMethodManager) cordova.getActivity().getSystemService(Context.INPUT_METHOD_SERVICE);
                    View v = cordova.getActivity().getCurrentFocus();

                    if (v == null) {
                        callbackContext.error("No current focus");
                    } else {
                        inputManager.hideSoftInputFromWindow(v.getWindowToken(), InputMethodManager.HIDE_NOT_ALWAYS);
                        callbackContext.success(); // Thread-safe.
                    }
                }
            });
            return true;
        }
        if ("show".equals(action)) {
            cordova.getThreadPool().execute(new Runnable() {
                public void run() {
                    ((InputMethodManager) cordova.getActivity().getSystemService(Context.INPUT_METHOD_SERVICE)).toggleSoftInput(0, InputMethodManager.HIDE_IMPLICIT_ONLY);
                    callbackContext.success(); // Thread-safe.
                }
            });
            return true;
        }
        if ("update".equals(action)) {
            cordova.getThreadPool().execute(new Runnable() {
                public void run() {
                    ((InputMethodManager) cordova.getActivity().getSystemService(Context.INPUT_METHOD_SERVICE)).toggleSoftInput(0, InputMethodManager.HIDE_IMPLICIT_ONLY);
                    handleLayout(callbackContext, true); 
                    callbackContext.success(); // Thread-safe.
                }
            });
            return true;
        }
        if ("init".equals(action)) {
            cordova.getThreadPool().execute(new Runnable() {
                public void run() {
                    //calculate density-independent pixels (dp)
                    //http://developer.android.com/guide/practices/screens_support.html
                    DisplayMetrics dm = new DisplayMetrics();
                    cordova.getActivity().getWindowManager().getDefaultDisplay().getMetrics(dm);
                    density = dm.density;

                    //http://stackoverflow.com/a/4737265/1091751 detect if keyboard is showing
                    rootView = cordova.getActivity().getWindow().getDecorView().findViewById(android.R.id.content).getRootView();
                    list = new OnGlobalLayoutListener() {
                        @Override
                        public void onGlobalLayout() {
                            handleLayout(callbackContext, false);
                        }
                    };

                    rootView.getViewTreeObserver().addOnGlobalLayoutListener(list);

                    keyboardResizes = ResizeNative;
                    doesResize = Boolean.parseBoolean(cordova.getActivity().getIntent().getStringExtra("KeyboardResizeMode"));
                    if (!doesResize) {
                        keyboardResizes = ResizeNone;
                        Log.i("CDVIonicKeyboard", "resize mode " + keyboardResizes);

                    } else {
                        String resizeMode = cordova.getActivity().getIntent().getStringExtra("KeyboardResizeMode");

                        if (resizeMode.contains("ionic")) {
                            keyboardResizes = ResizeIonic;
                        } else if (resizeMode.contains("body")) {
                            keyboardResizes = ResizeBody;
                        } else if (resizeMode.contains("selector:")) {
                            keyboardResizes = ResizeSelector;
                            keyboardResizesSelector = resizeMode.substring(9, resizeMode.length());
                        }

                        Log.i("CDVIonicKeyboard", "resize mode " + keyboardResizes);
                    }

                    PluginResult dataResult = new PluginResult(PluginResult.Status.OK);
                    dataResult.setKeepCallback(true);
                    callbackContext.sendPluginResult(dataResult);
                }
            });
            return true;
        }
        return false;  // Returning false results in a "MethodNotFound" error.
    }

    private void handleLayout(final CallbackContext callbackContext, boolean forceUpdate) {
        Rect r = new Rect();
        //r will be populated with the coordinates of your view that area still visible.
        rootView.getWindowVisibleDisplayFrame(r);

        PluginResult result;

        // cache properties for later use
        int rootViewHeight = rootView.getRootView().getHeight();
        int resultBottom = r.bottom;

        // calculate screen height differently for android versions >= 21: Lollipop 5.x, Marshmallow 6.x
        //http://stackoverflow.com/a/29257533/3642890 beware of nexus 5
        int screenHeight;

        if (Build.VERSION.SDK_INT >= 21) {
            Display display = cordova.getActivity().getWindowManager().getDefaultDisplay();
            Point size = new Point();
            display.getSize(size);
            screenHeight = size.y;
        } else {
            screenHeight = rootViewHeight;
        }

        int heightDiff = screenHeight - resultBottom;
        int pixelHeightDiff = (int)(heightDiff / density);

        String op = "";
        if (pixelHeightDiff > 100 && pixelHeightDiff != previousHeightDiff) { // if more than 100 pixels, its probably a keyboard...
            op = "S";
        } else if ( pixelHeightDiff != previousHeightDiff && ( previousHeightDiff - pixelHeightDiff ) > 100 ) {
            op = "H";
            heightDiff = 0;
            keyboardResizesDelay = 10;
        } else if (forceUpdate) {
            op = "R";
        }

        if (op != "") {
            setKeyboardHeight(op, heightDiff, screenHeight, keyboardResizesDelay, callbackContext);
        }

        previousHeightDiff = pixelHeightDiff;
    }

    private void setKeyboardHeight(String op, int height, int screenHeight, int delay, final CallbackContext callbackContext) {
        if (keyboardResizes == ResizeNone) {
            return;
        }

        paddingBottom = height;
        updateFrame(op, screenHeight, delay, callbackContext);
    }

    private void updateFrame(String op, int screenHeight, int delay, final CallbackContext callbackContext) {
        // status bar height
        Rect rectangle = new Rect();
        cordova.getActivity().getWindow().getDecorView().getWindowVisibleDisplayFrame(rectangle);
        int statusBarHeight = rectangle.top;

        int _paddingBottom = paddingBottom;
            
        if (statusBarHeight >= 38 && op != "H") {
            _paddingBottom = paddingBottom + 20;
        }
        Log.i("CDVIonicKeyboard", "updating frame (" + op + ")");

        String msg = op;
        switch (keyboardResizes) {
            case ResizeBody: {
                msg = msg +
                    "/" + Float.toString(density) +
                    "/" + Integer.toString(_paddingBottom) +
                    "/" + Integer.toString(screenHeight) +
                    "/" + Integer.toString(delay) +
                    "/" + "document.body";
                break;
            }
            case ResizeIonic: {
                msg = msg +
                    "/" + Float.toString(density) +
                    "/" + Integer.toString(_paddingBottom) +
                    "/" + Integer.toString(screenHeight) +
                    "/" + Integer.toString(delay) +
                    "/" + "document.querySelector('ion-app')";
                break;
            }
            case ResizeNative: {
                // TODO
                break;
            }
            case ResizeSelector: {
                msg = msg +
                    "/" + Float.toString(density) +
                    "/" + Integer.toString(_paddingBottom) +
                    "/" + Integer.toString(screenHeight) +
                    "/" + Integer.toString(delay) +
                    "/" + "document.querySelector('" + keyboardResizesSelector + "');";
                break;
            }
            default:
                msg = "INVALID";
                break;
        }
        if (msg != "INVALID") {
            PluginResult result = new PluginResult(PluginResult.Status.OK, msg);
            result.setKeepCallback(true);
            callbackContext.sendPluginResult(result);
        }
    }

    @Override
    public void onDestroy() {
        rootView.getViewTreeObserver().removeOnGlobalLayoutListener(list);
    }

}
