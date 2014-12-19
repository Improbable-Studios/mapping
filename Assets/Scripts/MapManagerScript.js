#pragma strict

import System.Collections.Generic;
import System.IO;
import SimpleJSON;


class MapManagerScript extends MonoBehaviour
{
    static var instance : MapManagerScript;

	var pathToMaps = "maps";
	var preLoadAllMaps = true;
	var rooms : GameObject;
	var roomPrefab : GameObject;

	var locations = Dictionary.<String, Dictionary.<String, GameObject> >();
	
	var currentLocation = "221"; // HACK: Need to move to global state manager
	var currentRoom = "Interior/221B/Stairwell"; // HACK: Need to move to global state manager
	
	private var resource : ResourceManagerScript;

	function Awake ()
	{
        instance = this;
		resource = ResourceManagerScript.instance;
	    for (dir in resource.getDirectoriesInPath(pathToMaps))
	    {
	    	locations[dir] = new Dictionary.<String, GameObject>();
	    	recursiveInitRooms(dir, "");
//	    	Debug.Log("LOCATION: " + dir + " " + locations[dir].Count + " rooms");
	    }
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

	function loadRoom(roomName : String, resourcePrefix : String, customScriptName : String)
	{
		var pivot : Vector2 = Vector2(0f, 0f); //top left;
    	var backTexture : Texture2D = Resources.Load(resourcePrefix + "/Layers/back") as Texture2D;
    	var frontTexture : Texture2D = Resources.Load(resourcePrefix + "/Layers/front") as Texture2D;
    	var collisionTexture : Texture2D = Resources.Load(resourcePrefix + "/Layers/collision") as Texture2D;
    	var morningTexture : Texture2D = Resources.Load(resourcePrefix + "/Layers/Ambience-Morning") as Texture2D;
    	var afternoonTexture : Texture2D = Resources.Load(resourcePrefix + "/Layers/Ambience-Afternoon") as Texture2D;
    	var eveningTexture : Texture2D = Resources.Load(resourcePrefix + "/Layers/Ambience-Evening") as Texture2D;
    	var configText : TextAsset = Resources.Load(resourcePrefix + "/config") as TextAsset;
		var rect = Rect(0f, backTexture.height, backTexture.width, -backTexture.height);
		var r = rooms.Instantiate(roomPrefab);
		r.Find("back").GetComponent(SpriteRenderer).sprite = Sprite.Create(backTexture, rect, pivot, 32);
		r.Find("front").GetComponent(SpriteRenderer).sprite = Sprite.Create(frontTexture, rect, pivot, 32);
		if (morningTexture)
			r.Find("Ambience-Morning").GetComponent(SpriteRenderer).sprite = Sprite.Create(morningTexture, rect, pivot, 32);
		if (afternoonTexture)
			r.Find("Ambience-Afternoon").GetComponent(SpriteRenderer).sprite = Sprite.Create(afternoonTexture, rect, pivot, 32);
		if (eveningTexture)
			r.Find("Ambience-Evening").GetComponent(SpriteRenderer).sprite = Sprite.Create(eveningTexture, rect, pivot, 32);

		if (System.Type.GetType(customScriptName))
		{
			GameObject.DestroyImmediate(r.GetComponent(MapBaseScript));
			r.AddComponent(customScriptName);
			var script : MapBaseScript = r.GetComponent(customScriptName) as MapBaseScript;
		}
		else
			script = r.GetComponent(MapBaseScript);
		script.collisionMask = collisionTexture;
		script.text = configText;
		script.initialise(resourcePrefix);
		r.SetActive(false);
		r.transform.parent = rooms.transform;
		r.name = roomName;
		return r;
	}

	function loadLocation(loc : String)
	{
		var childs : int = rooms.transform.childCount;
		for (var i = childs - 1; i >= 0; i--)
			GameObject.DestroyImmediate(rooms.transform.GetChild(i).gameObject);
		currentLocation = loc;

		var pivot : Vector2 = Vector2(0f, 0f); //top left;
		var newRooms = new Dictionary.<String, GameObject>();
		for (k in locations[loc].Keys)
		{
		    var resourcePrefix = pathToMaps + "/" + currentLocation + "/" + k;
			var customScriptName = "Map" + currentLocation + k.Replace("/", "");		
			newRooms[k] = loadRoom(k, resourcePrefix, customScriptName);
		}
		locations[loc] = newRooms;
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
		var res = new String[locations[currentLocation].Count];
		var i = 0;
		for (var k in locations[currentLocation].Keys)
		{
			res[i] = k;
			i++;
		}
		return res;
	}

	function isRoomExist(room : String)
	{
		return locations[currentLocation].ContainsKey(room);
	}

	function getRoomObject()
	{
		return getRoomObject(currentRoom);
	}

	function getRoomObject(room : String)
	{
		return locations[currentLocation][room];
	}
}