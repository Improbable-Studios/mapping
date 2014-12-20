#pragma strict

import System.Collections.Generic;
import System.IO;
import SimpleJSON;

enum AnimType{  Forward,        Directional,    Moving,         Idle,
                FrontFrontDoor, FrontBackDoor,  BackFrontDoor,  BackBackDoor,
                ERROR};
enum IdleType{	FacingSouthLookRight, 	FacingSouthLookAhead, 	FacingSouthLookLeft,
				FacingWestLookLeft, 	FacingWestLookAhead, 	FacingWestLookRight,
				FacingNorthLookLeft, 	FacingNorthLookAhead, 	FacingNorthLookRight,
				FacingEastLookRight, 	FacingEastLookAhead, 	FacingEastLookLeft};

class AnimationItem extends Object
{
	var framesPerSecond = 5.0;
	var isRunning = false;
	var breakRepeat = false;
	var breakRepeatAfterFinish = false;

	var name : String;
	var type : AnimType;
	var spriteSize : Vector2;
	var sprites : Sprite[,];
	var row : int;

    // Doors
    var layer : int;

	// Forward & Directional
	var types : Array;
	var progressive : int[];
	var stepping : int[];
	var repeating : int[];

	// Directional prefixes
	var south : int;
	var west : int;
	var north : int;
	var east : int;

	// Moving
	var alternateMove = false;
	var move1 : int[];
	var move2 : int[];

	// Idle
	var rowU : int;
	var rowF : int;
	var rowD : int;

	function AnimationItem(name_ : String, type_: String, spriteSize_ : Vector2, sprites_ : Sprite[,], row_ : int)
	{
		name = name_;
		spriteSize = spriteSize_;
		sprites = sprites_;
		row = row_;
        layer = 0;

		if (row+1 > sprites.GetLength(0))
		{
			type = AnimType.ERROR;
			Debug.Log("WARNING: Animation row size incorrect -- " + name_);
			return;
		}

		types = new Array();
		progressive = null;
		stepping = null;
		repeating = null;

		move1 = null;
		move2 = null;
		
		rowU = 1;
		rowF = 1;
		rowD = 1;

		south = 0;
		west = 0;
		north = 0;
		east = 0;

		if (type_ == "Forward")
			type = AnimType.Forward;
		else if (type_ == "Directional")
			type = AnimType.Directional;
		else if (type_ == "Moving")
			type = AnimType.Moving;
		else if (type_ == "Idle")
			type = AnimType.Idle;
        else if (type_ == "Front" || type_.StartsWith("Front+") ||type_.StartsWith("FrontFront"))
            type = AnimType.FrontFrontDoor;
        else if (type_.StartsWith("FrontBack"))
            type = AnimType.FrontBackDoor;
        else if (type_.StartsWith("BackFront"))
            type = AnimType.BackFrontDoor;
        else if (type_ == "Back" ||  type_.StartsWith("Back+") || type_.StartsWith("BackBack"))
            type = AnimType.BackBackDoor;
		else
		{
			type = AnimType.ERROR;
			Debug.Log("WARNING: This animation type is not known - " + name);
			return;
		}

		if (type == AnimType.Forward || type == AnimType.Directional)
		{
			var tokens = name.Split('_'[0]);
			name = tokens[0];
			var currentIndex = 0;
			for (t in tokens[1:])
			{
				var val : int = int.Parse(t[1:]);
				var indexArray = new int[val];
				for (var i=0; i<val; i++)
					indexArray[i] = currentIndex + i;
				currentIndex += val;
				if (t[0] == 'P'[0])
					progressive = indexArray;
				else if (t[0] == 'S'[0])
					stepping = indexArray;
				else if (t[0] == 'R'[0])
					repeating = indexArray;
				else
				{
					type = AnimType.ERROR;
					Debug.Log("WARNING: Can't parse Forward/Idle animation info -- " + name_);
					return;
				}
			}
			if (type == AnimType.Forward && sprites.GetLength(1) != currentIndex)
			{
				type = AnimType.ERROR;
				Debug.Log("WARNING: Forward animation incorrect number of columns -- " + name_);
				return;
			}
			if (type == AnimType.Directional && sprites.GetLength(1) != currentIndex * 4)
			{
				type = AnimType.ERROR;
				Debug.Log("WARNING: Directional animation incorrect number of columns -- " + name_);
				return;
			}

			if (progressive != null)
			{
				types.Add("Start");
				types.Add("Stop");
			}
			if (stepping != null || repeating != null)
			{
				types.Add("Loop");
				types.Add("Hold");
			}
		}

		if (type == AnimType.Idle)
		{
			if (sprites.GetLength(1) != 12)
			{
				type = AnimType.ERROR;
				Debug.Log("WARNING: Idle animation incorrect number of columns -- " + name_);
				return;
			}
			tokens = name.Split('_'[0]);
			name = tokens[0];
//			var rowsize = tokens[1].Length;
			var rowsize = 3;
			if (rowsize * (row+1) > sprites.GetLength(0))
			{
				type = AnimType.ERROR;
				Debug.Log("WARNING: Idle animation row size incorrect -- " + name_);
				return;
			}
			currentIndex = 0;
			for (c in tokens[1])
			{
//				if (c == 'U'[0])
//					rowU = row * rowsize + currentIndex;
//				else if (c == 'F'[0])
//					rowF = row * rowsize + currentIndex;
//				else if (c == 'D'[0])
//					rowD = row * rowsize + currentIndex;
				if (c == 'U'[0])
					rowU = row * rowsize + 0;
				else if (c == 'F'[0])
					rowF = row * rowsize + 1;
				else if (c == 'D'[0])
					rowD = row * rowsize + 2;
				else
				{
					type = AnimType.ERROR;
					Debug.Log("WARNING: Can't parse Idle animation info -- " + name_);
					return;
				}
				currentIndex++;
			}
		}

		if (type == AnimType.Moving)
		{
			if (sprites.GetLength(1) != 12)
			{
				type = AnimType.ERROR;
				Debug.Log("WARNING: Moving animation incorrect number of columns -- " + name_);
				return;
			}
			move1 = [1, 0, 0, 1];
			move2 = [1, 2, 2, 1];
		}

		if (type == AnimType.Directional || type == AnimType.Moving)
		{
			var size : int = sprites.GetLength(1) / 4;
			south = 0;
			west = size;
			north = size * 2;
			east = size * 3;
		}

        if (type == AnimType.FrontFrontDoor || type == AnimType.FrontBackDoor || type == AnimType.BackFrontDoor || type == AnimType.BackBackDoor)
        {
            for (var c in type_)
            {
                if (c == '+'[0])
                    layer++;
            }
            indexArray = new int[sprites.GetLength(1)];
            for (i=0; i < sprites.GetLength(1); i++)
                indexArray[i] = i;
            progressive = indexArray;
            types.Add("Start");
            types.Add("Stop");
        }

	}

