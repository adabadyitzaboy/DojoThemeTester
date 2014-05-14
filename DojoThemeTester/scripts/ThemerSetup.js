require(["dojo/ready", "./scripts/Store.js", "dojo/text!./scripts/dijit/themes/cad/cad.json", "dojo/text!./scripts/dijit/themes/claro/claro.json", "dojo/fx/Toggler", "dojo/fx", "dojo/aspect", "dojo/request/xhr", "dojo/when", "cad/Themer/Themer", "dijit/layout/BorderContainer", "dijit/layout/ContentPane"], function (ready, ThemerStore, cad, claro, Toggler, coreFx, aspect, xhr, when) {
    ready(function () {
        var borderContainerToggler = new Toggler({
            node: "main",
            showFunc: coreFx.wipeIn,
            hideFunc: coreFx.wipeOut,
            onEnd: function () {
                themer.prevAni = null;
                setTimeout(function () {
                    dijit.byId('main').resize();
                }, 200);
            }
        });
        var displayLoader = function (show) {
            if (show) {
                document.getElementById('loader').style.display = "block";
            } else {
                document.getElementById('loader').style.display = "none";
            }
        };
        var themer = dijit.byId('cadThemer');
        cad = JSON.parse(cad);
        claro = JSON.parse(claro);
        cad.id = "cad";
        cad.name = "cad";
        claro.id = "claro";
        claro.name = "claro";

        var data = [cad, claro];
        //create custom store.  
        var store = new ThemerStore({ data: data });
        themer.set('store', store);
        var toggleBorderContainer = function (show) {
            displayLoader(!show);
            themer.prevAni = borderContainerToggler[show ? 'show' : 'hide']();
        };
        //allow animation for themer
        themer.on('ready', function (obj) {
            if (themer.prevAni) {
                var handle = aspect.after(themer.prevAni, 'onEnd', function () {
                    handle.remove();
                    setTimeout(function () {
                        toggleBorderContainer(obj.isReady);
                    }, 0);
                });
            } else {
                toggleBorderContainer(obj.isReady);
            }

        });
        //add onclick for File Menu Item 
        dijit.byId('miSaveTheme').on('click', function () {
            /* SaveTheme */
            var data = { theme: themer.CurrentTheme, changes: store.getChanges() };
            if (data.length !== 0) {
                var xhrArgs = {
                    method: "post",
                    data: JSON.stringify(data),
                    headers: { "content-type": "application/json", 'Access-Control-Allow-Origin': '*', "X-Requested-With": null },
                    error: function (err) {
                        alert(err.Message || err);
                    }
                };
                when(xhr("http://localhost:22166/api/themer", xhrArgs), function (res) {
                    var parsed = JSON.parse(res) || res;
                    if (parsed && parsed.Data && parsed.Data.Success) {
                        alert("theme saved");
                    } else if (parsed && parsed.Data && parsed.Data.Message) {
                        alert(parsed.Data.Message);
                    } else {
                        alert("Server failed to save the theme");
                    }
                });
            } else {
                alert("No Changes to save.");
            }
        });

    });
});