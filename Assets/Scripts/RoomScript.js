#pragma strict

import System.Collections.Generic;

class DoorObject extends Object
{
    var room : RoomScript;
    var gameObject : GameObject;
    var sr : SpriteRenderer;
    var anim : AnimationItem;
    var type : AnimType;
    var state : String; // "Opened" or "Closed"

    var speed = 3.0;
    var defaultSFXPrefix = "audio/SFX/Entrances/";
    var openClip :AudioClip;
    var closeClip :AudioClip;
    var sfxScript :AudioScript;
    var sfxObject : GameObject;
    var openSFXFromStart : boolean;
    var closeSFXFromStart : boolean;
    
    function DoorObject(room_ : RoomScript, gameObject_ : GameObject, sr_ : SpriteRenderer, anim_ : AnimationItem, coords : String, sfx : String[])
    {
        room = room_;
        gameObject = gameObject_;
        sr = sr_;
        anim = anim_;
        type = anim.type;
        state = "Closed";
        setLayerOrder("Closed");
        
        gameObject.transform.position = Grid.getPos(coords);
        sr.sprite = anim.sprites[0, 0];
        
        if (sfx && sfx.Length == 2)
        {
            var tokens = sfx[0].Split('_'[0]);
            var openPath = tokens[0];
            openSFXFromStart = true;
            if (tokens.Length == 2)
                openSFXFromStart = tokens[1] == "Begin";
            if (!openPath.Contains('/'))
                openPath = defaultSFXPrefix + openPath;
            openClip = Resources.Load(openPath) as AudioClip;

            tokens = sfx[1].Split('_'[0]);
            var closePath = tokens[0];
            closeSFXFromStart = false;
            if (tokens.Length == 2)
                closeSFXFromStart = tokens[1] == "Begin";
            if (!closePath.Contains('/'))
                closePath = defaultSFXPrefix + closePath;
            closeClip = Resources.Load(closePath) as AudioClip;
            
            sfxObject = gameObject.Instantiate(MapManagerScript.sfxPrefab);
            sfxObject.transform.parent = MapManagerScript.audioObject.transform;
            sfxObject.name = gameObject.name + "_SFX";
            sfxScript = sfxObject.GetComponent(AudioScript);
        }
        else if (sfx && sfx.Length != 0)
            Debug.LogWarning("Door SFX not set correctly: " + gameObject.name + " in " + room.getPath());
    }

    function setLayerOrder(state : String)
    {
        if (state == "Closed")
        {
            if (anim.type == AnimType.FrontFrontDoor || anim.type == AnimType.FrontBackDoor)
                sr.sortingOrder = 100 + anim.layer;
            else
                sr.sortingOrder = -100 + anim.layer;
        }
        else
        {
            if (anim.type == AnimType.FrontFrontDoor || anim.type == AnimType.BackFrontDoor)
                sr.sortingOrder = 100 + anim.layer;
            else
                sr.sortingOrder = -100 + anim.layer;
        }
    }

   function openDoorInstant()
    {
        room.lastDoorOpened = this;
        setLayerOrder("Opened");
        sr.sprite = anim.sprites[0, anim.sprites.GetLength(1)-1];
        state = "Opened";
    }

    function openDoor()
    {
        return openDoor(1f);
    }
    
    function openDoor(speedModifier : float)
    {
        if (anim && anim.isRunning)
        {
            room.StopCoroutine("anim.run");
            anim.isRunning = false;
            closeDoorInstant();
        }
        if (speedModifier > 0f && state == "Closed")
        {
            if (sfxScript && openClip && openSFXFromStart)
                sfxScript.StartCoroutine(sfxScript.changeClip(openClip, 1f, true, true));
            room.lastDoorOpened = this;
            yield room.StartCoroutine(anim.run(sr, speed * speedModifier, ["Start"]));
            if (sfxScript && openClip && !openSFXFromStart && state == "Closed")
                sfxScript.StartCoroutine(sfxScript.changeClip(openClip, 1f, true, true));
        }
        setLayerOrder("Opened");
        state = "Opened";
        yield;
    }

    function closeDoorInstant()
    {
        setLayerOrder("Closed");
        sr.sprite = anim.sprites[0, 0];
        state = "Closed";
        room.lastDoorClosed = this;
    }

