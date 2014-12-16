#pragma strict

import System.Collections.Generic;

class MapBaseScript extends MonoBehaviour
{
	var collisionMask : Texture2D;
	var text : TextAsset;
	var bgm : AudioClip;
	var bgmVolume = 1f;
	var ambience1 : AudioClip;
	var ambience1Volume = 1f;
	var ambience2 : AudioClip;
	var ambience2Volume = 1f;

	var currentTime = "Morning"; // HACK: Need to move to a global state manager

	private var obstacles = Dictionary.<String, String>();
	private var objects = Dictionary.<String, String>();
	private var preevents = Dictionary.<String, String>();
	private var postevents = Dictionary.<String, String>();
	private var exits = Dictionary.<String, String>();
	
	var bgmplayer : AudioSource;
	var bgmscript : AudioScript;
	var ambience1player : AudioSource;
	var ambience1script : AudioScript;
	var ambience2player : AudioSource;
	var ambience2script : AudioScript;

	function Awake()
	{
		bgmplayer = GameObject.Find("Background Music").GetComponent(AudioSource);
		bgmscript = GameObject.Find("Background Music").GetComponent(AudioScript);
		ambience1player = GameObject.Find("Ambience 1").GetComponent(AudioSource);
		ambience1script = GameObject.Find("Ambience 1").GetComponent(AudioScript);
		ambience2player = GameObject.Find("Ambience 2").GetComponent(AudioSource);
		ambience2script = GameObject.Find("Ambience 2").GetComponent(AudioScript);
	}

	function OnEnable()
	{
		playBGM();
	}

	function initialise()
	{
		if (!text)
		{
			Debug.Log("WARNNG, no text file found in room: " + name);
			return;
		}
		var resourcePrefix = "audio/";

		var lines = text.text.Split('\n'[0]);
		for (var l=0; l<lines.GetLength(0); l++)
		{
			var line = lines[l].Trim();
			if (line == "")
				continue;

			if (line.StartsWith("BGM"))
			{
				var tokens = line.Split(' '[0]);
				if (tokens[0].EndsWith(currentTime))
				{
					bgm = Resources.Load(resourcePrefix + tokens[1].Trim()) as AudioClip;
					bgmVolume = float.Parse(tokens[2].Trim());
				}
			}
			else if (line.StartsWith("Ambience1"))
			{
				tokens = line.Split(' '[0]);
				if (tokens[0].EndsWith(currentTime))
				{
					ambience1 = Resources.Load(resourcePrefix + tokens[1].Trim()) as AudioClip;
					ambience1Volume = float.Parse(tokens[2].Trim());
				}
			}
			else if (line.StartsWith("Ambience2"))
			{
				tokens = line.Split(' '[0]);
				if (tokens[0].EndsWith(currentTime))
				{
					ambience2 = Resources.Load(resourcePrefix + tokens[1].Trim()) as AudioClip;
					ambience2Volume = float.Parse(tokens[2].Trim());
				}
			}
			else
			{
				tokens = line.Split(':'[0]);
				var nametype = tokens[0].Trim ();
				var val = tokens[1].Trim();
				
				tokens = nametype.Split(' '[0]);
				var type = tokens[0].Trim();
				var name = tokens[tokens.GetLength(0)-1].Trim();

				if (type == "Exit")
				{
					tokens = val.Split('>'[0]);
					var subtokensA = tokens[0].Trim().Split(' '[0]);
					var dest = tokens[1].Trim();
					for (var t=0; t<subtokensA.GetLength(0); t++)
					{
						var coords = subtokensA[t].Trim();
						exits[coords] = name + ' ' + dest;
					}
				}
				else
				{
					tokens = val.Split(' '[0]);
					for (t=0; t<tokens.GetLength(0); t++)
					{
						coords = tokens[t].Trim();
						if (type == "Obstacle")
							obstacles[coords] = name;
						else if (type == "Object")
							objects[coords] = name;
						else if (type == "PreEvent")
							preevents[coords] = name;
						else if (type == "PostEvent")
							postevents[coords] = name;
					}
				}
			}
		}
	}