	function run(sr : SpriteRenderer, speed : float, options : String[])
	{
		if (isRunning)
		{
			Debug.Log("WARNING: Overlapped animations -- " + name);
			yield;
			return;
		}
		isRunning = true;
		breakRepeat = false;

		var wait = 1.0 / (speed * framesPerSecond);
		var time = Time.time;

		var index_prefix = 0;
		if (type == AnimType.Moving || type == AnimType.Directional)
		{
			if ("Random" in options)
				index_prefix = [south, west, north, east][Random.Range(0, 4)];
			else if ("West" in options)
				index_prefix = west;
			else if ("North" in options)
				index_prefix = north;
			else if ("East" in options)
				index_prefix = east;
			else
				index_prefix = south;
		}

		if (type == AnimType.Idle)
		{
			var enumName : String = "Facing";
			if ("Random" in options)
				enumName += ["South", "West", "North", "East"][Random.Range(0, 4)];
			else if ("West" in options)
				enumName += "West";
			else if ("North" in options)
				enumName += "North";
			else if ("East" in options)
				enumName += "East";
			else
				enumName += "South";

			enumName += "Look";
			if ("Random" in options)
				enumName += ["Ahead", "Left", "Right"][Random.Range(0, 3)];
			else if ("Left" in options)
				enumName += "Left";
			else if ("Right" in options)
				enumName += "Right";
			else
				enumName += "Ahead";

			var col_index : int = IdleType.Parse(IdleType, enumName);

			var row_index = 0;
			if ("Random" in options)
				row_index = [rowU, rowF, rowD][Random.Range(0, 3)];
			else if ("Up" in options)
				row_index = rowU;
			else if ("Down" in options)
				row_index = rowD;
			else
				row_index = rowF;

			sr.sprite = sprites[row_index, col_index];
		}
		else if (type == AnimType.Forward || type == AnimType.Directional || type == AnimType.FrontFrontDoor || type == AnimType.FrontBackDoor || type == AnimType.BackFrontDoor || type == AnimType.BackBackDoor)
		{
			if ("Random" in options)
			{
				if (types.length > 0)
 					options[0] = types[Random.Range(0, types.length)] as String;
			}

			if ("Start" in options)
			{
				for (var i=0; i<progressive.Length && !breakRepeat; i++)
				{
					sr.sprite = sprites[row, index_prefix + progressive[i]];
					yield WaitForSeconds(wait - (Time.time-time) % wait);
				}
			}
			else if ("Stop" in options)
			{
				for (i=progressive.Length-1; i>=0 && !breakRepeat; i--)
				{
					sr.sprite = sprites[row, index_prefix + progressive[i]];
					yield WaitForSeconds(wait - (Time.time-time) % wait);
				}
			}
			else if ("Loop" in options)
			{
				var ranAtLeastOnce = false;
				i = 0;
				if (repeating != null)
				{
					while (!breakRepeat)
					{
						sr.sprite = sprites[row, index_prefix + repeating[i]];
						yield WaitForSeconds(wait - (Time.time-time) % wait);

						if (breakRepeatAfterFinish && i==0 && ranAtLeastOnce)
							break;
						ranAtLeastOnce = true;

						i++;
						if (i >= repeating.Length)
							i = 0;
					}
				}
				else if (stepping != null)
				{
					var index_increment = 1;
					while (!breakRepeat)
					{
						sr.sprite = sprites[row, index_prefix + stepping[i]];
						yield WaitForSeconds(wait - (Time.time-time) % wait);

						if (breakRepeatAfterFinish && i==0 && ranAtLeastOnce)
							break;
						ranAtLeastOnce = true;
	
						i = i + index_increment;
						if (i >= stepping.Length)
						{
							i = stepping.Length - 2;
							index_increment = -1;
						}
						else if (i < 0)
						{
							i = 1;
							index_increment = 1;
						}
					}
				}
			}
			else if ("Hold" in options)
			{
				if (progressive != null)
				{
					sr.sprite = sprites[row, index_prefix + progressive[progressive.Length-1]];
				}
				else
				{
					var loop_array = repeating;
					if (loop_array == null)
						loop_array = stepping;
					sr.sprite = sprites[row, index_prefix + loop_array[0]];
				}
			}
			else
			{
				Debug.Log("WARNING: This animation type requires option Start/End/Step/Repeat -- " + name);
			}
		}
		else if (type == AnimType.Moving)
		{
			if ("Idle" in options)
			{
				sr.sprite = sprites[row, index_prefix + move1[i]];
			}
			else
			{
				var moveArray = move1;
				if (alternateMove)
					moveArray = move2;
				for (i=0; i<moveArray.Length && !breakRepeat; i++)
				{
					sr.sprite = sprites[row, index_prefix + moveArray[i]];
					if (i<moveArray.Length-1)
						yield WaitForSeconds(wait/4.0 - (Time.time-time) % (wait/4.0));
				}
				alternateMove = !alternateMove;
			}
		}

		isRunning = false;
	}
	
