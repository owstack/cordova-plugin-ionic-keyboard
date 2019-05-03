/*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
 */

var argscheck = require('cordova/argscheck'),
    utils = require('cordova/utils'),
    exec = require('cordova/exec');

var Keyboard = function () {};

Keyboard.fireOnShow = function (height) {
    Keyboard.isVisible = true;
    cordova.fireWindowEvent('keyboardDidShow', {
        'keyboardHeight': height
    });

    // To support the keyboardAttach directive listening events
    // inside Ionic's main bundle
    cordova.fireWindowEvent('native.keyboardshow', {
        'keyboardHeight': height
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

Keyboard.fireOnShowing = function (height) {
    cordova.fireWindowEvent('keyboardWillShow', {
        'keyboardHeight': height
    });
};

Keyboard.fireOnResize = function (height, screenHeight, ele) {
    if (!ele) {
        return;
    }
    if ('body|ion-app'.includes(ele.nodeName.toLowerCase())) {
        // Preserves legacy behavior.
        if (height === 0) {
            ele.style.height = null;
        } else {
            ele.style.height = (screenHeight - height) + 'px';
        }
    } else {
        // Using a resizes selector.
        if (height === 0) {
            ele.style.transform = null;
        } else {
            var activeEle;
            if (ele.nodeName.toLowerCase() == 'iframe') {
                activeEle = ele.contentDocument.activeElement;
            } else {
                activeEle = ele.activeElement;
            }
            var position = 0;
            var activeEleRect = activeEle.getBoundingClientRect();
            if (activeEleRect.y - height > 0) {
                // Move up 10% more than the computed minimum position.
                position = (activeEleRect.y - height) + ((screenHeight - height) * 0.1 / pixDensity);
            }
            ele.setAttribute('style', 'transform: translateY(-' + position + 'px)');

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
};

Keyboard.hideFormAccessoryBar = function (hide, success) {
    if (hide !== null && hide !== undefined) {
        exec(success, null, "Keyboard", "hideFormAccessoryBar", [hide]);
    } else {
        exec(success, null, "Keyboard", "hideFormAccessoryBar", []);
    }
};

Keyboard.hide = function () {
    exec(null, null, "Keyboard", "hide", []);
};

Keyboard.show = function () {
    console.warn('Showing keyboard not supported in iOS due to platform limitations.');
    console.warn('Instead, use input.focus(), and ensure that you have the following setting in your config.xml: \n');
    console.warn('    <preference name="KeyboardDisplayRequiresUserAction" value="false"/>\n');
};

Keyboard.disableScroll = function (disable) {
    console.warn("Keyboard.disableScroll() was removed");
};

Keyboard.setResizeMode = function (mode, delay) {
    exec(null, null, "Keyboard", "setResizeMode", [mode, delay]);
}

Keyboard.isVisible = false;

module.exports = Keyboard;
