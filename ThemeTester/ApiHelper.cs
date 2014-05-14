using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace ThemeTester
{
    public static class ApiHelper
    {
        public static JsonResult Json(object p)
        {//since this is an apicontroller, we don't have access to MVC's Json method.
            var json = new JsonResult();
            json.ContentType = "application/json";
            json.JsonRequestBehavior = JsonRequestBehavior.AllowGet;
            json.Data = p;
            return json;
        }

    }
}