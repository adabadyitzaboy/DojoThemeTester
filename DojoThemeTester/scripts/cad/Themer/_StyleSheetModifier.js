/*
The MIT License (MIT)

Copyright (c) 2014 Bryan Euton

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/when",
    "dojo/Deferred"
], function (declare, lang, when, deferred) {
    return declare([], {

        //Gets or Sets the values of a style
        getOrSetClassStyle: function (className, property, value, Set) {
            if (className == null || className == '')
                return null;

            var lowerClassName = className.toLowerCase();
            var FoundClass = this.recursiveSearchForClassForMultipleStyles(document.styleSheets, lowerClassName);
            if (FoundClass != null)//Found the right class
            {
                var result = this.getOrSetClassStyle_ClassFound(Set, FoundClass, property, value);
                if (!Set)
                    return result;
            }
        },
        //originally this was recursive due to a style having imports in the class. We need to search through those rules too.
        recursiveSearchForClassForMultipleStyles: function (styles, lowerClassName) {
            for (var i = 0; i < styles.length; i++) {
                var result = this.recursiveSearchForClassForStyle(styles[i], lowerClassName);
                if (result != null)
                    return result;
            }
            return null;
        },

        //determine if this rule is an @import or a normal rule
        recursiveSearchForClassForStyle: function (style, lowerClassName) {
            var cssClass = style.cssRules;
            if (cssClass == undefined) {
                if (style.rules && style.imports && style.rules.length < style.imports.length) {//Special due to internet explorer needed special attention....
                    return this.recursiveSearchForClassForMultipleStyles(style.imports, lowerClassName);
                }
                else
                    cssClass = style.rules;
            }
            if (cssClass) {
                for (var j = 0; j < cssClass.length; j++) {
                    if (cssClass[j].selectorText != undefined && (cssClass[j].selectorText.toLowerCase() == lowerClassName || (this.isIE() && this.isIn(cssClass[j].selectorText.toLowerCase(), lowerClassName)))) {//found the class needed
                        return cssClass[j];
                    } else if (cssClass[j].styleSheet != undefined) {//is a stylesheet
                        var result;
                        if (cssClass[j].styleSheet.length != undefined)//Determines if the sheet is a set of sheets or a single sheet.
                            result = recursiveSearchForClassForMultipleStyles(cssClass[j].styleSheet, lowerClassName);
                        else
                            result = this.recursiveSearchForClassForStyle(cssClass[j].styleSheet, lowerClassName);
                        if (result != null)
                            return result;
                    }
                }
            }
            return result;
        },

        //finally found the rule and now setting it.
        getOrSetClassStyle_ClassFound: function (Set, cssClass, property, value) {
            if (Set) {//set the property
                if (this.isIE()) {
                    cssClass.style.setAttribute(this.fixPropertyforIE(property), this.fixValueForIE(value), null);
                }
                else
                    cssClass.style.setProperty(property, value, null);
            }
            else//get it
                return cssClass.style[property];
        },

        removeCurrentStyles: function () {
            var styles = document.styleSheets;
            for (var i = 0; i < styles.length; i++) {//run through all of the stylesheets.
                if (styles[i].href != null) {//ensure to keep the in code styles.
                    if (this.isIE())
                        styles[i].owningElement.parentNode.removeChild(styles[i].owningElement);
                    else
                        styles[i].ownerNode.parentNode.removeChild(styles[i].ownerNode);
                    i--;
                }
            }
        },
        //removes all imports and adds all of them as regular unimported style links.
        //This is important for refreshing purposes.  Adds a datetime to the end of the url so that the css file is 
        //reloaded whenever this class is called.  Otherwise the old css might be used.
        searchForImportedStyles: function (styles, time) {
            var self = this;
            if (!self.loadFinished)
                return;//not done...dont bother with rest of this function.
            var replacements = [];
            var i, j, k, cssRules;
            for (i = 0; i < styles.length; i++) {

                if (styles[i].href != null) {//if the href is null, then it is a style on this page.  No changes necessary for those.
                    var replaced = false;
                    var styleHref = styles[i].href.split("/");
                    var href = [];//array used to hold the folder names for this reference.
                    for (j = 0; j < styleHref.length; j++) {
                        if (styleHref[j] == "scripts") {
                            for (k = j; k < styleHref.length - 1; k++) {
                                href[k - j] = styleHref[k];
                            }
                            break;
                        }
                    }

                    if (!self.isIE()) {
                        cssRules = styles[i].cssRules;

                        for (j = 0; j < cssRules.length; j++) {
                            if (cssRules[j].cssText.indexOf("@import") != -1) {
                                replaced = true;//need to replace this for caching issues.
                                replacements[replacements.length] = self.createStyleSheet(cssRules[j].href, href);//add the style to the array of styles.
                            }
                        }
                    } else if (self.isIE() && styles[i].cssText.indexOf("@import") != -1) {
                        replaced = true;
                        var bits = styles[i].cssText.split(';');
                        for (j = 0; j < bits.length; j++) {//ie stores the @import in a string.. Need to get all the imports from it.
                            if (bits[j].indexOf("@import") != -1) {
                                var index1 = bits[j].indexOf('(');
                                var index2 = bits[j].indexOf(')');
                                var url = bits[j].substr(index1 + 2, index2 - index1 - 2);
                                replacements[replacements.length] = self.createStyleSheet(url, href);
                            }
                        }
                    }
                    if (replaced) {//Removes the style if the stylesheet has been replaced due to imports on the stylesheet.
                        if (self.isIE())
                            styles[i].owningElement.parentNode.removeChild(styles[i].owningElement);
                        else
                            styles[i].ownerNode.parentNode.removeChild(styles[i].ownerNode);
                        i--;
                    }
                }
            }
            //Now add them all back in
            var head = document.getElementsByTagName("head")[0];
            for (i = 0; i < replacements.length; i++) {
                head.appendChild(replacements[i]);
            }
            if (replacements.length > 0)
                return replacements[0];
        },

        //Simply returns an object that is a stylesheet link.
        createStyleSheet: function (href, hrefArray) {
            var css = document.createElement("link");
            css.setAttribute("rel", "stylesheet");
            css.setAttribute("type", "text/css");
            if (!hrefArray) {
                css.setAttribute("href", href + '?' + new Date().getTime());
            } else {
                var folderCounter = 0;
                while (href.indexOf('../') != -1)//used to count the number of upfolders ('../') are used.
                {
                    folderCounter++;
                    href = href.replace('../', '');
                }
                var base = ''
                for (var i = 0; i < hrefArray.length - folderCounter; i++)//finds the same path as the import had.
                {
                    base += hrefArray[i] + '/';
                }

                css.setAttribute("href", base + href.split('?')[0] + '?' + new Date().getTime());
            }
            return css;
        },
        //Internet Explorer method to determine if this LESSClass Object contains a classname
        isIn: function (className, className2) {
            if (className2.indexOf(className) == -1)
                return false;
            var array = className2.split(',');
            for (var i = 0; i < array.length; i++) {
                if (array[i] == className)
                    return true;
            }
            return false;
        },
        //Internet Explorer fix for attributes.  IE uses backgroundColor instead of background-color
        fixPropertyforIE: function (property) {
            var array = property.split('-');
            var rtn = array[0];
            for (var i = 1; i < array.length; i++) {
                rtn += array[i].charAt(0).toUpperCase();
                rtn += array[i].substr(1, array[1].length - 1);
            }
            return rtn;
        },

        //Internet Explorer fix for values.  IE cant use !important
        fixValueForIE: function (value) {
            var array = value.split(' ');
            var rtn = '';
            for (var i = 0; i < array.length; i++) {
                if (array[i].indexOf('!important') == -1 && array[i] != '')
                    rtn += ' ' + array[i];

            }
            if (rtn.length > 0)
                rtn = rtn.substr(1, rtn.length - 1);
            return rtn;
        }
    });
});