	function stop()
	{
		breakRepeat = true;
		while (isRunning)
			yield;
	}

	function stopAfterFinish()
	{
		breakRepeatAfterFinish = true;
		while (isRunning)
			yield;
	}
}

class SpriteSkin extends Object
{
	var name : String;
	var path : String;
	var pnglist : String[];
	var sheets : Texture2D[];
	var anims = Dictionary.<String, AnimationItem>();
	var minimumSpriteSize = 32;

	function SpriteSkin(name_ : String, path_ : String, pnglist_ : String[])
	{
		name = name_;
		path = path_;
		pnglist = pnglist_;
//		Debug.Log(name + " :: " + pnglist.Length);
//		for (p in pnglist)
//			Debug.Log(p);
	}
	
	function isTextureLoaded()
	{
		return sheets != null;
	}

	function loadTexture()
	{
		if (isTextureLoaded())
			return;

		var sheetsArray = new Array();
	    for (var i=0; i<pnglist.Length; i++)
	    {
			var tokens = pnglist[i].Split('-'[0]);
			if (tokens.Length != 2 && tokens.Length != 3)
			{
				Debug.Log("WARNING: Incorrect number of '-' in animation name: " + path + pnglist[i]);
				continue;
			}

			var animType : String = tokens[0].Trim();
			var dimensionX : int = 1;
			var dimensionY : int = 1;
			var subtokens = animType.Split();
			if (subtokens.Length > 2)
			{
				Debug.Log("WARNING: Incorrect format of animation type: " + path + pnglist[i]);
				continue;
			}

			if (subtokens.Length == 2)
			{
				animType = subtokens[0].Trim();
				var subsubtokens = subtokens[1].Split('x'[0]);
				if (subsubtokens.Length != 2)
				{
					Debug.Log("WARNING: Incorrect format of animation size: " + path + pnglist[i]);
					continue;
				}
				var res1 = int.TryParse(subsubtokens[0].Trim(), dimensionX);
				var res2 = int.TryParse(subsubtokens[1].Trim(), dimensionY);
				if (!res1 || !res2)
				{
					Debug.Log("WARNING: Incorrect value for animation size: " + path + pnglist[i]);
					continue;
				}
			}
	    	var resourceName = path + pnglist[i];
	    	var texture : Texture2D = Resources.Load(resourceName) as Texture2D;

			if (texture.width % (minimumSpriteSize * dimensionX) > 0)
			{
				Debug.Log("WARNING: Pixel width incorrect: " + path + pnglist[i]);
				continue;
			}

			if (texture.height % (minimumSpriteSize * dimensionY) > 0)
			{
				Debug.Log("WARNING: Pixel height incorrect: " + path + pnglist[i]);
				continue;
			}

			var spriteSize : Vector2 = Vector2(minimumSpriteSize * dimensionX, minimumSpriteSize * dimensionY);
			var allsprites = loadSpriteSheet(texture, spriteSize);

			var animNames = tokens[1].Trim().Split();
			var isError = false;
			var tempArray = new Array();
			for (var k=0; k<animNames.Length; k++)
			{
				var anim = AnimationItem(animNames[k], animType, spriteSize, allsprites, k);
				if (anim.type == AnimType.ERROR)
				{
					isError = true;
					break;
				}
                var name = anim.name;
                if (tokens.Length == 3)
                    name += " - " + tokens[2];
				anims[name] = anim;
				tempArray.Add(anim.name);
			}
			if (isError)
			{
				for (t in tempArray)
				{
					var t_typed = t as String;
					anims.Remove(t_typed);
				}
				continue;
			}
		    sheetsArray.Add(texture);
	    }

		if (sheetsArray.length > 0)
		{
			sheets = new Texture2D[sheetsArray.length];
			for (i=0; i<sheetsArray.length; i++)
				sheets[i] = sheetsArray[i] as Texture2D;
		}
	}
	