    function closeDoor()
    {
        return closeDoor(1f);
    }
    
    function closeDoor(speedModifier : float)
    {
        if (anim && anim.isRunning)
        {
            room.StopCoroutine("anim.run");
            anim.isRunning = false;
            openDoorInstant();
        }
        setLayerOrder("Closed");
        if (speedModifier > 0f && state == "Opened")
        {
            if (sfxScript && closeClip && closeSFXFromStart)
                sfxScript.StartCoroutine(sfxScript.changeClip(closeClip, 1f, true, true));
            room.lastDoorClosed = this;
            yield room.StartCoroutine(anim.run(sr, speed * speedModifier, ["Stop"]));
            if (sfxScript && closeClip && !closeSFXFromStart && state == "Opened")
                sfxScript.StartCoroutine(sfxScript.changeClip(closeClip, 1f, true, true));
        }
        state = "Closed";
        yield;
    }
}

class RoomScript extends MonoBehaviour
{
	var collisionMask : Texture2D;
	var bgm : AudioClip;
	var bgmVolume = 1f;
	var ambience1 : AudioClip;
	var ambience1Volume = 1f;
	var ambience2 : AudioClip;
	var ambience2Volume = 1f;
    var config : Dictionary.<String, String>;

	private var path : String;

	private var obstacles = Dictionary.<String, String>();
	private var objects = Dictionary.<String, String>();
	private var preevents = Dictionary.<String, String>();
	private var postevents = Dictionary.<String, String>();
	private var exits = Dictionary.<String, String>();
    private var doors = Dictionary.<String, DoorObject>();
    private var people = Dictionary.<String, String>();
    private var peopleAnim = Dictionary.<String, String>();

	private var morning : SpriteRenderer;
	private var afternoon : SpriteRenderer;
	private var evening : SpriteRenderer;
	private var activeOverlay : SpriteRenderer;

    private var resource : ResourceManagerScript;
    private var manager : MapManagerScript;

    var lastDoorOpened : DoorObject;
    var lastDoorClosed : DoorObject;
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
        // Check that script is loaded, and play the room sounds
		if (bgmscript == null)
			return;
        playBGM();

        // Set the collision mask
        CameraScript.instance.setOverlayBlending(activeOverlay != null);
        if (collisionMask)
            CameraScript.instance.setRoomSize(collisionMask.width, collisionMask.height);

        // Set the camera zoom (should only do AFTER setting room size)
        if (gameObject.name.StartsWith("Exterior"))
            CameraScript.instance.setZoom(1.0);
        else
            CameraScript.instance.setZoom(2.0);

        // Ensure the last opened door in this map is closed
		if (lastDoorOpened && lastDoorOpened.gameObject)
        {
			lastDoorOpened.closeDoorInstant();
            lastDoorOpened = null;
        }
        
