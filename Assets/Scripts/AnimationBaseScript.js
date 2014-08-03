#pragma strict

import System.Collections.Generic;

class AnimationBase extends Object
{
	var name : String;
	var spriteSize : Vector2;
	var sprites : Sprite[,];
	var row : int;
	var framesIndexOrder : int[];
	
	function AnimationBase(name_ : String, spriteSize_ : Vector2, sprites_ : Sprite[,], row_ : int)
	{
		name = name_;
		spriteSize = spriteSize_;
		sprites = sprites_;
		row = row_;
	}

	function run(option : String)
	{
		var i = 0;
		while (i < 10)
		{
			Debug.Log(i);
			i++;
			yield WaitForSeconds(1f);
		}
	}
}

class SpriteSkin extends Object
{
	var name : String;
	var sheets : Texture2D[];
	var anims = Dictionary.<String, AnimationBase>();
}

class AnimationBaseScript extends MonoBehaviour
{
	var speed : float = 1f;
	var spriteSkins : SpriteSkin[];
	var minimumSpriteSize = 32;

	private var skins = Dictionary.<String, SpriteSkin>();
	private var sr : SpriteRenderer;

	private var isRunning : boolean = false;
	private var fractionMoved : float = 0f;
	private var currentFrame : int = 0;
	private var currentSheet : int = 0;

	class ProgressiveSteppingAnimation extends AnimationBase
	{
		function ProgressiveSteppingAnimation(name_ : String, spriteSize_ : Vector2, sprites_ : Sprite[,], row_ : int)
		{
			super(name_, spriteSize_, sprites_, row_);
		}
	}

	function Awake ()
	{
		sr = GetComponent(SpriteRenderer);
	}

	function Start ()
	{
		for (x in GetType().GetNestedTypes())
			Debug.Log(x);

		for (var i=0; i<spriteSkins.Length; i++)
		{
			for (var j=0; j<spriteSkins[i].sheets.Length; j++)
			{
				var tokens = spriteSkins[i].sheets[j].name.Split('-'[0]);
				var animType : String = tokens[0].Trim();
				var dimensionX : int = 1;
				var dimensionY : int = 1;
				var subtokens = animType.Split();
				if (subtokens.Length > 1)
				{
					animType = subtokens[0].Trim();
					var subsubtokens = subtokens[1].Split('x'[0]);
					dimensionX = int.Parse(subsubtokens[0].Trim());
					dimensionY = int.Parse(subsubtokens[1].Trim());
				}
				var animNames = tokens[1].Trim().Split();
				var spriteSize : Vector2 = Vector2(minimumSpriteSize * dimensionX, minimumSpriteSize * dimensionY);
				var allsprites = loadSpriteSheet(spriteSkins[i].sheets[j], spriteSize);
				for (var k=0; k<animNames.Length; k++)
				{
					var anim = AnimationBase(animNames[k], spriteSize, allsprites, k);
//					anim.name = animNames[k];
//					anim.type = animType;
//					anim.spriteSize = spriteSize;
//					anim.sprites = new Sprite[allsprites.GetLength(1)];
//					for (var c=0; c<allsprites.GetLength(1); c++)
//						anim.sprites[c] = allsprites[k,c];
					spriteSkins[i].anims[anim.name] = anim;
				}
			}
			skins[spriteSkins[i].name] = spriteSkins[i];
//			for (var key in spriteSkins[i].anims)
//				Debug.Log(key);
		}
//		loadSpriteSheet(spritesheets[0].sheet);
//		sr.sprite = frames[0];
	}

	function Update ()
	{
		if (isRunning)
		{
			fractionMoved += Time.deltaTime * speed;
//			if (currentIndex/framesIndices.Length)
//			{
//			}
		}
	}
	
	function startAnim()
	{
		if (!isRunning)
		{
			fractionMoved = 0f;
			isRunning = true;
		}
	}

	function loadSpriteSheet(ss : Texture2D, spriteSize : Vector2)
	{
		var cols : int = ss.width/spriteSize.x;
		var rows : int = ss.height/spriteSize.y;
		var pivot : Vector2 = Vector2(0f, 0f);//top left;

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