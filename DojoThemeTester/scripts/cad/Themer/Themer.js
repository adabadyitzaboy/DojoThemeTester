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
    "dojo/Deferred",
    "dijit/_WidgetBase",
	"dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "./_PropertyModifier",
    "./_StyleSheetModifier",
    "dojo/store/Memory",
    "dojo/text!../templates/Themer.html",
    "dijit/form/Button",
    "dijit/layout/BorderContainer",
    "dijit/layout/TabContainer",
    "dijit/form/CheckBox",
    "dijit/form/Select",
    "dijit/Dialog",
    "dojox/widget/ColorPicker"], function (declare, lang, when, deferred, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, _PropertyModifier, _StyleSheetModifier, Memory, template, Button) {
        return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, _PropertyModifier, _StyleSheetModifier], {
            templateString: template,
            constructor: function () {
            },
            startup: function () {
                this.themeChangerDDLB.on("change", function (value) {
                    this.changeThemes(value);
                }.bind(this));
                this.updateColor.on("click", function (event) {
                    this.updateColor_click(true);
                }.bind(this));
                this.canexColor.on("click", function (event) {
                    this.updateColor_click(false);
                }.bind(this));
                if (this.store) {
                    this.getThemes();
                }
            },
            _setStoreAttr: function (store) {
                this.store = store;
                this.getThemes();
            },
            destroy: function () {
                this.inherited(arguments);
                delete this.store;
            },
            loadFinished: null,
            ChangeNumber: null,
            ignoreLoad: null,


            //Gets all the themes from the server
            getThemes: function () {
                return when(this.store.query({}), function (data) {
                    this.loadFinished = true;
                    this.setThemeDDLBData(data);
                    var selectedValue = this.themeChangerDDLB.get('value');

                    if (selectedValue) {
                        document.body.className = data[0].ClassName;//set the classname from the text
                        return when(this.getVariables(selectedValue), //Can use this to start using a particular theme or just the first one in the dropdown.  The String in the third argument is used to set up the attributes after loading the theme
                            function () {
                                this.setupAttributes("global");
                                setTimeout(function () {
                                    this.emit("ready", { isReady: true });
                                }.bind(this), 0);
                            }.bind(this));
                    }
                }.bind(this));
            },

            setThemeDDLBData: function (data) {
                if (!this.themeChangerDDLB.store) {
                    var store = new Memory();
                    store.setData(data);
                    this.themeChangerDDLB.setStore(store);
                } else {
                    this.themeChangerDDLB.store.setData(data);
                }
            },
            
            //sets up attributes as far as which attributes can be seen by each tab or from global
            setupAttributes: function (elements) {
                this.clearAttributes();
                return when(this.store.query({id: this.CurrentTheme}), function(row){
                    if (lang.isArray(row)) {
                        row = row[0];
                    }
                    for (var i = 0; i < row.LESSVariables.length; i++) {
                        if (this.showAttribute(elements, row.LESSVariables[i])) {//Show the variable at the bottom of the page
                            when(this.createAttribute(row.LESSVariables[i]), function (attr) {
                                this.appendAttribute(attr);
                            }.bind(this));                        
                        }
                    }
                }.bind(this));
            },
            appendAttribute: function (attribute) {
                this.tableAttributes.appendChild(attribute);
            },
            createAttribute: function (LESSVariable) {
                var self = this;
                var property = LESSVariable.property;
                return when(this.getOrSetVariable(property, null, false), function(value){
                    var tr = document.createElement("tr");//formats this row of the table.
                    var td = document.createElement("td");
                    var span = document.createElement("span");
                    span.innerHTML = property.replace(/@/g, '');
                    td.appendChild(span);
                    tr.appendChild(td);
                    td = document.createElement("td");
                    var element;
                    if (property.indexOf('color') == -1) {//determines if the current value should use the color picker or not.  Can modify the LESSVariables to have another attribute to determine when to use the color picker.
                        element = document.createElement("input");
                        element.setAttribute('type', 'text');
                        element.id = 'input' + property;
                        element.value = value;
                    } else {//This is for colors
                        element = document.createElement("span");
                        element.id = 'span' + property;
                        element.innerHTML = value;
                    }
                    td.appendChild(element);//put the elements into the page 
                    tr.appendChild(td);
                    td = document.createElement("td");

                    var button;//sets up the button as to open the color box or simply update based off the info in the textbox.
                    if (property.indexOf('color') != -1) {//determines if the current value should use the color picker or not.  Can modify the LESSVariables to have another attribute to determine when to use the color picker.
                        button = new Button({
                            label: "Set Color",
                            onClick: function () {
                                var div = self.divColorPicker;//grabs the color picker and sets up the layout on the page.
                                self.editID = property;
                                self.divColorPicker.show();
                                self.currentColor.innerHTML = property;
                            }
                        });
                        td.appendChild(button.domNode);
                    } else {//simply updates the textbox's value.  No validation performed!
                        button = new Button({
                            label: "Update",
                            onClick: function () {                            
                                var value = element.value;
                                self.getOrSetVariable(property, value, true);//updates the value
                                //one option for validation is to use a regular expression to ensure no illegal chars are used
                                //this can be set up by the server so that an extra atribute is passed, letting the regex be sent to this method for testing
                            }
                        });
                        td.appendChild(button.domNode);
                    }
                    tr.appendChild(td);
                    return tr;
                }.bind(this));
            },
            showAttribute: function (elements, row) {
                return row['type'] == "BasicVariable" && (elements == 'global' || this.propertyInElements(elements, row.property));
            },

            clearAttributes: function () {
                var table = this.tableAttributes;
                while (table.children.length > 0)//remove all of the current rows of the attributes at the bottom of the screen.
                    table.removeChild(table.children[0]);
            },
            //Occurs whenever a tab is clicked
            tab_click: function () {
                var elements = this.selectedChildWidget.domNode.getAttribute('vars');
                if (elements != null && elements != 'global' && elements != '') {//this gets all of the variables that are assigned to this tab component
                    elements = elements.split(',');
                    for (var i = 1; i < elements.length; i++) {
                        if (elements[i].length > 0)
                            elements[i] = elements[i].substr(1);
                    }
                }
                this.setupAttributes(elements);//sets up the attributes at the bottom of the page
            },

            //used whenever the update color button is pressed
            updateColor_click: function (Confirm) {
                var div = this.divColorPicker;
                if (this.editID != null)//editID is the variable that we are intending to update.
                {
                    if (Confirm) {//Confirmation result.
                        div.style.display = "none";//hide the colorpicker
                        var self = this;
                        setTimeout(function () {
                            self.finalizeChange();                            
                        }, 10);//needed so that the screens can be updated based on previous lines before doing the changes.
                    }
                    else
                        div.hide();
                } else
                    alert("Must choose a color to edit first.");
            },

            //Simple method to determind if client is IE
            isIE: function () {
                return navigator.appName == 'Microsoft Internet Explorer';
            },

            //Called by updateColor_click.  Needed in order to make IE update the display changes 
            finalizeChange: function () {
                this.divColorPicker.hide();
                this.getOrSetVariable(this.editID, this.MyColorPicker.value, true);//sets this variable and trickle down if necessary.
                delete this.editID;
            },

            //used whenever the selection is changed.
            changeThemes: function (value) {
                if (this._previousValue == value) {
                    return null;
                }
                this.emit("ready", { isReady: false });
                this._previousValue = value;
                var self = this;
                if (this.store) {
                    return when(this.store.query({ id: value }), function (row) {
                        if (lang.isArray(row)) {
                            row = row[0];
                        }
                        if (row) {
                            document.body.className = row.ClassName;//set the classname from the text
                            return when(this.getVariables(value), function () {
                                this.setupAttributes("global");//get the variables for this theme
                                this.emit("ready", { isReady: true });
                            }.bind(this));
                        } else {
                            console.warn("No row found");
                        }
                    }.bind(this));
                } else {
                    console.log("No store available");
                }
            },
                        
            //Gets the Json file for the theme and the css for the theme
            getVariables: function (id) {
                var self = this;
                var def = new deferred();
                if (!this.loadFinished || this.ignoreLoad) {
                    return null;//necessary because we sometimes don't want the rest of this method to be performed.
                }
                this.CurrentTheme = id;
                return when(this.store.query({ id: id }), function (row) {
                    if (lang.isArray(row)) {
                        row = row[0];
                    }
                    if (row) {
                        this.removeCurrentStyles();
                        var css = this.createStyleSheet(row.StyleSheet);
                        document.getElementsByTagName("head")[0].appendChild(css);
                        var loaded = false;
                        var finished = function () {
                            when(this.doneLoading(), function () {
                                def.resolve();
                            });
                        }.bind(this);
                        css.onload = function () {//simple fix to ensure that the styles are loaded b4 the next method
                            if (!loaded) {
                                loaded = true;
                                //The following is necessary due to caching issues.  
                                var first = this.searchForImportedStyles(document.styleSheets, new Date().getTime());
                                if (first != undefined)//hides the current display and goes back to main display when done loading the styles if styles were found by searchForImportedStyles
                                    first.onload = function () { finished(); }.bind(this);
                                else
                                    finished();
                            }
                        }.bind(this);
                        setTimeout(function () {//This method is needed because not all browsers will support the previous onload function
                            if (!loaded) {
                                loaded = true;
                                //The following is necessary due to caching issues.  
                                var first = this.searchForImportedStyles(document.styleSheets, new Date().getTime());
                                var innerLoad = false;
                                if (first != undefined)//hides the current display and goes back to main display when done loading the styles if styles were found by searchForImportedStyles
                                    first.onload = function () {
                                        if (!innerLoad) {
                                            innerLoad = true;
                                            finished();
                                        }
                                    }.bind(this);
                                else
                                    finished();

                                setTimeout(function () {//This method is needed because not all browsers will support the previous onload function
                                    if (!innerLoad) {
                                        innerLoad = true;
                                        finished();
                                    }
                                }.bind(this), 200);
                            }
                        }.bind(this), 200);
                        return def;
                    } else {
                        console.log("Row not found");
                    }
                }.bind(this));


            },

            //hides the current display and goes back to main display
            doneLoading: function () {
                /* noop */
            }            
        });
    });