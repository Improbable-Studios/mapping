#pragma strict

import System.Collections.Generic;

class DoorObject extends Object
{
    var map : MapBaseScript;
    var gameObject : GameObject;
    var sr : SpriteRenderer;
    var anim : AnimationItem;
    var type : AnimType;
    var state : String; // "Opened" or "Closed"

    var speed = 5.0;
    
    function DoorObject(map_ : MapBaseScript, gameObject_ : GameObject, sr_ : SpriteRenderer, anim_ : AnimationItem, coords : String)
    {
        map = map_;
        gameObject = gameObject_;
        sr = sr_;
        anim = anim_;
        type = anim.type;
        state = "Closed";
        setLayerOrder("Closed");
        
        var x : int = coords[0];
        var a : int = 'A'[0];
        x -= a;
        var y : int = int.Parse(coords[1:]);
        var newPos = gameObject.transform.position;
        newPos.x = x;
        newPos.y = -y + 1;
        gameObject.transform.position = newPos;
        sr.sprite = anim.sprites[0, 0];
    }

    function setLayerOrder(state : String)
    {
        if (state == "Closed")
        {
            if (anim.type == AnimType.FrontFrontDoor || anim.type == AnimType.FrontBackDoor)
                sr.sortingOrder = 1;
            else
                sr.sortingOrder = -1;
        }
        else
        {
            if (anim.type == AnimType.FrontFrontDoor || anim.type == AnimType.BackFrontDoor)
                sr.sortingOrder = 1;
            else
                sr.sortingOrder = -1;
        }
    }

    function openDoor()
    {
        return openDoor(1f);
    }
    
    function openDoor(speedModifier : float)
    {
        if (speedModifier == 0)
        {
            sr.sprite = anim.sprites[0, anim.sprites.GetLength(1)-1];
        }
        else if (state == "Closed")
        {
            if (anim && anim.isRunning)
            {
                yield map.StartCoroutine(anim.stop());
    //          map.StopAllCoroutines();
                anim.isRunning = false;
            }
            yield map.StartCoroutine(anim.run(sr, speed * speedModifier, ["Start"]));
        }
        setLayerOrder("Opened");
        state = "Opened";
        yield;
    }

    function closeDoor()
    {
        return closeDoor(1f);
    }
    
