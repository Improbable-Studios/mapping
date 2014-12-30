#pragma strict

import System;
import System.Text;
import System.Security.Cryptography;
import System.Security.Cryptography.X509Certificates;

static var instance : GoogleAPIScript;
static var isWebPlayer : boolean;
static var isWindows : boolean;
static var isHalfPixel : boolean;

static var openedSheets : Dictionary.<String, Spreadsheet>;

static private var accessToken : JSONClass;
static private var expireTime = 0;

class SpreadsheetTab extends Object
{
    var name : String;
    var tabJSON : JSONClass;
    var content : String[,];

    function SpreadsheetTab(name_ : String, tabJSON_ : JSONClass)
    {
        name = name_;
        tabJSON = tabJSON_;

        var listOfCellsJSON = tabJSON["feed"]["entry"];
        var maxRows = 0;
        var maxCols = 0;
        for (var row=0; row<listOfCellsJSON.Count; row++)
        {
            var cellCoords = listOfCellsJSON[row]["id"]["$t"].Value as String;
            cellCoords = cellCoords[cellCoords.LastIndexOf('/'[0])+1:];
            var r = int.Parse(cellCoords.Split('C'[0])[0][1:]);
            var c = int.Parse(cellCoords.Split('C'[0])[1]);
            if (r > maxRows)
                maxRows = r;
            if (c > maxCols)
                maxCols = c;
        }
        content = new String[maxRows, maxCols];
        for (row=0; row<listOfCellsJSON.Count; row++)
        {
            var cellValue = listOfCellsJSON[row]["content"]["$t"].Value as String;
            cellCoords = listOfCellsJSON[row]["id"]["$t"].Value as String;
            cellCoords = cellCoords[cellCoords.LastIndexOf('/'[0])+1:];
            r = int.Parse(cellCoords.Split('C'[0])[0][1:]) - 1;
            c = int.Parse(cellCoords.Split('C'[0])[1]) - 1;
            content[r, c] = cellValue;
        }
    }

    function indexInRow(row : int, val : String) : int
    {
        for (var i=0; i<content.GetLength(1); i++)
        {
            if (content[row+1, i] == val)
                return i;
        }
        return -1;
    }

    function indexInColumn(col : int, val : String) : int
    {
        for (var i=1; i<content.GetLength(0); i++)
        {
            if (content[i, col] == val)
                return i-1;
        }
        return -1;
    }

    function indexOfHeader(h : String) : int
    {
        return indexInRow(-1, h);
    }

    function indexOfID(id : String) : int
    {
        return indexInColumn(0, id);
    }

    function indexInRow(id : String, val : String) : int
    {
        return indexInRow(indexOfID(id), val);
    }

    function indexInColumn(header : String, val : String) : int
    {
        return indexInColumn(indexOfHeader(header), val);
    }

    function getHeaders() : String[]
    {
        return content[0,:content.GetLength(1)];
    }

    function getRowArray(id : String) : String[]
    {
        return getRowArray(indexOfID(id));
    }

    function getRowArray(row : int) : String[]
    {
        return content[row+1,:content.GetLength(1)];
    }

    function getRowDict(id : String) : Dictionary.<String, String>
    {
        return getRowDict(indexOfID(id));
    }

    function getRowDict(row : int) : Dictionary.<String, String>
    {
        if (row < 0)
            return null;

        var d = Dictionary.<String, String>();
        for (var i=0; i<content.GetLength(1); i++)
        {
            if (content[0,i])
                d[content[0,i]] = content[row+1,i];
        }
        return d;
    }

    function getColumnArray(header : String) : String[]
    {
        return getColumnArray(indexOfHeader(header));
    }
            
    function getColumnArray(col : int) : String[]
    {
        return content[1:content.GetLength(0), col];
    }

    function getColumnDict(header : String) : Dictionary.<String, String>
    {
        return getColumnDict(indexOfHeader(header));
    }

    function getColumnDict(col : int) : Dictionary.<String, String>
    {
        if (col < 0)
            return null;

        var c = Dictionary.<String, String>();
        for (var i=0; i<content.GetLength(0); i++)
        {
            if (content[i,0])
                c[content[i,0]] = content[i,col];
        }
        return c;
    }
}

class Spreadsheet extends Object
{
    var sheetKey : String;
    var sheetJSON : JSONClass;
    var tabJSON : Dictionary.<String, JSONClass>;
    
    var tabs : Dictionary.<String, SpreadsheetTab>;

