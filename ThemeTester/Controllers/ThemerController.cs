using System;
using System.Collections.Generic;
using System.Configuration;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Web.Http;
using System.IO;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System.Web.Mvc;
using System.Web;

namespace ThemeTester.Controllers
{
    public class ThemerController : ApiController
    {
        // POST api/themer
        public JsonResult Post([FromBody] JObject jsonObject)
        {
            if (jsonObject == null)
            {
                return ApiHelper.Json(new { Success = false, Message = "No data sent" });
            }
            if (jsonObject["theme"] == null)
            {
                return ApiHelper.Json(new { Success = false, Message = "Theme folder name not given." });
            }
            if (jsonObject["changes"] == null)
            {
                return ApiHelper.Json(new { Success = false, Message = "No changes sent." });
            }
            try
            {
                var dir = ConfigurationManager.AppSettings["ThemeDirectory"];
                var themeFolderName = jsonObject["theme"].ToString();
                var fileName = dir + "\\" + themeFolderName +  "\\variables.less";
                var variableFile = getText(fileName);
                var jsonArray = jsonObject["changes"];
                foreach (var obj in jsonArray)
                {
                    var property = obj["property"].ToString();//add serverside validation for ability to edit property here.
                    var value = obj["value"].ToString();//add serverside validation that updated value for this property is valid.
                    var index = variableFile.IndexOf(property);
                    if (index != -1)
                    {
                        var start = index + variableFile.Substring(index).IndexOf(":") + 1;
                        var end = index + variableFile.Substring(index).IndexOf(";");
                        variableFile = variableFile.Substring(0, start) + " " + value + variableFile.Substring(end);
                    }
                }

                writeFile(fileName, variableFile);
                LESSCompiler.Compile(themeFolderName);//Recompile the LESS files.
                return ApiHelper.Json(new { Success = true, Message /*Not necessary*/= variableFile });
            }
            catch (Exception ex)
            {
                return ApiHelper.Json(new { Success = false, Message = "Exception Thrown. " + ex.Message, Stack = ex.StackTrace });
            }
        }

        public void writeFile(string fileName, string data)
        {
            var bytes = System.Text.UTF8Encoding.UTF8.GetBytes(data);
            
            using (var fs = System.IO.File.Open(fileName, FileMode.Truncate))
            {
                fs.Write(bytes, 0, bytes.Length);
                fs.Close();
            }
        }

        public string getText(string fileName)
        {
            using (var fs = System.IO.File.OpenRead(fileName))
            {
                byte[] b = new byte[fs.Length];
                var amountRead = fs.Read(b, 0, b.Length);
                var text = System.Text.UTF8Encoding.UTF8.GetString(b, 0, amountRead);
                return text;
            }
        }
    }
}
