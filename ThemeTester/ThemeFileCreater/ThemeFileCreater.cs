/*
Copyright (c) 2014 Bryan Euton.  All rights reserved.
Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
*/

using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using System.Web;

namespace ThemeTester
{
    public class ThemeFileCreater
    {
        private String BasicTemplate = @"{
			""property"": ""@Property"",
			""value"": ""@VALUE"",
			""type"": ""BasicVariable""
		}";
        private String LinkedTemplate = @"{
			""property"": ""@Property"",
			""value"": ""@VALUE"",
			""type"": ""LinkedVariable""
		}";
        private String MixinTemplate = @"{
			""property"": ""@Property"",
			""Input"": [
                    @INPUT
             ],
			""Body"": [@BODY
            ]
		}";

        private String MixinLineTemplate = @"
                    {
			        ""type"": ""@TYPE"",
			        ""value"":[
						        @VALUE
					        ]
		            }";
        public ThemeFileCreater(String Theme, String Dir)
        {
            var startNumber = DateTime.Now.Ticks;
            FileStream fs = File.Open(Dir + "\\" + Theme + "\\variables.less", FileMode.Open);
                Byte[] b = new Byte[fs.Length];
            int count = fs.Read(b,0,(int)fs.Length);
            fs.Close();
            String VariableFile = System.Text.UTF8Encoding.UTF8.GetString(b,0,count);
            Regex regex = new Regex(@"//(.*)");
            String[] variables = regex.Replace(VariableFile.Substring(0,VariableFile.IndexOf(@"// Mixin")),"").Replace("\t","").Replace("\n", "").Split(new String[]{";"}, StringSplitOptions.RemoveEmptyEntries);
            String[] mixins = regex.Replace(VariableFile.Substring(VariableFile.IndexOf(@"// Mixin")), "").Replace("\t", "").Replace("\n", "").Split(new String[] { "}." }, StringSplitOptions.RemoveEmptyEntries);
            List<String> JsonVariables = new List<string>();
            for(int i =0;i<variables.Length;i++)
            {
                String left = variables[i].Substring(0, variables[i].IndexOf(":")).Trim();
                String right = variables[i].Substring(variables[i].IndexOf(":")+1).Trim();
                String value = "";
                bool isFunction = false;
                if (right.IndexOf("(") == -1)
                {
                    value = right;
                    if (value.IndexOf(@"""") != -1)
                    {
                        value = value.Replace(@"""", "");
                    }
                }
                else
                {
                    isFunction = true;
                    value = Helper.GetFunction(ref startNumber, right);
                    value = value.Substring(1, value.Length - 2);
                }

                if (right.IndexOf("@") == -1)
                {
                    JsonVariables.Add(BasicTemplate.Replace("@Property", left).Replace((isFunction ? @"""value"": ""@VALUE""" : "@VALUE"), value));
                }
                else
                {
                    JsonVariables.Add(LinkedTemplate.Replace("@Property", left).Replace((isFunction ? @"""value"": ""@VALUE""" : "@VALUE"), value));
                }
            }
            for (int i = 0; i < mixins.Length; i++)
            {
                String mixin = GetMixin(mixins[i] + "}");
                if (mixin != "")
                {
                    JsonVariables.Add(mixin);
                }
            }
            if (File.Exists(Dir + "\\" + Theme + "\\" + Theme + ".json"))
            {
                File.Delete(Dir + "\\" + Theme + "\\" + Theme + ".json");
            }
            String output = "{ \n\t\"LESSVariables\": [\n\t\t" + String.Join(", \n\t\t", JsonVariables) + "],\n\t\"LESSClasses\": [" + ThemeFileCreaterCss.GetCSS(ref startNumber, Theme, Dir) + "\n],\n\t\"StyleSheet\":\"scripts/dijit/themes/" + Theme + "/" + Theme + ".css\",\n\t\"ClassName\":\"" + Theme + "\"}";
            b = System.Text.UTF8Encoding.UTF8.GetBytes(output);
            fs = File.Create(Dir + "\\" + Theme + "\\" + Theme + ".json");
            
            
            fs.Write(b, 0, b.Length);
            fs.Close();
        }
        private String GetMixin(String Mixin)
        {//".border-radius (@radius) {-moz-border-radius: @radius;border-radius: @radius;"}
            Regex regex = new Regex(@"([^\(]+)\(([^\)]+)\)([ ]*){([^\(]+)}");
            Match m = regex.Match(Mixin);
            String rtn = "";
            if (m.Success)
            {
                String key = m.Groups[1].Value.Trim();
                String[] input = m.Groups[2].Value.Split(new String[] { "," }, StringSplitOptions.RemoveEmptyEntries);
                String[] body = m.Groups[4].Value.Split(new String[] { ";" }, StringSplitOptions.RemoveEmptyEntries);
                String[] formatedInput = new String[input.Length];
                String[] formatedBody = new String[body.Length];
                for (int i = 0; i < input.Length; i++)
                {
                    formatedInput[i] = input[i].Trim();
                }
                for (int i = 0; i < body.Length; i++)
                {
                    String[] bits = body[i].Split(new String[] { ":" }, StringSplitOptions.RemoveEmptyEntries);
                    String type = bits[0].Trim();
                    String[] values = bits[1].Split(new String[] { "," }, StringSplitOptions.RemoveEmptyEntries);
                    for (int j = 0; j < values.Length; j++)
                    {
                        values[j] = values[j].Trim();
                    }
                    formatedBody[i] = MixinLineTemplate.Replace("@TYPE", type).Replace("@VALUE", @"""" + String.Join(@""", """, values) + @"""");
                }
                String finalInput = @"""" + String.Join(@""", """, formatedInput) + @"""";
                String finalBody = String.Join(", ", formatedBody);
                rtn = MixinTemplate.Replace("@Property", key).Replace("@INPUT", finalInput).Replace("@BODY", finalBody);
            }
            return rtn;
        }
        
       
    }
}