	function unloadTexture()
	{
		anims.Clear();
		sheets = null;
	}

	function loadSpriteSheet(ss : Texture2D, spriteSize : Vector2)
	{
		var cols : int = ss.width/spriteSize.x;
		var rows : int = ss.height/spriteSize.y;
		var pivot : Vector2 = Vector2(0f, 1f - (1.0/(spriteSize.y/minimumSpriteSize))); //top left;

        var sprites = new Sprite[rows,cols];
        for(var x=0; x<cols; x++)
        {
            for(var y=0; y<rows; y++)
            {
                sprites[y,x] = Sprite.Create(ss, Rect(x*spriteSize.x, (spriteSize.y*rows)-(y*spriteSize.y), spriteSize.x, -spriteSize.y), pivot, minimumSpriteSize);
                sprites[y,x].name = x+","+y+" "+ss.name;
            }
        }
	    return sprites;
	}
}

class AnimatedObject extends Object
{
	var manager : AnimationManagerScript;
	var sr : SpriteRenderer;
	var name : String;
	var skin : SpriteSkin;
	var currentAnimation : AnimationItem;
	
	var speed = 1.0;
	
	function AnimatedObject(sr_ : SpriteRenderer, character : String, skinName : String)
	{
		manager = AnimationManagerScript.instance;
		sr = sr_;
		name = character;
		if (!manager.animations.ContainsKey(name))
		{
			Debug.Log("WARNING: No such character for animation -- " + name);
		}
		changeSkin(skinName);
	}

	function listOfSkins()
	{
		return manager.listOfSkins(name);
	}

	function listOfAnimations()
	{
		var res = new String[skin.anims.Count];
		var i = 0;
		for (var k in skin.anims.Keys)
		{
			res[i] = k;
			i++;
		}
		return res;
	}

