/*
Copyright (c) 2014 Bryan Euton.  All rights reserved.
Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
*/
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace ThemeTester
{
    public static class Helper
    {
        private static String FunctionTemplate = @"{
			""methodName"": ""@NAME"",
			""Arguments"": 
                [ 
                    @ARGUMENTS
                ]
		}";

        public static String GetFunction(ref long StartNumber, String value)
        {
            _NextNumber = StartNumber;

            int start = value.IndexOf("(");
            int end = value.LastIndexOf(")");
            String name = value.Substring(0, start);
            String arguments = value.Substring(start + 1, end - start - 1);
            Regex regex = new Regex(@"([a-zA-Z]+)\(([-@ a-zA-Z,0-9%]+)\)");
            Match m = regex.Match(value);
            List<String> functions = new List<string>();

            Dictionary<String, String> answer = new Dictionary<string, string>();
            while (m.Success)
            {

                String num = GetNextNumber(value);
                value = value.Replace(m.Groups[0].Value, num);
                answer.Add(num, FunctionTemplate.Replace("@NAME", m.Groups[1].Value).Replace("@ARGUMENTS", GetArguments(m.Groups[2].Value, answer)));

                if (m.NextMatch().Success)
                {
                    m = m.NextMatch();
                }
                else
                {
                    m = regex.Match(value);
                }
            }
            return answer[value.Trim()];
        }

        private static String GetArguments(String argument, Dictionary<String, String> lookup)
        {
            int comma = argument.IndexOf(",");
            String rtn = "";
            String[] arguments = argument.Split(new String[] { "," }, StringSplitOptions.RemoveEmptyEntries);
            String[] outputArguments = new String[arguments.Length];
            for (int i = 0; i < arguments.Length; i++)
            {
                outputArguments[i] = arguments[i].Trim();
                if (lookup.ContainsKey(outputArguments[i]))
                {
                    outputArguments[i] = lookup[outputArguments[i]];
                }
                else if (outputArguments[i].IndexOf(@"""") == -1)
                {
                    outputArguments[i] = @"""" + outputArguments[i] + @"""";
                }

            }
            rtn = @" " + String.Join(",\n ", outputArguments) + @" ";
            return rtn;
        }
        private static long _NextNumber;
        private static String GetNextNumber(String value)
        {
            if (value.IndexOf((_NextNumber++).ToString()) == -1)
            {
                return _NextNumber.ToString();
            }
            else
            {
                return GetNextNumber(value);
            }
        }
    }
}
