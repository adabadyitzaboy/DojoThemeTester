using System;
using System.Web.Mvc;
using System.Web.Routing;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Newtonsoft.Json.Linq;

namespace ThemeTester.Tests
{
    [TestClass]
    public class UnitTest1
    {

        [TestMethod]
        public void NoDataSent()
        {
            var result = new RouteValueDictionary(Test(null).Data);
            Assert.IsFalse(ValidSuccess(result));
            Assert.AreEqual(GetFailMessage(result), "No data sent");
        }

        [TestMethod] 
        public void NoThemeFolderGiven()
        {
            var jObject = new JObject();
            
            var result = new RouteValueDictionary(Test(jObject).Data);
            Assert.IsFalse(ValidSuccess(result));
            Assert.AreEqual(GetFailMessage(result), "Theme folder name not given.");
        }

        [TestMethod]
        public void NoChanges()
        {
            var obj = "{ \"theme\": \"cad\" }";
            
            var result = new RouteValueDictionary(Test(JObject.Parse(obj)).Data);
            Assert.IsFalse(ValidSuccess(result));
            Assert.AreEqual(GetFailMessage(result), "No changes sent.");
        }
        
        [TestMethod]
        public void NoChangesArray()
        {
            var obj = "{ \"theme\": \"cad\", \"changes\": []}";

            var result = new RouteValueDictionary(Test(JObject.Parse(obj)).Data);
            Assert.IsTrue(ValidSuccess(result));
        }

        [TestMethod]
        public void ChangePrimaryColor()
        {
            var obj = "{ \"theme\": \"cad\", \"changes\": [ {\"property\": \"@primary-color\", \"value\": \"#fff\"} ] }";

            var result = new RouteValueDictionary(Test(JObject.Parse(obj)).Data);
            
            Assert.IsTrue(ValidSuccess(result));

            //TODO Validate result
        }

        private JsonResult Test(JObject jsonObject)
        {
            var c = new ThemeTester.Controllers.ThemerController();
            return c.Post(jsonObject);
        }

        private string GetFailMessage(RouteValueDictionary Result)
        {
            if (Result != null && Result["Message"] != null)
            {
                return Result["Message"].ToString();
            }
            return null;
        }

        private bool ValidSuccess(RouteValueDictionary Result)
        {

            return Result != null && Result["Success"] != null && (bool)Result["Success"];
        }
    }

}