	function changeSkin(skinName : String)
	{
		if (!manager.animations[name].ContainsKey(skinName))
		{
			Debug.Log("WARNING: No such skin for character -- " + skinName + " -- " + name);
			return;
		}
		skin = manager.animations[name][skinName];
		skin.loadTexture();
		if (!manager.animations[name][skinName].anims.ContainsKey("Walk"))
		{
			Debug.Log("WARNING: No 'Move - Walk' animation found -- " + skinName + " -- " + name);
			return;
		}
	}

	function run(animation : String)
	{
		return run(animation, speed, []);
	}

	function run(animation : String, speedModifier : float)
	{
		return run(animation, speed * speedModifier, []);
	}

	function run(animation : String, options : String[])
	{
		return run(animation, speed, options);
	}

	function run(animation : String, speedModifier : float, options : String[])
	{
		if (!skin.anims.ContainsKey(animation))
		{
			Debug.Log("WARNING: No such animation for character -- " + animation + " -- " + name);
			yield;
		}
		if (currentAnimation && currentAnimation.isRunning)
		{
			yield manager.StartCoroutine(currentAnimation.stop());
//			manager.StopAllCoroutines();
			currentAnimation.isRunning = false;
		}
		currentAnimation = skin.anims[animation];
		yield manager.StartCoroutine(currentAnimation.run(sr, speed * speedModifier, options));
	}
	
	function isRunning()
	{
		return currentAnimation && currentAnimation.isRunning;
	}

	function stop()
	{
		return currentAnimation.stop();
	}

	function stopAfterFinish()
	{
		return currentAnimation.stopAfterFinish();
	}

	function waitTillFinished()
	{
		while(currentAnimation.isRunning)
			yield;
	}
}

class AnimationManagerScript extends MonoBehaviour
{
    static var instance : AnimationManagerScript;

	var pathToCharacters = "characters";
	var preLoadAllCharacters = true;

	var animations = Dictionary.<String, Dictionary.<String, SpriteSkin> >();
	
	private var resource : ResourceManagerScript;

	function Awake ()
	{
        instance = this;
        resource = ResourceManagerScript.instance;
	    for (dir in resource.getDirectoriesInPath(pathToCharacters))
	    {
	        animations[dir] = new Dictionary.<String, SpriteSkin>();
		    var path = pathToCharacters + "/" + dir + "/Sprites/";
	    	var pnglist = resource.getFilesOfType(path, ".png");
		    if (pnglist && pnglist.Length > 0)
		    {
		    	if ("Moving - Walk" in pnglist)
		    	{
		    		var s : SpriteSkin = new SpriteSkin("Default", path, pnglist);
		    		if (preLoadAllCharacters)
		    		{
//				    	Debug.Log("Loading character and skin: " + dir + ", Default");
		    			s.loadTexture();
		    			if (s.anims.ContainsKey("Walk"))
		    				animations[dir]["Default"] = s;
		    		}
		    		else
			   			animations[dir]["Default"] = s;
			   	}
		    	else
					Debug.Log("WARNING: Skin does not have Walk animation -- Default -- " + dir);
		   	}

		    for (subdir in resource.getDirectoriesInPath(path))
		    {
		    	var subpath = path + subdir + "/";
		    	var subpnglist = resource.getFilesOfType(subpath, ".png");
		    	if ("Moving - Walk" in subpnglist)
		    	{
		    		s = new SpriteSkin(subdir, subpath, subpnglist);
		    		if (preLoadAllCharacters)
		    		{
//				    	Debug.Log("Loading character and skin: " + dir + ", " + subdir);
		    			s.loadTexture();
		    			if (s.anims.ContainsKey("Walk"))
		    				animations[dir][subdir] = s;
		    		}
		    		else
			   			animations[dir][subdir] = s;
		    	}
		    	else
					Debug.Log("WARNING: Skin does not have Walk animation -- " + subdir + " -- " + dir);
		    }
		    
		    if (animations[dir].Count == 0)
		    	animations.Remove(dir);
	    }
	}

	function listOfCharacters()
	{
		var res = new String[animations.Count];
		var i = 0;
		for (var k in animations.Keys)
		{
			res[i] = k;
			i++;
		}
		return res;
	}

	function listOfSkins(character : String)
	{
		var res = new String[animations[character].Count];
		var i = 0;
		for (var k in animations[character].Keys)
		{
			res[i] = k;
			i++;
		}
		return res;
	}

	function getAnimatedObject(sr : SpriteRenderer, character : String, skinName : String)
	{
		return new AnimatedObject(sr, character, skinName);
	}
}