var argscheck = require('cordova/argscheck'),
    utils = require('cordova/utils'),
    exec = require('cordova/exec'),
    channel = require('cordova/channel');

var Keyboard = function () {};

Keyboard.fireOnShow = function (keyboardHeight) {
    Keyboard.isVisible = true;
    cordova.fireWindowEvent('keyboardDidShow', {
        'keyboardHeight': keyboardHeight
    });

    // To support the keyboardAttach directive listening events
    // inside Ionic's main bundle
    cordova.fireWindowEvent('native.keyboardshow', {
        'keyboardHeight': keyboardHeight
    });
};

Keyboard.fireOnHide = function () {
    Keyboard.isVisible = false;
    cordova.fireWindowEvent('keyboardDidHide');

    // To support the keyboardAttach directive listening events
    // inside Ionic's main bundle
    cordova.fireWindowEvent('native.keyboardhide');
};

Keyboard.fireOnHiding = function () {
    cordova.fireWindowEvent('keyboardWillHide');
};

Keyboard.fireOnShowing = function (keyboardHeight) {
    cordova.fireWindowEvent('keyboardWillShow', {
        'keyboardHeight': keyboardHeight
    });
};

Keyboard.fireOnResize = function (density, keyboardHeight, screenHeight, ele) {
    if (!ele) {
        return;
    }

    // Visible height between display top and keyboard, in pixels.
    var visibleHeight = (screenHeight - keyboardHeight) / density;

    if ('body|ion-app'.includes(ele.nodeName.toLowerCase())) {
        // Preserves legacy behavior.
        if (keyboardHeight === 0) {
            ele.style.height = null;
        } else {
            ele.style.height = visibleHeight + 'px';
        }
    } else {
        // Using a resizes selector.
        if (keyboardHeight === 0) {
            ele.style.transform = null;
        } else {
            var activeEle;
            if (ele.nodeName.toLowerCase() == 'iframe') {
                activeEle = ele.contentDocument.activeElement;
            } else {
                activeEle = ele.activeElement;
            }

            var position = 0;
            var activeElePos = getScreenCoordinates(activeEle);

            if (activeEle.nodeName.toLowerCase() == "input" || activeEle.nodeName.toLowerCase() == "textarea") {
                // Move up 10% more than the computed minimum position.
                // Convert from density to pixels (density = screen dots/pixel)
                position = (visibleHeight * 1.1 / 2) - activeElePos.y;
            }
            ele.setAttribute('style', 'transform: translateY(' + position + 'px)');

            if (activeEle.setSelectionRange) {
                // This a hack to force redraw of the active element (typ. an input) and gracefully position the cursor.
                var activeEleColor = window.getComputedStyle(activeEle).color;
                var activeEleTextShadow = activeEle.style.textShadow;
                activeEle.style.color ='transparent';
                activeEle.style.textShadow = '0 0 0 ' + activeEleColor;

                activeEle.style.webkitUserSelect = 'unset';

                setTimeout(function() {
                    activeEle.setSelectionRange(1000,1000); // Position caret at end of text (assumes not more than 1000 char input).
                    activeEle.style.webkitUserSelect = 'text';

                    activeEle.style.color = activeEleColor;
                    activeEle.style.textShadow = activeEleTextShadow;
                }, 200);
            }
        }        
    }

    function getScreenCoordinates(ele) {
        var p = {};
        p.x = ele.offsetLeft;
        p.y = ele.offsetTop;
        while (ele.offsetParent) {
            p.x = p.x + ele.offsetParent.offsetLeft;
            p.y = p.y + ele.offsetParent.offsetTop;
            if (ele == document.getElementsByTagName("body")[0]) {
                break;
            }
            else {
                ele = ele.offsetParent;
            }
        }
        return p;
    };
};

Keyboard.hideFormAccessoryBar = Keyboard.hideKeyboardAccessoryBar = function (hide) {
    exec(null, null, "Keyboard", "hideKeyboardAccessoryBar", [hide]);
};

Keyboard.hide = function () {
    exec(null, null, "Keyboard", "hide", []);
};

Keyboard.show = function () {
    exec(null, null, "Keyboard", "show", []);
};

Keyboard.disableScroll = function (disable) {
    console.warn("Keyboard.disableScroll() was removed");
};

Keyboard.setResizeMode = function (mode, delay) {
    exec(null, null, "Keyboard", "setResizeMode", [mode, delay]);
};

channel.onCordovaReady.subscribe(function () {
    exec(success, error, 'Keyboard', 'init', []);

    function success(msg) {
        var args = msg.split('/');
        var action = args[0];
        var density = parseFloat(args[1]);
        var keyboardHeight = parseInt(args[2]);
        var screenHeight = parseInt(args[3]);
        var delay = parseInt(args[4]);
        var ele = eval(args[5]);

        if (!ele) {
            return;
        }

        if (!ele) {
            return;
        }

        var doc = document;
        if (ele.nodeName.toLowerCase() == 'iframe') {
            doc = ele.contentDocument;
        }

        var allEditNodes = Array.prototype.slice.call(doc.querySelectorAll('input'));
        allEditNodes = allEditNodes.concat(Array.prototype.slice.call(doc.querySelectorAll('textarea')));

        if (action === 'S') {
            // All the editable nodes are given a focus handler to handle view adjustments when moving between fields.
            for (var i = 0; i < allEditNodes.length; i++) {
                allEditNodes[i].onfocus = handleOnFocus;
            };

            Keyboard.fireOnShowing(keyboardHeight);
            Keyboard.fireOnShow(keyboardHeight);

            setTimeout(function() {
                Keyboard.fireOnResize(density, keyboardHeight, screenHeight, ele);
            }, delay);

        } else if (action === 'H') {
            // Focus handlers on editable nodes are removed.
            for (var i = 0; i < allEditNodes.length; i++) {
                allEditNodes[i].onfocus = null;
            };

            Keyboard.fireOnHiding();
            Keyboard.fireOnHide();

            setTimeout(function() {
                Keyboard.fireOnResize(density, 0, screenHeight, ele);
            }, delay);

        } else if (action === 'R') {
            setTimeout(function() {
                Keyboard.fireOnResize(density, keyboardHeight, screenHeight, ele);
            }, delay);
        }
    };

    function error(err) {
        console.log(err);
    };

    function handleOnFocus() {
        exec(success, error, 'Keyboard', 'update', []);
    };    
});

Keyboard.isVisible = false;

module.exports = Keyboard;
