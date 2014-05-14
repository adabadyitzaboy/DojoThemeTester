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
        //determines if the property (Variable from LESSVariables) can be viewed by the current tab..(elements are the "vars" attribute for the tabs)
        propertyInElements: function (elements, property) {
            if (elements == null || elements == "")
                return false;
            for (var i = 0; i < elements.length; i++) {
                if (elements[i] == property)
                    return true;
            }
            return false;
        },
        //getOrSetVariable gets or sets variables from LESSVariables
        getOrSetVariable: function (property, Value, Set) {
            return when(this.store.query({ id: this.CurrentTheme }), function (row) {
                if (lang.isArray(row)) {
                    row = row[0];
                }

                if (Set) {
                    row.ChangeNumber += 1;
                }
                var rtn = this._getOrSetVariable(row.LESSClasses, row.LESSVariables, row.ChangeNumber, property, Value, Set);
                if (Set) {
                    this.store.put(row);
                }
                return rtn;
            }.bind(this));            
        },
        _getOrSetVariable: function (LESSClasses, LESSVariables, ChangeNumber, property, Value, Set) {
            //console.log(property, Value, Set);
            var self = this;
            for (var i = 0; i < LESSVariables.length; i++) {
                if (LESSVariables[i].property == property) {//found the property
                    if (Set) {
                        if (LESSVariables[i]['type'] == "BasicVariable") {
                            if (LESSVariables[i].Changed == undefined) {//used to update 
                                LESSVariables[i].Changed = true;
                                LESSVariables[i].OriginalValue = LESSVariables[i].value;
                            } else if (LESSVariables[i].OriginalValue == LESSVariables[i].value)
                                LESSVariables[i].Changed = false;
                            else//Variable changed to something, back, and to something else again
                                LESSVariables[i].Changed = true;
                            LESSVariables[i].value = Value;
                            LESSVariables[i].UpdatedValue = Value;//sets this for faster recall for chained variables.
                            LESSVariables[i].Version = ChangeNumber;//updates the version of this change so that variables references 
                            //this variable can get the updated value rather than calculating this value.
                            //need to do a trickle effect down
                            var span = dojo.byId('span' + LESSVariables[i].property);
                            if (span != undefined) {//updates the displayed value next to the update button at the bottom of the page....If found
                                span.innerHTML = LESSVariables[i].value;
                            }
                            self._trickleDownProperties(LESSClasses, LESSVariables, ChangeNumber, LESSVariables[i].property, LESSVariables[i].value);//update all of the variables that depend on this variable.
                        }
                    } else {
                        var result;
                        if (LESSVariables[i].UpdatedValue != undefined && LESSVariables[i].Version == self.ChangeNumber)
                            return LESSVariables[i].UpdatedValue;//Faster by not always having to go to the very first variable of the chain.
                        else if (LESSVariables[i].value == undefined) {//this variable is a method rather than just a value.
                            result = self._getValueFromMethod(LESSClasses, LESSVariables, ChangeNumber, LESSVariables[i]);//calculate the value
                        }
                        else if (LESSVariables[i].value.indexOf('@') != -1) {//this value is derived from another variable.
                            result = self._getOrSetVariable(LESSClasses, LESSVariables, ChangeNumber, LESSVariables[i].value, null, false);
                        }
                        else
                            result = LESSVariables[i].value;//simply this value
                        if (result != undefined) {//result was found.  Copy the result into the updated value and set the version for faster loading of variables down the chain.
                            LESSVariables[i].UpdatedValue = result;
                            LESSVariables[i].Version = ChangeNumber;
                            return result;
                        }
                    }
                    break;//don't need to keep going
                }
            }
        },

        //Used to set the values of variables who's values are variables.
        _trickleDownProperties: function (LESSClasses, LESSVariables, ChangeNumber, property, Value) {
            var self = this;
            for (var i = 0; i < LESSVariables.length; i++) {
                if (LESSVariables[i].value == property || (LESSVariables[i].Arguments != undefined && self.isPropertyInMethod(LESSVariables[i], property))) {//Trickle
                    if (LESSVariables[i].UpdatedValue != undefined && LESSVariables[i].Version == self.ChangeNumber) {//try to see if the value is already updated based on revision number
                        self._trickleDownProperties(LESSClasses, LESSVariables, ChangeNumber, LESSVariables[i].property, LESSVariables[i].UpdatedValue);
                    } else if (LESSVariables[i].value == property)
                        self._trickleDownProperties(LESSClasses, LESSVariables, ChangeNumber, LESSVariables[i].property, Value);
                    else {//is found via method.
                        LESSVariables[i].UpdatedValue = self._getValueFromMethod(LESSClasses, LESSVariables, ChangeNumber, LESSVariables[i]);
                        LESSVariables[i].Version = ChangeNumber;
                        self._trickleDownProperties(LESSClasses, LESSVariables, ChangeNumber, LESSVariables[i].property, LESSVariables[i].UpdatedValue);
                    }
                }
            }
            //now all variables should be updated for this point in hiearchy..
            var j, k, update;
            for (i = 0; i < LESSClasses.length; i++) {
                if (LESSClasses[i].Attributes) {
                    for (j = 0; j < LESSClasses[i].Attributes.length; j++) {
                        if ((LESSClasses[i].Attributes[j].value != null && LESSClasses[i].Attributes[j].value.indexOf(property) != -1) || (LESSClasses[i].Attributes[j].valueString != null && LESSClasses[i].Attributes[j].valueString.indexOf(property) != -1)) {//contains a variable
                            var temp;
                            if (LESSClasses[i].Attributes[j].value != null) {//Non method
                                temp = LESSClasses[i].Attributes[j].value;
                                if (temp.indexOf('@{') != -1)//the images have @{ url info }, so we need to lose the brackets.
                                    temp = temp.replace(new RegExp('[{}]', 'g'), '');
                                if (LESSClasses[i].Attributes[j].Variables) {
                                    for (k = 0; k < LESSClasses[i].Attributes[j].Variables.length; k++) {
                                        temp = temp.replace(LESSClasses[i].Attributes[j].Variables[k], self._getOrSetVariable(LESSClasses, LESSVariables, ChangeNumber, LESSClasses[i].Attributes[j].Variables[k], null, false));
                                    }
                                }
                            }
                            else {//method
                                temp = self._getValueFromMethod(LESSClasses, LESSVariables, ChangeNumber, LESSClasses[i].Attributes[j]);
                            }
                            if (temp instanceof Array) {//this is for the methods.  Currently there are no classes that require the value to be found from a method.  This allows for the future ability
                                for (k = 0; k < temp.length; k++)
                                    self.getOrSetClassStyle(LESSClasses[i].className, temp[k].property, temp[k].value, true);
                            }
                            else//non-method 
                                self.getOrSetClassStyle(LESSClasses[i].className, LESSClasses[i].Attributes[j].property, temp, true);
                        }
                    }
                }
            }
        },

        //Recursively looks through method to see if the property is found.
        isPropertyInMethod: function (method, property) {
            if (method.Arguments[1] == property)
                return true;
            if (method.Arguments[0].methodName != undefined)
                return this.isPropertyInMethod(method.Arguments[0], property);
            else if (method.Arguments[0] == property)
                return true;
            return false;
        },

        //Recursively goes through methods, applies the methods and returns the value
        _getValueFromMethod: function (LESSClasses, LESSVariables, ChangeNumber, method) {
            var self = this;
            var name = method.methodName;
            var value;
            switch (name) {
                //if new methods are referred to in the .less file, they will need to be added as cases here
                case ("spin"):
                    {//spin is a hue shift
                        if (method.Arguments[0].methodName != undefined)
                            value = self._getValueFromMethod(LESSClasses, LESSVariables, ChangeNumber, method.Arguments[0]);
                        else
                            value = method.Arguments[0];
                        if (value.indexOf('@') != -1) {
                            value = self._getOrSetVariable(LESSClasses, LESSVariables, ChangeNumber, value, null, false);
                        }
                        value = dojox.color.fromHex(value).toHsl();
                        value.h = value.h + parseInt(method.Arguments[1]);
                        if (value.h > 255)
                            value.h = 255;
                        if (value.h < 0)
                            value.h = 0;
                        value = dojox.color.fromHsl(value);
                        return value.toHex();
                    }
                case ("saturate"):
                    {
                        if (method.Arguments[0].methodName != undefined)
                            value = self._getValueFromMethod(LESSClasses, LESSVariables, ChangeNumber, method.Arguments[0]);
                        else
                            value = method.Arguments[0];
                        if (value.indexOf('@') != -1) {
                            value = self._getOrSetVariable(LESSClasses, LESSVariables, ChangeNumber, value, null, false);
                        }
                        value = dojox.color.fromHex(value).toHsl();
                        value.s = value.s + parseInt(method.Arguments[1]);
                        if (value.s > 255)
                            value.s = 255;
                        value = dojox.color.fromHsl(value);
                        return value.toHex();
                    }
                case ("desaturate"):
                    {
                        if (method.Arguments[0].methodName != undefined)
                            value = self._getValueFromMethod(LESSClasses, LESSVariables, ChangeNumber, method.Arguments[0]);
                        else
                            value = method.Arguments[0];
                        if (value.indexOf('@') != -1) {
                            value = self._getOrSetVariable(LESSClasses, LESSVariables, ChangeNumber, value, null, false);
                        }
                        value = dojox.color.fromHex(value).toHsl();
                        value.s = value.s - parseInt(method.Arguments[1]);
                        if (value.s < 0)
                            value.s = 0;
                        value = dojox.color.fromHsl(value);
                        return value.toHex();
                    }
                case ("lighten"):
                    {
                        if (method.Arguments[0].methodName != undefined)
                            value = self._getValueFromMethod(LESSClasses, LESSVariables, ChangeNumber, method.Arguments[0]);
                        else
                            value = method.Arguments[0];
                        if (value.indexOf('@') != -1) {
                            value = self._getOrSetVariable(LESSClasses, LESSVariables, ChangeNumber, value, null, false);
                        }
                        value = dojox.color.fromHex(value).toHsl();
                        value.l = value.l + parseInt(method.Arguments[1]);
                        if (value.l > 255)
                            value.l = 255;
                        value = dojox.color.fromHsl(value);
                        return value.toHex();
                    }
                case ("darken"):
                    {
                        if (method.Arguments[0].methodName != undefined)
                            value = self._getValueFromMethod(LESSClasses, LESSVariables, ChangeNumber, method.Arguments[0]);
                        else
                            value = method.Arguments[0];
                        if (value.indexOf('@') != -1) {
                            value = self._getOrSetVariable(LESSClasses, LESSVariables, ChangeNumber, value, null, false);
                        }
                        value = dojox.color.fromHex(value).toHsl();
                        value.l = value.l - parseInt(method.Arguments[1]);
                        if (value.l < 0)
                            value.l = 0;
                        value = dojox.color.fromHsl(value);
                        return value.toHex();
                    }
                default: console.warn("Method " + name + " not defined");
            }
        },
    });
});