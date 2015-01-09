#pragma strict

static var instance : GameData;
var current : GameDataStore;
var saved : SaveGameList;

function Awake ()
{
    instance = this;
    current = GameDataStore();
//    PlayerPrefs.DeleteAll();
    if (PlayerPrefs.HasKey("SaveGames"))
        saved = ResourceManagerScript.deserialize(PlayerPrefs.GetString("SaveGames")) as SaveGameList;
    else
        saved = SaveGameList();
}

function save(name : String)
{
    saved.dict[name] = SaveGameInfo();
    saved.dict[name].name = name;
    saved.dict[name].date = DateTime.Now;
    saved.dict[name].dateSaved = saved.dict[name].date.ToString();
    saved.dict[name].saveData = ResourceManagerScript.clone(current) as GameDataStore;
    saved.list = new SaveGameInfo[saved.dict.Count];
    var i = 0;
    for (val in saved.dict.Values)
        saved.list[i++] = val;
    PlayerPrefs.SetString("SaveGames", ResourceManagerScript.serialize(saved));
    PlayerPrefs.Save();
//    var f = File.CreateText(Application.dataPath + "/Resources/SaveGame.txt");
//    f.Write(ResourceManagerScript.serialize(info));
//    f.Close();
    Debug.Log(saved.dict[name].dateSaved);
}

function load(name : String)
{
    if (name in saved.dict.Keys)
    {
        Debug.Log(saved.dict[name].dateSaved);
        current = ResourceManagerScript.clone(saved.dict[name].saveData) as GameDataStore;
        // HACK: trigger the rest of the loading process?
    }
    else
    {
        Debug.LogError("Save game " + name + " not found!");
    }
}

@System.Serializable
class SaveGameList extends Object
{
    var dict = Dictionary.<String, SaveGameInfo>();
    var list : SaveGameInfo[];
}

@System.Serializable
class SaveGameInfo extends Object
{
    var name : String;
    var date : Date;
    var dateSaved : String;
    @NonSerialized
    var screenshot : Texture2D;
    @HideInInspector
    var screenshotPixels : byte[];
    var saveData : GameDataStore;
}

@System.Serializable
class GameDataStore extends Object
{
    // Location states
    var time = "Morning";
    var location = "221";
    var room = "Interior/221B/Stairwell";
    var coords = "F2";
    var direction = "South";
    
    // Player stats
    var confidence = 1;
    
    // Past decisions
    var history = Dictionary.<String, String>();
}