    function Spreadsheet(sheetKey_ : String)
    {
        sheetKey = sheetKey_;
    }
    
    function refreshContents()
    {
        tabs = Dictionary.<String, SpreadsheetTab>();
        for (key in tabJSON.Keys)
        {
            tabs[key] = SpreadsheetTab(key, tabJSON[key]);
        }
    }
}

function Awake()
{
    instance = this;
    openedSheets = Dictionary.<String, Spreadsheet>();
    #if UNITY_EDITOR
    isWebPlayer = Application.isWebPlayer || EditorUserBuildSettings.activeBuildTarget == BuildTarget.WebPlayer;
    #else
    isWebPlayer = Application.isWebPlayer;
    #endif
    isWindows = Application.platform == RuntimePlatform.WindowsPlayer || Application.platform == RuntimePlatform.WindowsWebPlayer;
    isHalfPixel = isWindows && SystemInfo.graphicsShaderLevel <= 30;
}

function Start ()
{
    if(!isWebPlayer)
    {
//        var sheetKey = "1Wf-zRfWngIz_6FzLZmWvTHxRmfFCihEDxgEvcac-PMo";
//        var sheetName = "Central Database";
//        var tabName = "Locations";
//        yield loadSpreadsheet(sheetKey, [tabName]);
//        var tab = openedSheets[sheetName].tabs[tabName];
//            
//        for (var row in tab.getRowDict("NSY_Exterior"))
//            Debug.Log(row.Key + " \t: " + row.Value);
//
//        for (var col in tab.getColumnDict("Location"))
//            Debug.Log(col.Key + " \t: " + col.Value);
//        
//        Debug.Log("FINISHED");
    }
    else
        Debug.Log("Running on Web Player mode");
}

function loadSpreadsheet(sheetKey : String, tabsToLoad : String[])
{
    var sheet = Spreadsheet(sheetKey);
    var res = [JSONClass()] as JSONClass[];
    yield GoogleAPIScript.instance.download("https://spreadsheets.google.com/feeds/worksheets/" + sheet.sheetKey + "/private/basic", res);
    sheet.sheetJSON = res[0];
    var listOfTabsJSON = sheet.sheetJSON["feed"]["entry"];

    if (listOfTabsJSON)
    {
        var sheetName = sheet.sheetJSON["feed"]["title"]["$t"].Value as String;
        sheet.tabJSON = Dictionary.<String, JSONClass>();        
        for (var i=0; i<listOfTabsJSON.Count; i++)
        {
            var tabName = listOfTabsJSON[i]["title"]["$t"].Value as String;
            if (tabName in tabsToLoad)
            {
                res = [JSONClass()] as JSONClass[];
                yield GoogleAPIScript.instance.download(listOfTabsJSON[i]["link"][1]["href"], res);
                sheet.tabJSON[listOfTabsJSON[i]["title"]["$t"]] = res[0];
            }
        }
        sheet.refreshContents();
        openedSheets[sheetName] = sheet;
    }    
}

function download(url : String, f : function(JSONClass))
{
    yield downloadAccessToken();
    if (url.Contains("?"))
        url += "&alt=json-in-script&callback=importGSS";
    else
        url += "?alt=json-in-script&callback=importGSS";
    url += "&access_token=" + accessToken["access_token"];
    var w : WWW = WWW(url);
    yield w;
    if (w.error)
    {
        Debug.LogError("Download error: " + w.error + " -- URL: " + url);
        f(null);
    }
    else
    {
        var result = JSONNode.Parse(w.text) as JSONClass;
        f(result);
    }
}

function download(url : String, result : JSONClass[])
{
    var downloadCallback = function(json : JSONClass)
    {
        result[0] = json;
    };
    
    yield download(url, downloadCallback);
}

