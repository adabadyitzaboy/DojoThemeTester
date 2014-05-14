using System;
using System.Collections.Generic;
using System.Configuration;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Web.Http;
using System.Web.Mvc;
using Newtonsoft.Json.Linq;

namespace ThemeTester.Controllers
{
    public class ThemeCreaterController : ApiController
    {
        // POST api/themecreater
        public JsonResult Post([FromBody]JObject jsonObject)
        {
            if (jsonObject == null)
            {
                return ApiHelper.Json(new { Success = false, Message = "No data sent" });
            }
            if (jsonObject["theme"] == null)
            {
                return ApiHelper.Json(new { Success = false, Message = "Theme folder name not given." });
            }
            var dir = ConfigurationManager.AppSettings["ThemeDirectory"];
            try
            {
                new ThemeFileCreater(jsonObject["theme"].ToString(), dir);//create the json file for theme
            }
            catch (Exception ex)
            {
                return ApiHelper.Json(new { Success = false, Message = "Error: " + ex.Message, Stack = ex.StackTrace });

            }
            return ApiHelper.Json(new { Success = true });
        }
    }
}
