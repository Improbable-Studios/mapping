#pragma strict

import System.Collections.Generic;
import System.IO;
import SimpleJSON;


class MapManagerScript extends MonoBehaviour
{
    static var instance : MapManagerScript;
    static var roomsObject : GameObject;
    static var charactersObject : GameObject;
    static var shaderOutput : GameObject;
    static var shaderCamera : GameObject;
    static var roomPrefab : GameObject;
    static var characterPrefab : GameObject;
    static var doorPrefab : GameObject;
    
	var pathToMaps = "maps";
	var preLoadAllMaps = true;

    var locations = Dictionary.<String, Dictionary.<String, GameObject> >();
    var characters = Dictionary.<String, GameObject>();
    var characterScripts = Dictionary.<String, CharacterScript>();
    var entrees = Dictionary.<String, String>();

	private var resource : ResourceManagerScript;

	function Awake ()
	{
        instance = this;
		resource = ResourceManagerScript.instance;
	    for (dir in resource.getDirectoriesInPath(pathToMaps))
	    {
	    	locations[dir] = new Dictionary.<String, GameObject>();
	    	recursiveInitRooms(dir, "");
            var row = resource.locationsTab.getRowDict(dir + "/Exterior");
            if (row)
            {
                var exitDest = row["Exit Dest"].Split('\n'[0]);
                var destTile = row["Dest Tile"].Split('\n'[0]);
                for (var i=0; i<exitDest.Length; i++)
                {
                    if (exitDest[i] == "London")
                        entrees[dir] = destTile[i];
                }
            }
//            if (dir in entrees)
//                Debug.Log(dir + " -- " + entrees[dir]);
//	    	Debug.Log("LOCATION: " + dir + " " + locations[dir].Count + " rooms");
	    }
        roomsObject = GameObject.Find("Rooms");
        charactersObject = GameObject.Find("Characters");
        shaderOutput = GameObject.Find("Shader Output");
        shaderCamera = GameObject.Find("Shader Cameras");
        characterPrefab = Resources.Load("CharacterPrefab") as GameObject;
        roomPrefab = Resources.Load("RoomPreFab") as GameObject;
        doorPrefab = Resources.Load("DoorPrefab") as GameObject;
    }

	function Start ()
	{
	}

	function recursiveInitRooms(loc : String, currentPath : String)
	{
	    var pngpath = pathToMaps + "/" + loc + "/" + currentPath + "/Layers/";
    	var pnglist = resource.getFilesOfType(pngpath, ".png");
	    if (pnglist && pnglist.Length > 0)
	    {
	    	var roomName = currentPath.Trim("/"[0]);
	    	locations[loc][roomName] = null;
	   	}

	    var roomspath = pathToMaps + "/" + loc + "/" + currentPath;
	    var roomslist = resource.getDirectoriesInPath(roomspath);
	    if (roomslist)
	    {
		    for (subdir in roomslist)
		    	recursiveInitRooms(loc, currentPath + "/" + subdir);
	    }
	}

	function loadRoom(roomName : String)
	{
        var roomID = GameData.instance.current.location + "/" + roomName;
        var resourcePrefix = pathToMaps + "/" + roomID;
        var customScriptName = "Room" + roomID.Replace("/", ""); 

		var pivot : Vector2 = Vector2(0f, 0f); //top left;
    	var backTexture : Texture2D = Resources.Load(resourcePrefix + "/Layers/back") as Texture2D;
    	var frontTexture : Texture2D = Resources.Load(resourcePrefix + "/Layers/front") as Texture2D;
    	var collisionTexture : Texture2D = Resources.Load(resourcePrefix + "/Layers/collision") as Texture2D;
    	var morningTexture : Texture2D = Resources.Load(resourcePrefix + "/Layers/Ambience-Morning") as Texture2D;
    	var afternoonTexture : Texture2D = Resources.Load(resourcePrefix + "/Layers/Ambience-Afternoon") as Texture2D;
    	var eveningTexture : Texture2D = Resources.Load(resourcePrefix + "/Layers/Ambience-Evening") as Texture2D;
    	var config : Dictionary.<String, String> = ResourceManagerScript.locationsTab.getRowDict(roomID);
		var rect = Rect(0f, backTexture.height, backTexture.width, -backTexture.height);
		var r = roomsObject.Instantiate(roomPrefab);
		r.transform.Find("back").GetComponent(SpriteRenderer).sprite = Sprite.Create(backTexture, rect, pivot, 32);
		r.transform.Find("front").GetComponent(SpriteRenderer).sprite = Sprite.Create(frontTexture, rect, pivot, 32);
		if (morningTexture)
			r.transform.Find("Ambience-Morning").GetComponent(SpriteRenderer).sprite = Sprite.Create(morningTexture, rect, pivot, 32);
		if (afternoonTexture)
			r.transform.Find("Ambience-Afternoon").GetComponent(SpriteRenderer).sprite = Sprite.Create(afternoonTexture, rect, pivot, 32);
		if (eveningTexture)
			r.transform.Find("Ambience-Evening").GetComponent(SpriteRenderer).sprite = Sprite.Create(eveningTexture, rect, pivot, 32);

		if (System.Type.GetType(customScriptName))
		{
			GameObject.DestroyImmediate(r.GetComponent(RoomScript));
			r.AddComponent(customScriptName);
			var script : RoomScript = r.GetComponent(customScriptName) as RoomScript;
		}
		else
			script = r.GetComponent(RoomScript);
		script.collisionMask = collisionTexture;
		script.config = config;
		script.initialise(resourcePrefix);
		r.SetActive(false);
		r.transform.parent = roomsObject.transform;
		r.name = roomName;
		return r;
	}

