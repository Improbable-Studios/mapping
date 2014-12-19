#pragma strict

import System.IO;

static var instance : ResourceManagerScript;

static var directory : TextAsset;
static var json : JSONClass;

static private var save = [".png", ".ogg", ".wav", ".txt"];

function Awake()
{
    instance = this;
	if (Application.isEditor)
		json = generateJSON();
	else
    {
        directory = Resources.Load("directory") as TextAsset;
		json = JSONNode.Parse(directory.text) as JSONClass;
    }
}

static function generateJSON()
{
	var J = new JSONClass();
	recursiveDirectoryCrawl(J, Application.dataPath + "/Resources/");
	return J;
}

static function recursiveDirectoryCrawl(J : JSONNode, dir : String)
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

static function getSubJSON(path : String)
{
	var cur : JSONClass = json;
	for (p in path.Split('/'[0]))
	{
		if (p == "")
			continue;
		if (cur["/"][p] == null)
			return null;
		cur = cur["/"][p] as JSONClass;
	}
	return cur;
}

static function getDirectoriesInPath(path : String)
{
	var J = getSubJSON(path);
	if (J == null)
		return [];
	var res = new String[J["dirlist"].Count];
	for (var i=0; i<J["dirlist"].Count; i++)
		res[i] = J["dirlist"][i];
	return res;
}

static function getFilesOfType(path : String, extension : String)
{
	var J = getSubJSON(path);
	if (J == null)
		return null;

	var f : String;
	var count = 0;
	if (J["filelist"].Count > 0)
	{
		for (f in J["filelist"])
		{
			if (f.EndsWith(extension))
				count++;
		}
	}
	var res = new String[count];
	if (count > 0)
	{
		count = 0;
		for (f in J["filelist"])
		{
			if (f.EndsWith(extension))
			{
				res[count] = f[0:f.Length-extension.Length];
				count++;
			}
		}
	}
	return res;
}
