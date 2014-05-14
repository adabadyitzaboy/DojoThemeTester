/*
Copyright (c) 2014 Bryan Euton.  All rights reserved.
Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
*/

using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace ThemeTester
{
    public class ThemeFileCreaterCss
    {
        private static String ClassTemplate = @"{
			""className"": ""@CLASSNAME"",
			""Attributes"":[@ATTRIBUTES
			  ]
		}";
        private static String AttributeTemplate = @"
                {
					""property"": ""@TYPE"",
					""value"": ""@VALUE"",
					""Variables"":[@VARIABLES]
				}";

        public static String GetCSS(ref long startNumber, String Theme, String Dir)
        {
            String fullName = Path.GetFullPath(Dir + "\\" + Theme + "\\" + Theme + ".css");
            List<String> fileNames = GetFileNames(fullName);
            List<String> files = new List<string>();
            foreach (String file in fileNames)
            {
                String processedFile = ProcessFile(ref startNumber, file);
                if (processedFile != "")
                {
                    files.Add(processedFile);
                }
            }
            return String.Join(", ", files);
        }
        public static List<String> GetFileNames(String FullName)
        {
            String currentDirectory = Path.GetDirectoryName(FullName);
            List<String> rtn = new List<string>();
            String originalData = GetFile(FullName);
            String data = new Regex(@"//(.*)").Replace(originalData, "").Replace("\n", "").Replace("\t", "");
            data = RemoveLongComments(data);
            Regex imports = new Regex("@import url\\(\"([^\"]*)\"\\);");
            Match m = imports.Match(data);
            while (m.Success)
            {
                String innerFullName = Path.GetFullPath(currentDirectory + "\\" + m.Groups[1].Value.Replace("/", "\\"));
                rtn.Add(innerFullName.Replace(".css", ".less"));
                rtn.AddRange(GetFileNames(innerFullName));
                m = m.NextMatch();
            }
            return rtn;
        }

        public static String ProcessFile(ref long startNumber, String FileName)
        {
            List<String> rtn = new List<string>();
            String originalData = GetFile(FileName);
            String data = new Regex(@"//(.*)").Replace(originalData, "").Replace("\n", "").Replace("\t", "");
            data = RemoveLongComments(data);
            data = new Regex("@import \"([\\./]*)variables\";").Replace(data, "");
            data = new Regex("@{([^}]*)}").Replace(data, "@$1");
            Regex classes = new Regex("(\\.[a-zA-Z]([^{]*)){([^}]*)}");
            Match m = classes.Match(data);
            while (m.Success)
            {
                String className = m.Groups[1].Value.Trim().Replace(@"""", "'").Replace(",", ", ");
                String[] lines = m.Groups[3].Value.Split(new String[] { ";" }, StringSplitOptions.RemoveEmptyEntries);
                List<String> attributes = new List<string>();
                foreach (String line in lines)
                {
                    if (line.IndexOf(":") != -1)
                    {
                        String[] bits = line.Split(new String[] { ":" }, StringSplitOptions.RemoveEmptyEntries);
                        String type = bits[0].Trim();
                        String value = bits[1].Trim().Replace(@"""", "'");
                        List<String> variablesList = new List<string>();
                        String variables = "";
                        if (value.IndexOf("@") != -1)
                        {
                            Regex vars = new Regex("@([^ )',]*)");
                            Match m2 = vars.Match(value);
                            while (m2.Success)
                            {
                                variablesList.Add(m2.Groups[0].Value);
                                m2 = m2.NextMatch();
                            }
                            variables = @"""" + String.Join(@""", """, variablesList) + @"""";
                        }
                        bool isFunction = false;
                        if (value.Replace("rgba(", "").Replace("url(", "").IndexOf("(") == -1)
                        {
                        }
                        else
                        {
                            isFunction = true;
                            String orig = value;
                            value = Helper.GetFunction(ref startNumber, value);
                            value = value.Substring(1, value.Length - 2);
                            value += @", ""valueString"": """ + orig + @""" ";
                        }
                        attributes.Add(AttributeTemplate.Replace("@TYPE", type).Replace((isFunction ? @"""value"": ""@VALUE""" : "@VALUE"), value).Replace("@VARIABLES", variables));
                    }
                }
                rtn.Add(ClassTemplate.Replace("@CLASSNAME", className).Replace("@ATTRIBUTES", String.Join(", ", attributes)));
                
                m = m.NextMatch();
            }
            return String.Join(", ", rtn); 
        }
        private static String RemoveLongComments(String Data)
        {
            String rtn = Data;
            while (rtn.IndexOf("/*") != -1)
            {
                int start = rtn.IndexOf("/*");
                int end = rtn.IndexOf("*/");
                rtn = rtn.Substring(0, start) + rtn.Substring(end + 2);
            }
            return rtn;
        }

        public static String GetFile(String FullName)
        {
            if (File.Exists(FullName))
            {
                FileStream fs = File.Open(FullName, FileMode.Open);
                Byte[] b = new Byte[fs.Length];
                int count = fs.Read(b, 0, (int)fs.Length);
                fs.Close();
                return System.Text.UTF8Encoding.UTF8.GetString(b, 0, count);
            }
            else
            {
                return "";
            }
        }
    }
}