	function loadLocation(loc : String)
	{
		var childs : int = roomsObject.transform.childCount;
		for (var i = childs - 1; i >= 0; i--)
			GameObject.DestroyImmediate(roomsObject.transform.GetChild(i).gameObject);
        AudioManagerScript.instance.onLocationLeave();
		GameData.instance.current.location = loc;

        if (preLoadAllMaps)
        {
    		var newRooms = new Dictionary.<String, GameObject>();
    		for (k in locations[loc].Keys)
    		{
    			newRooms[k] = loadRoom(k);
    		}
    		locations[loc] = newRooms;
        }
	}

	function listOfLocations()
	{
		var res = new String[locations.Count];
		var i = 0;
		for (var k in locations.Keys)
		{
			res[i] = k;
			i++;
		}
		return res;
	}

	function listOfRooms()
	{
		var res = new String[locations[GameData.instance.current.location].Count];
		var i = 0;
		for (var k in locations[GameData.instance.current.location].Keys)
		{
			res[i] = k;
			i++;
		}
		return res;
	}

	function isRoomExist(room : String)
	{
		return locations[GameData.instance.current.location].ContainsKey(room);
	}

	function getRoomObject()
	{
		return getRoomObject(GameData.instance.current.room);
	}

	function getRoomObject(room : String)
	{
        if (isRoomExist(room))
        {
    		var obj = locations[GameData.instance.current.location][room];
            if (obj == null)
                locations[GameData.instance.current.location][room] = loadRoom(room);
            return locations[GameData.instance.current.location][room];
        }
        else
            Debug.LogError("Cannot get non-existant room: " + room);
	}

    function onLeaveRoom(roomObj : GameObject)
    {
        if (!preLoadAllMaps)
            Destroy(roomObj);
    }

    function loadCharacter(name : String, coords : String, skin : String, animation : String)
    {
        if (characters.ContainsKey(name))
        {
            var c : GameObject = characters[name];
            var cs : CharacterScript = characterScripts[name];
        }
        else
        {
            c = charactersObject.Instantiate(characterPrefab);
            c.transform.parent = charactersObject.transform;
            c.name = name;
            cs = c.GetComponent(CharacterScript) as CharacterScript;
            characters[name] = c;
            characterScripts[name] = cs;
        }
        c.SetActive(true);
        cs.setCharacter(name, coords, skin, animation);
        cs.setVisible(true);
        return cs;
    }
    
    function getCharacterObject(name : String)
    {
        if (characters.ContainsKey(name))
            return characters[name];
        else
            return null;
    }

    function getCharacterScript(name : String)
    {
        if (characterScripts.ContainsKey(name))
            return characterScripts[name];
        else
            return null;
    }

    function disableCharacters()
    {
        if (preLoadAllMaps)
        {
            for (var c in characters.Values)
                c.SetActive(false);
        }
        else
        {
             for (k in List.<String>(characters.Keys))
             {
                var c = characters[k];
                characters.Remove(k);
                characterScripts.Remove(k);
                Destroy(c);
             }
        }
    }
}