	function playBGM()
	{
		bgmscript.changeClip(bgm, bgmVolume);
		ambience1script.changeClip(ambience1, ambience1Volume);
		ambience2script.changeClip(ambience2, ambience2Volume);
	}

	function nextChar(character : String, increment : int) : String
	{
		var intValue : int = character[0];
	    var charValue = System.Convert.ToChar(intValue + increment);
	    return System.Convert.ToString(charValue);
	}

	function nextPos(pos : Vector3, direction : String) : Vector3
	{
		var newPos = pos;
		switch (direction)
		{
		case "North":
			newPos.y++;
			break;
		case "South":
			newPos.y--;
			break;
		case "West":
			newPos.x--;
			break;
		case "East":
			newPos.x++;
			break;
		}
		return newPos;
	}

	function getCoords(pos : Vector3) : String
	{
		var x = pos.x;
		var y = pos.y;
		return nextChar('A', x) + (1-y);
	}

	function getCoordsObstacle(pos : Vector3, direction : String) : String
	{
		var x = pos.x;
		var y = pos.y;
		return nextChar('A', x) + (1-y) + "_" + direction;
	}

	function getCoordsObject(pos : Vector3, direction : String) : String
	{
		var newPos = nextPos(pos, direction);
		var x = newPos.x;
		var y = newPos.y;
		return nextChar('A', x) + (1-y) + "_" + direction;
	}

	function isWalkable(pos : Vector3, direction : String) : boolean
	{
		// Check other characters

		// Check obstacles
		if (obstacles.ContainsKey(getCoords(pos)))
			return false;
		if (obstacles.ContainsKey(getCoordsObstacle(pos, direction)))
			return false;

		// Check collision mask
		var x : int = pos.x;
		var y : int = pos.y;
		if (x < 0 || x+1 > collisionMask.width/32 || y > 0 || y-1 < -collisionMask.height/32)
			return false;

		x = (x * 32) + 16;
		y = collisionMask.height + (y * 32) - 16;
		var color = collisionMask.GetPixel(x, y);
		if (color.a == 0)
		{
			return true;
		}
		else if (color.r + color.g + color.b == 0)
		{
			return false;
		}
		else
		{
			if (direction == "North" && color.b > 0f)
				return true;
			if (direction == "East" && color.g > 0.0f && color.g < 0.4f)
				return true;
			if (direction == "South" && color.r > 0f)
				return true;
			if (direction == "West" && color.g > 0.35f)
				return true;
			return false;
		}
	}

	function checkPreEvent(pos : Vector3, direction : String) : String
	{
		var newPos = nextPos(pos, direction);
		var coords = getCoords(newPos);
		if (preevents.ContainsKey(coords))
			return preevents[coords];

		coords = getCoordsObject(pos, direction);
		if (preevents.ContainsKey(coords))
			return preevents[coords];

		return "";
	}

	function checkPostEvent(pos : Vector3, direction : String) : String
	{
		var coords = getCoords(pos);
		if (postevents.ContainsKey(coords))
			return postevents[coords];

		coords = getCoordsObstacle(pos, direction);
		if (postevents.ContainsKey(coords))
			return postevents[coords];

		return "";
	}

	function checkExit(pos : Vector3, direction : String) : String
	{
		var coords = getCoords(pos);
		if (exits.ContainsKey(coords))
			return exits[coords];

		coords = getCoordsObstacle(pos, direction);
		if (exits.ContainsKey(coords))
			return exits[coords];

		return "";
	}

	function checkInteract(pos : Vector3, direction : String) : String
	{
		var coords = getCoords(pos);
		if (objects.ContainsKey(coords))
			return objects[coords];

		coords = getCoordsObject(pos, direction);
		if (objects.ContainsKey(coords))
			return objects[coords];

		return "";
	}
}