        // Activate the right NPCs in this room
        manager.disableCharacters();
        for (var k in people.Keys)
        {
            var nameAndSkin = people[k].Split();
            manager.loadCharacter(nameAndSkin[0], k, nameAndSkin[1], peopleAnim[nameAndSkin[0]]);
        }
	}

	function initialise(path_ : String)
	{
		path = path_;
        resource = ResourceManagerScript.instance;
        manager = MapManagerScript.instance;

		bgmplayer = GameObject.Find("Background Music").GetComponent(AudioSource);
		bgmscript = GameObject.Find("Background Music").GetComponent(AudioScript);
		ambience1player = GameObject.Find("Ambience 1").GetComponent(AudioSource);
		ambience1script = GameObject.Find("Ambience 1").GetComponent(AudioScript);
		ambience2player = GameObject.Find("Ambience 2").GetComponent(AudioSource);
		ambience2script = GameObject.Find("Ambience 2").GetComponent(AudioScript);
		morning = gameObject.Find("Ambience-Morning").GetComponent(SpriteRenderer) as SpriteRenderer;
		afternoon = gameObject.Find("Ambience-Afternoon").GetComponent(SpriteRenderer) as SpriteRenderer;
		evening = gameObject.Find("Ambience-Evening").GetComponent(SpriteRenderer) as SpriteRenderer;
		morning.enabled = false;
		afternoon.enabled = false;
		evening.enabled = false;
		activeOverlay = null;
		if (morning.sprite && GameData.instance.current.time == "Morning")
			activeOverlay = morning;
		else if (afternoon.sprite && GameData.instance.current.time == "Afternoon")
			activeOverlay = afternoon;
		else if (evening.sprite && GameData.instance.current.time == "Evening")
			activeOverlay = evening;
		if (activeOverlay)
			activeOverlay.enabled = true;

		if (!config)
		{
			Debug.LogWarning("Room info not found in Central Database for: " + path);
			return;
		}
		var resourcePrefix = "audio/";

        if (config["Music"])
        {
            var music = config["Music"].Split('\n'[0]);
            var musicTime = config["Music Time"].Split('\n'[0]);
            var musicVolume = config["Music Volume"].Split('\n'[0]);
            for (var i=0; i<music.Length; i++)
            {
                if (musicTime[i] != GameData.instance.current.time)
                    continue;
                bgm = Resources.Load(resourcePrefix + "Music/" + music[i]) as AudioClip;
                bgmVolume = float.Parse(musicVolume[i]);
            }
        }

        if (config["Ambiance"])
        {
            var ambiance = config["Ambiance"].Split('\n'[0]);
            var ambianceTime = config["Ambiance Time"].Split('\n'[0]);
            var ambianceVolume = config["Ambiance Volume"].Split('\n'[0]);
            var ambianceCounter = 1;
            for (i=0; i<ambiance.Length; i++)
            {
                if (ambianceTime[i] != GameData.instance.current.time)
                    continue;
                if (ambianceCounter == 1)
                {
                    ambience1 = Resources.Load(resourcePrefix + "Ambiance/" + ambiance[i]) as AudioClip;
                    ambience1Volume = float.Parse(ambianceVolume[i]);
                }
                else if (ambianceCounter == 2)
                {
                    ambience2 = Resources.Load(resourcePrefix + "Ambiance/" + ambiance[i]) as AudioClip;
                    ambience2Volume = float.Parse(ambianceVolume[i]);
                }
                else
                    Debug.LogWarning("Exceeded current limit (2) for Ambiance sounds for: " + path);
                ambianceCounter++;
            }
        }

        if (config["Exit Tile"])
        {
            var exitTile = config["Exit Tile"].Split('\n'[0]);
            var exitDest = config["Exit Dest"].Split('\n'[0]);
            var destTile = config["Dest Tile"].Split('\n'[0]);
            for (i=0; i<exitTile.Length; i++)
            {
                var name = "Exit" + exitDest[i].Replace("/", "") + destTile[i].Replace("_", "");
                exits[exitTile[i]] = name + ' ' + exitDest[i] + " " + destTile[i];
            }
        }

        if (config["NPC"])
        {
            var npc = config["NPC"].Split('\n'[0]);
            var npcTime = config["NPC Time"].Split('\n'[0]);
            var npcTile = config["NPC Tile"].Split('\n'[0]);
            var npcSkin = config["NPC Skin"].Split('\n'[0]);
            var npcAnimation = config["NPC Animation"].Split('\n'[0]);
            for (i=0; i<npc.Length; i++)
            {
                if (npcTime[i] != GameData.instance.current.time)
                    continue;
                people[npcTile[i]] = npc[i] + " " + npcSkin[i];
                peopleAnim[npc[i]] = npcAnimation[i];
            }
        }

        if (config["Trigger Tile"])
        {
            var triggerTile = config["Trigger Tile"].Split('\n'[0]);
            var triggerType = config["Trigger Type"].Split('\n'[0]);
            var triggerScript = config["Trigger Script"].Split('\n'[0]);
            for (i=0; i<triggerTile.Length; i++)
            {
                if (triggerType[i] == "Obstacle")
                    obstacles[triggerTile[i]] = triggerScript[i];
                else if (triggerType[i] == "Object")
                    objects[triggerTile[i]] = triggerScript[i];
                else if (triggerType[i] == "PreEvent")
                    preevents[triggerTile[i]] = triggerScript[i];
                else if (triggerType[i] == "PostEvent")
                    postevents[triggerTile[i]] = triggerScript[i];
            }
        }
		
    	var pnglist = resource.getFilesOfType(path+"/Doors/", ".png");
	    if (pnglist && pnglist.Length > 0)
	    {
            var ss = SpriteSkin(path, path+"/Doors/", pnglist);
            ss.loadTexture();
            for (var k in ss.anims.Keys)
            {
                var d = gameObject.Instantiate(manager.doorPrefab);
                d.transform.parent = transform;
                d.name = "Door " + k;
                var sr : SpriteRenderer = d.GetComponent(SpriteRenderer) as SpriteRenderer;
                var tokens = k.Split('-'[0]);
                var subtokens = tokens[0].Trim().Split('_'[0]);
                var sfx : String[] = null;
                if (tokens.Length > 1)
                    sfx = tokens[1].Trim().Split();
                var badCoords = false;
                for (i=0; i<subtokens.Length; i++)
                {
                    if (!Grid.isValidCoords(subtokens[i]))
                    {
                        Debug.LogWarning("Bad coordinates in door " + path + " -- " + k);
                        badCoords = true;
                        break;
                    }
                }
                if (badCoords)
                    continue;
                var doorObject = DoorObject(this, d, sr, ss.anims[k], subtokens[0], sfx);
                for (i=0; i<subtokens.Length; i++)
                {
                    if (i==0 && subtokens.Length > 1)
                        continue;
                    doors[subtokens[i]] = doorObject;
                }
            }
	    }
	}

    function getPath()
    {
        return path;
    }

	function playBGM()
	{
		bgmscript.changeClip(bgm, bgmVolume);
		ambience1script.changeClip(ambience1, ambience1Volume);
		ambience2script.changeClip(ambience2, ambience2Volume);
	}

	function isWalkable(pos : Vector3, direction : String) : boolean
	{
		// Check other characters
        if (people.ContainsKey(Grid.getCoords(pos)))
            return false;

		// Check obstacles
		if (obstacles.ContainsKey(Grid.getCoords(pos)))
			return false;
		if (obstacles.ContainsKey(Grid.getCoordsDirectional(pos, direction)))
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

    function checkDoorEvent(event : Dictionary.<String, DoorObject>, pos : Vector3, direction : String) : DoorObject
    {
        var coords = Grid.getCoords(pos);
        if (event.ContainsKey(coords))
            return event[coords];

        coords = Grid.getCoordsDirectional(pos, direction);
        if (event.ContainsKey(coords))
            return event[coords];

        return null;
    }

    function checkDoorEnteringEvent(pos : Vector3, direction : String) : DoorObject
    {
        var aheadPos = Grid.nextPos(pos, direction);
        return checkDoorEvent(doors, aheadPos, direction);
    }

    function checkAtDoorEvent(pos : Vector3, direction : String) : DoorObject
    {
        return checkDoorEvent(doors, pos, direction);
    }

    function checkDoorLeftEvent(pos : Vector3, direction : String) : DoorObject
    {
        var previousPos = Grid.previousPos(pos, direction);
        return checkDoorEvent(doors, previousPos, direction);
    }

    function checkGenericEvent(event : Dictionary.<String, String>, pos1 : Vector3, pos2 : Vector3, direction : String) : String
    {
        var coords = Grid.getCoords(pos1);
        if (event.ContainsKey(coords))
            return event[coords];

        coords = Grid.getCoordsDirectional(pos2, direction);
        if (event.ContainsKey(coords))
            return event[coords];

        return "";
    }

	function checkPreEvent(pos : Vector3, direction : String) : String
	{
        var aheadPos = Grid.nextPos(pos, direction);
        return checkGenericEvent(preevents, aheadPos, aheadPos, direction);
	}

	function checkPostEvent(pos : Vector3, direction : String) : String
	{
        return checkGenericEvent(postevents, pos, pos, direction);
	}

	function checkExit(pos : Vector3, direction : String) : String
	{
        return checkGenericEvent(exits, pos, pos, direction);
	}

	function checkInteract(pos : Vector3, direction : String) : String
	{
        var aheadPos = Grid.nextPos(pos, direction);
        return checkGenericEvent(objects, pos, aheadPos, direction);
	}
}