function downloadAccessToken ()
{
    var issueAndExpiry = getIssueAndExpiryDate();
    if (issueAndExpiry[0]+300 < expireTime)
        return;

    var header = '{"alg":"RS256","typ":"JWT"}';
    var claimsetObj = {
        "iss"   : "922281042014-fila5cn8qb8eg141ej277iij9k2oardd@developer.gserviceaccount.com",
        "scope" : "https://spreadsheets.google.com/feeds",
        "aud"   : "https://www.googleapis.com/oauth2/v3/token",
        "exp"   : issueAndExpiry[1],
        "iat"   : issueAndExpiry[0]
    };
    var bytesToSign = Encoding.UTF8.GetBytes(base64Encode(header) + "." + base64Encode(serializeHashTable(claimsetObj)));

    var x : X509Certificate2 = X509Certificate2(Convert.FromBase64String("MIICWzCCAcSgAwIBAgIIbfCReM4JdqUwDQYJKoZIhvcNAQEFBQAwUzFRME8GA1UEAxNIOTIyMjgxMDQyMDE0LWZpbGE1Y244cWI4ZWcxNDFlajI3N2lpajlrMm9hcmRkLmFwcHMuZ29vZ2xldXNlcmNvbnRlbnQuY29tMB4XDTE0MTIyMjA5NTYxMVoXDTI0MTIxOTA5NTYxMVowUzFRME8GA1UEAxNIOTIyMjgxMDQyMDE0LWZpbGE1Y244cWI4ZWcxNDFlajI3N2lpajlrMm9hcmRkLmFwcHMuZ29vZ2xldXNlcmNvbnRlbnQuY29tMIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDVw6b03CcewjQklNByxvyvgj7EgRo5thd8M5gA+AzPXe/jfGkAHD+U3EIWnrJiFiDgcK3Lzv0iB2KOSlFJ7mJui3XLKxKArVJzkw5a9BAAIul0laef8Z7y0v4+MVZ34z6n8UiVwghz2bQ23BUCXGDBJIS0dQjhtxMYWlr3AlreZQIDAQABozgwNjAMBgNVHRMBAf8EAjAAMA4GA1UdDwEB/wQEAwIHgDAWBgNVHSUBAf8EDDAKBggrBgEFBQcDAjANBgkqhkiG9w0BAQUFAAOBgQAccdcbiOASJoyXnaDUEAmCpsuE93tHcq/+umtMLRA718ifpSLC0CqSj+SSdXKejsEC+uMio4Q3Xj+kgRubCKxwoUFX3WlhIxWtpDgaUV9JJHwC4BuA0ygHQBbbFGZdoCy5kWSw4ZS87tUlHZn6t1ARMwXsMAFCqgtwGmUTe7+MDA==")) as X509Certificate2;
    x.Import(Convert.FromBase64String("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"), "", X509KeyStorageFlags.DefaultKeySet);
    var rsa: RSACryptoServiceProvider = x.PrivateKey as RSACryptoServiceProvider;
    var signedBytes = rsa.SignData(bytesToSign, "SHA256");
    var jwt = base64Encode(header) + "." + base64Encode(serializeHashTable(claimsetObj)) + "." + base64Encode(signedBytes);

    var form : WWWForm = WWWForm();
    form.AddField("assertion", jwt);
    form.AddField("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer");
    var w : WWW = WWW("https://www.googleapis.com/oauth2/v3/token", form);
    yield w;
    if (w.error)
        Debug.LogError("Download error: " + w.error);
    else
    {
        accessToken = JSONNode.Parse(w.text) as JSONClass;
        expireTime = issueAndExpiry[1];
    }
}

static function serializeHashTable(h : Hashtable)
{
    var s = "{";
    for (var k in h.Keys)
    {
        if (h[k].GetType() == Int32)
            s += '"'+k+'"'+'='+h[k]+',';
        else
            s += '"'+k+'"'+'="'+h[k]+'",';
    }
    s = s.TrimEnd(','[0]);
    s += "}";
    return s;
}

static function base64Encode(b: byte[]): String
{
    var s: String = Convert.ToBase64String(b);
    s = s.Replace("+", "-");
    s = s.Replace("/", "_");
    s = s.TrimEnd('='[0]);
    return s;
}

static function base64Encode(s: String): String
{    
    return base64Encode(Encoding.UTF8.GetBytes(s));
}

static function base64UrlDecodeIntoBytes(input : String): byte[]
{
    input = input.Replace("-", "+");
    input = input.Replace("_", "/");
    if (input.Length % 4 == 2)
        input += "==";
    else if (input.Length % 4 == 3)
        input += "=";
    var b: byte[] = Convert.FromBase64String(input);
    return b;
}

static function base64UrlDecodeIntoString(input : String): String
{
    return Encoding.UTF8.GetString(base64UrlDecodeIntoBytes(input));
}

static function getIssueAndExpiryDate() : int[]
{
    var utc0 = DateTime(1970, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc);
    var issueTime = DateTime.UtcNow;

    var iat :int = issueTime.Subtract(utc0).TotalSeconds;
    var exp :int = issueTime.AddMinutes(55).Subtract(utc0).TotalSeconds;

    return [iat, exp];
}
    