    function closeDoor(speedModifier : float)
    {
        setLayerOrder("Closed");
        if (speedModifier == 0)
        {
            sr.sprite = anim.sprites[0, 0];
        }
        else if (state == "Opened")
        {
            if (anim && anim.isRunning)
            {
                yield map.StartCoroutine(anim.stop());
    //          map.StopAllCoroutines();
                anim.isRunning = false;
            }
            yield map.StartCoroutine(anim.run(sr, speed * speedModifier, ["Stop"]));
        }
        state = "Closed";
        yield;
    }
}

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

	private var currentTime = "Evening"; // HACK: Need to move to a global state manager

	private var path : String;

	private var obstacles = Dictionary.<String, String>();
	private var objects = Dictionary.<String, String>();
	private var preevents = Dictionary.<String, String>();
	private var postevents = Dictionary.<String, String>();
	private var exits = Dictionary.<String, String>();
	private var doors = Dictionary.<String, DoorObject>();

	private var morning : SpriteRenderer;
	private var afternoon : SpriteRenderer;
	private var evening : SpriteRenderer;
	private var activeOverlay : SpriteRenderer;
	private var shaderOutput : GameObject;
	private var resource : ResourceManagerScript;
    private var doorPrefab : GameObject;


	var bgmplayer : AudioSource;
	var bgmscript : AudioScript;
	var ambience1player : AudioSource;
	var ambience1script : AudioScript;
	var ambience2player : AudioSource;
	var ambience2script : AudioScript;

	function Awake()
	{
	}

	function OnEnable()
	{
		if (shaderOutput == null)
			return;
		if (activeOverlay)
			shaderOutput.SetActive(true);
		else
			shaderOutput.SetActive(false);
		playBGM();
	}

	function initialise(path_ : String)
	{
		path = path_;

		bgmplayer = GameObject.Find("Background Music").GetComponent(AudioSource);
		bgmscript = GameObject.Find("Background Music").GetComponent(AudioScript);
		ambience1player = GameObject.Find("Ambience 1").GetComponent(AudioSource);
		ambience1script = GameObject.Find("Ambience 1").GetComponent(AudioScript);
		ambience2player = GameObject.Find("Ambience 2").GetComponent(AudioSource);
		ambience2script = GameObject.Find("Ambience 2").GetComponent(AudioScript);
		shaderOutput = gameObject.Find("Shader Output");
        doorPrefab = Resources.Load("DoorPrefab") as GameObject;
        resource = gameObject.Find("Manager").GetComponent(ResourceManagerScript) as ResourceManagerScript;
		morning = gameObject.Find("Ambience-Morning").GetComponent(SpriteRenderer) as SpriteRenderer;
		afternoon = gameObject.Find("Ambience-Afternoon").GetComponent(SpriteRenderer) as SpriteRenderer;
		evening = gameObject.Find("Ambience-Evening").GetComponent(SpriteRenderer) as SpriteRenderer;
		morning.enabled = false;
		afternoon.enabled = false;
		evening.enabled = false;
		activeOverlay = null;
		if (morning.sprite && currentTime == "Morning")
			activeOverlay = morning;
		else if (afternoon.sprite && currentTime == "Afternoon")
			activeOverlay = afternoon;
		else if (evening.sprite && currentTime == "Evening")
			activeOverlay = evening;
		if (activeOverlay)
			activeOverlay.enabled = true;

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
		
    	var pnglist = resource.getFilesOfType(path+"/Doors/", ".png");
	    if (pnglist && pnglist.Length > 0)
	    {
            var ss = SpriteSkin(path, path+"/Doors/", pnglist);
            ss.loadTexture();
            for (var k in ss.anims.Keys)
            {
                var d = gameObject.Instantiate(doorPrefab);
                d.transform.parent = transform;
                d.name = "Door " + k;
                var sr : SpriteRenderer = d.GetComponent(SpriteRenderer) as SpriteRenderer;
                tokens = k.Split('_'[0]);
                var doorObject = DoorObject(this, d, sr, ss.anims[k], tokens[0]);
                for (var i=0; i<tokens.Length; i++)
                {
                    if (i==0 && tokens.Length > 1)
                        continue;
                    doors[tokens[i]] = doorObject;
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

    function previousPos(pos : Vector3, direction : String) : Vector3
    {
        var newPos = pos;
        switch (direction)
        {
        case "North":
            newPos.y--;
            break;
        case "South":
            newPos.y++;
            break;
        case "West":
            newPos.x++;
            break;
        case "East":
            newPos.x--;
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

    function checkDoorEnteringEvent(pos : Vector3, direction : String) : DoorObject
    {
        var newPos = nextPos(pos, direction);
        var coords = getCoords(newPos);
        if (doors.ContainsKey(coords))
            return doors[coords];

        coords = getCoordsObject(pos, direction);
        if (doors.ContainsKey(coords))
            return doors[coords];

        return null;
    }

    function checkAtDoorEvent(pos : Vector3, direction : String) : DoorObject
    {
        var coords = getCoords(pos);
        if (doors.ContainsKey(coords))
            return doors[coords];

        coords = getCoordsObstacle(pos, direction);
        if (doors.ContainsKey(coords))
            return doors[coords];

        return null;
    }

    function checkDoorLeftEvent(pos : Vector3, direction : String) : DoorObject
    {
        var newPos = previousPos(pos, direction);
        var coords = getCoords(newPos);
        if (doors.ContainsKey(coords))
            return doors[coords];

        coords = getCoordsObject(pos, direction);
        if (doors.ContainsKey(coords))
            return doors[coords];

        return null;
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
