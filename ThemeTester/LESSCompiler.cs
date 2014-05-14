/*
Copyright (c) 2014 Bryan Euton.  All rights reserved.
Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
*/

using System;
using System.Collections.Generic;
using System.Configuration;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Web;

namespace ThemeTester
{
    public static class LESSCompiler
    {
        public static void Compile(string theme)
        {
            var themeFolder = ConfigurationManager.AppSettings["ThemeDirectory"] + "\\" + theme;
            
            ProcessStartInfo psi = new ProcessStartInfo();
            psi.FileName = "cmd.exe";
            psi.Arguments = "/C node compile.js";//Must have Node js installed to run this command.
            psi.WorkingDirectory = themeFolder;

            Process p = Process.Start(psi);
        }
    }
}