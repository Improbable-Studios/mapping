#pragma strict

import System;
import System.IO;
import System.Runtime.Serialization.Formatters.Binary;

static var instance : ResourceManagerScript;

var sheetKey : String;
var sheetName : String;
var tabName : String;

static var passwordHash = "ThePasswordIs";
static var saltKey = "ImprobableStudios";
static var viKey = "IsAmazingAwesome";


static var directory : TextAsset;
static var locations : TextAsset;
static var directoryJson : JSONClass;
static var locationsTab : SpreadsheetTab;

static private var save = [".png", ".ogg", ".wav", ".txt"];

@System.Serializable
class ResourceSerializable extends Object
{
    var directoryJsonStr : String;
    var locationsTab : SpreadsheetTab;
}

function Awake()
{
    instance = this;
    var resourceAsset = UnityEngine.Resources.Load("resource") as TextAsset;
    var resource = deserialize(resourceAsset.text) as ResourceSerializable;
    locationsTab = resource.locationsTab;
	if (Application.isEditor)
        generateDirectoryJSON();
	else
        directoryJson = JSONNode.Parse(resource.directoryJsonStr) as JSONClass;
}


static function encrypt(plainText : String) : String
{
    var plainTextBytes = Encoding.UTF8.GetBytes(plainText);
    var keyBytes = Rfc2898DeriveBytes(passwordHash, Encoding.ASCII.GetBytes(saltKey)).GetBytes(256f / 8f);
    var symmetricKey = RijndaelManaged();
    symmetricKey.Mode = CipherMode.CBC;
    symmetricKey.Padding = PaddingMode.Zeros;

    var encryptor = symmetricKey.CreateEncryptor(keyBytes, Encoding.ASCII.GetBytes(viKey));
    var cipherTextBytes : byte[];
    var memoryStream = MemoryStream();
    var cryptoStream = CryptoStream(memoryStream, encryptor, CryptoStreamMode.Write);
    cryptoStream.Write(plainTextBytes, 0, plainTextBytes.Length);
    cryptoStream.FlushFinalBlock();
    cipherTextBytes = memoryStream.ToArray();
    cryptoStream.Close();
    memoryStream.Close();
    return Convert.ToBase64String(cipherTextBytes);
}

static function decrypt(encryptedText : String) : String
{
    var cipherTextBytes = Convert.FromBase64String(encryptedText);
    var keyBytes = Rfc2898DeriveBytes(passwordHash, Encoding.ASCII.GetBytes(saltKey)).GetBytes(256f / 8f);
    var symmetricKey = RijndaelManaged();
    symmetricKey.Mode = CipherMode.CBC;
    symmetricKey.Padding = PaddingMode.None;

    var decryptor = symmetricKey.CreateDecryptor(keyBytes, Encoding.ASCII.GetBytes(viKey));
    var memoryStream = MemoryStream(cipherTextBytes);
    var cryptoStream = CryptoStream(memoryStream, decryptor, CryptoStreamMode.Read);
    var plainTextBytes = new byte[cipherTextBytes.Length];

    var decryptedByteCount = cryptoStream.Read(plainTextBytes, 0, plainTextBytes.Length);
    memoryStream.Close();
    cryptoStream.Close();
    return Encoding.UTF8.GetString(plainTextBytes, 0, decryptedByteCount).TrimEnd("\0".ToCharArray());
}

static function clone(obj : Object) : Object
{
    var bf = BinaryFormatter();
    var mem = MemoryStream();
    bf.Serialize(mem, obj);
    var bytes = mem.ToArray();
    mem.Close();
    mem = MemoryStream(bytes);
    var objclone = bf.Deserialize(mem);
    mem.Close();
    return objclone;
}

static function serialize(obj : Object) : String
{
    var bf = BinaryFormatter();
    var mem = MemoryStream();
    var gzipOut = ICSharpCode.SharpZipLib.BZip2.BZip2OutputStream(mem);
    gzipOut.IsStreamOwner = false;
    bf.Serialize(gzipOut, obj);
    gzipOut.Close();
    var bytes = mem.ToArray();
    mem.Close();
//    return Convert.ToBase64String(bytes);
    return encrypt(Convert.ToBase64String(bytes));
}

static function deserialize(str : String) : Object
{
    var bytes = Convert.FromBase64String(decrypt(str));
//    var bytes = Convert.FromBase64String(str);
    var bf = BinaryFormatter();
    var mem = MemoryStream(bytes);
    var gzipIn = ICSharpCode.SharpZipLib.BZip2.BZip2InputStream(mem);
    var obj = bf.Deserialize(gzipIn);
    gzipIn.Close();
    mem.Close();
    return obj;    
}

function finishedDownloadLocationsSpreadsheet()
{
    for (var row in locationsTab.getRowDict("NSY_Exterior"))
        Debug.Log(row.Key + " \t: " + row.Value);
    for (var col in locationsTab.getColumnDict("Location"))
        Debug.Log(col.Key + " \t: " + col.Value);
    Debug.Log("FINISHED");
}

function downloadLocationsSpreadsheet()
{
    downloadLocationsSpreadsheet(function(){});
}

function downloadLocationsSpreadsheet(f : function())
{
    GoogleAPIScript.instance.loadSpreadsheet(sheetKey, [tabName]);
    locationsTab = GoogleAPIScript.instance.openedSheets[sheetName].tabs[tabName];
    f();
}

function downloadLocationsSpreadsheetCoroutine()
{
    return downloadLocationsSpreadsheetCoroutine(function(){});
}

function downloadLocationsSpreadsheetCoroutine(f : function())
{
    yield GoogleAPIScript.instance.loadSpreadsheetCoroutine(sheetKey, [tabName]);
    locationsTab = GoogleAPIScript.instance.openedSheets[sheetName].tabs[tabName];
    f();
}

static function generateDirectoryJSON()
{
	var J = new JSONClass();
	recursiveDirectoryCrawl(J, Application.dataPath + "/Resources/");
	directoryJson = J;
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
	var cur : JSONClass = directoryJson;
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
