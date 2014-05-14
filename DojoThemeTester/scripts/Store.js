define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/when",
    "dojo/Deferred",
    "dojo/store/Memory"], function (declare, lang, when, deferred, Memory) {

        return declare([Memory], {
            put: function (row) {
                this.inherited(arguments);
                this.CurrentRow = row.id;
            },
            //gets the data from the variables.  Only gets data that has been changed.
            getChanges: function (id) {
                if (!this.CurrentRow) {
                    return [];
                }
                return when(this.query({ id: this.CurrentRow }), function (row) {
                    if (lang.isArray(row)) {
                        row = row[0];
                    }
                    var data = [];
                    for (var i = 0; i < row.LESSVariables.length; i++) {
                        if (row.LESSVariables[i].Changed != undefined && row.LESSVariables[i].Changed == true) {//only need to send the property and the new value...Cut down on data to be sent.
                            data.push({ "property": row.LESSVariables[i].property, "value": row.LESSVariables[i].value });
                        }

                    }
                    return data;
                });
            }
        });
});