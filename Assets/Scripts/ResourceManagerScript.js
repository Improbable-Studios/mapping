#pragma strict

import System.IO;

var directory : TextAsset;

var json : JSONClass;

private var save = [".png", ".ogg", ".wav"];

function Awake()
{
	if (Application.isEditor)
		json = generateJSON();
	else
		json = JSONNode.Parse(directory.text) as JSONClass;
}

function generateJSON()
{
	var J = new JSONClass();
	recursiveDirectoryCrawl(J, Application.dataPath + "/Resources/");
	return J;
}

function recursiveDirectoryCrawl(J : JSONNode, dir : String)
{
    for (f in Directory.GetFiles(dir))
    {
	    var fileInfo = new DirectoryInfo(f);
	    if (fileInfo.Extension in save)
	    	J["filelist"][-1] = fileInfo.Name;
   	}
    for (d in Directory.GetDirectories(dir))
    {
	    var dirInfo = new DirectoryInfo(d);
	    J["dirlist"][-1] = dirInfo.Name;
	    J["/"][dirInfo.Name] = new JSONClass();
		recursiveDirectoryCrawl(J["/"][dirInfo.Name], d);
    }
}

function getSubJSON(path : String)
{
	var cur : JSONClass = json;
	for (p in path.Split('/'[0]))
	{
		if (p == "")
			continue;
		cur = cur["/"][p] as JSONClass;
	}
	return cur;
}

function getDirectoriesInPath(path : String)
{
	var J = getSubJSON(path);
	var res = new String[J["dirlist"].Count];
	for (var i=0; i<J["dirlist"].Count; i++)
		res[i] = J["dirlist"][i];
	return res;
}

function getFilesOfType(path : String, extension : String)
{
	var J = getSubJSON(path);
	var count = 0;
	if (J["filelist"].Count > 0)
	{
		for (f_ in J["filelist"])
		{
			var f : String = f_ as String;
			if (f.EndsWith(extension))
				count++;
		}
	}
	var res = new String[count];
	if (count > 0)
	{
		count = 0;
		for (f_ in J["filelist"])
		{
			f = f_ as String;
			if (f.EndsWith(extension))
			{
				res[count] = f[0:f.Length-extension.Length];
				count++;
			}
		}
	}
	return res;
}
