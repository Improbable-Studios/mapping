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

    var name : String;
    var speed = 3.0;
    var openSFX : String;
    var closeSFX : String;
    var openSFXFromStart : boolean;
    var closeSFXFromStart : boolean;
    var defaultSFXPrefix = "SFX/Entrances/";
        
    function DoorObject(room_ : RoomScript, gameObject_ : GameObject, sr_ : SpriteRenderer, anim_ : AnimationItem, coords : String, sfx : String[])
    {
        room = room_;
        gameObject = gameObject_;
        name = room.getPath() + " - " + gameObject.name;
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
            openSFX = defaultSFXPrefix + tokens[0];
            openSFXFromStart = true;
            if (tokens.Length == 2)
                openSFXFromStart = tokens[1] == "Begin";

            tokens = sfx[1].Split('_'[0]);
            closeSFX = defaultSFXPrefix + tokens[0];
            closeSFXFromStart = false;
            if (tokens.Length == 2)
                closeSFXFromStart = tokens[1] == "Begin";
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
            if (openSFX != "" && openSFXFromStart)
                AudioManagerScript.instance.playSFX(name, openSFX, 1f);
            room.lastDoorOpened = this;
            yield room.StartCoroutine(anim.run(sr, speed * speedModifier, ["Start"]));
            if (openSFX != "" && !openSFXFromStart && state == "Closed")
                AudioManagerScript.instance.playSFX(name, openSFX, 1f);
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
            if (closeSFX != "" && closeSFXFromStart)
                AudioManagerScript.instance.playSFX(name, closeSFX, 1f);
            room.lastDoorClosed = this;
            yield room.StartCoroutine(anim.run(sr, speed * speedModifier, ["Stop"]));
            if (closeSFX != "" && !closeSFXFromStart && state == "Opened")
                AudioManagerScript.instance.playSFX(name, closeSFX, 1f);
        }
        state = "Closed";
        yield;
    }
}

class RoomScript extends MonoBehaviour
{
	var collisionMask : Texture2D;
	var bgm : String;
	var bgmVolume : float;
	var ambianceNames : String[];
	var ambianceVolumes : float[];
    var config : Dictionary.<String, String>;

	private var path : String;
    private var ready : boolean;

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

	function Awake()
	{
	}

	function OnEnable()
	{
        // Check that script is loaded, and play the room sounds
        if (!ready || !path || path == "")
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
        
        // Activate the right NPCs in this room
        for (var k in people.Keys)
        {
            var nameAndSkin = people[k].Split();
            manager.loadCharacter(nameAndSkin[0], k, nameAndSkin[1], peopleAnim[nameAndSkin[0]]);
        }
	}

    function OnDisable()
    {
        if (!ready || !path || path == "")
            return;

        CameraScript.instance.setOverlayBlending(false);

        if (lastDoorOpened && lastDoorOpened.gameObject)
        {
            lastDoorOpened.closeDoorInstant();
            lastDoorOpened = null;
        }
        
        manager.disableCharacters();
        AudioManagerScript.instance.onRoomLeave();
    }

	function initialise(path_ : String)
	{
		path = path_;
        ready = false;
        resource = ResourceManagerScript.instance;
        manager = MapManagerScript.instance;

        bgm = "";
        bgmVolume = 1f;
		morning = transform.Find("Ambience-Morning").GetComponent(SpriteRenderer) as SpriteRenderer;
		afternoon = transform.Find("Ambience-Afternoon").GetComponent(SpriteRenderer) as SpriteRenderer;
		evening = transform.Find("Ambience-Evening").GetComponent(SpriteRenderer) as SpriteRenderer;
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
                bgm = "Music/" + music[i];
                bgmVolume = float.Parse(musicVolume[i]);
            }
        }

        if (config["Ambiance"])
        {
            var ambiance = config["Ambiance"].Split('\n'[0]);
            var ambianceTime = config["Ambiance Time"].Split('\n'[0]);
            var ambianceVolume = config["Ambiance Volume"].Split('\n'[0]);
            var ambianceCounter = 0;
            for (i=0; i<ambiance.Length; i++)
            {
                if (ambianceTime[i] == GameData.instance.current.time)
                    ambianceCounter++;
            }
            ambianceNames = new String[ambianceCounter];
            ambianceVolumes = new float[ambianceCounter];
            ambianceCounter = 0;
            for (i=0; i<ambiance.Length; i++)
            {
                if (ambianceTime[i] == GameData.instance.current.time)
                {
                    ambianceNames[ambianceCounter] = "Ambiance/" + ambiance[i];
                    ambianceVolumes[ambianceCounter] = float.Parse(ambianceVolume[i]);
                    ambianceCounter++;
                }
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

    function setReady(flag : boolean)
    {
        ready = flag;
    }

	function playBGM()
	{
        AudioManagerScript.instance.playBGM(bgm, bgmVolume);
        AudioManagerScript.instance.playAmbiances(ambianceNames, ambianceVolumes);        
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
