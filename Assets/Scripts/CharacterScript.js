#pragma strict

class CharacterScript extends MonoBehaviour
{
	var speed = 1f;
	var direction = "South";
	var character = "john";
	var skin = "Jacket";
	var moveAnimation = "Walk";
	
	var useMapCollisionMask = false;
	var triggerPreEvents = false;
	var triggerPostEvents = false;

	private var map : MapBaseScript;

	private var animScript : AnimationManagerScript;
	private var anim : AnimatedObject;
	private var sr : SpriteRenderer;
	
	private var cameraScript : CameraScript;
	private var isMoving = false;
	private var moveVector : Vector3;
	private var origin : Vector3;

	function Awake()
	{
		cameraScript = Camera.main.GetComponent(CameraScript);
		sr = GetComponent(SpriteRenderer);
	}

	function Start ()
	{
        animScript = AnimationManagerScript.instance;
		initAnim();
		updateCamera();
	}

    function getCoords()
    {
        return Grid.getCoords(transform.position);
    }

	function changeRoom(map_ : MapBaseScript, coords : String)
	{
        warpTo(coords);
        map = map_;
        var door = map.checkAtDoorEvent(transform.position, direction);
        if (door != null)
        {
            door.openDoorInstant();
        }
        else
        {
            door = map.checkDoorLeftEvent(transform.position, direction);
            if (door != null)
            {
                door.openDoorInstant();
                StartCoroutine(door.closeDoor());
            }
        }
	}

	function updateCamera()
	{
		if (transform == cameraScript.follow.transform)
			cameraScript.lookAt(gameObject);
	}

    function warpTo(coords : String)
    {
        transform.position = Grid.getPos(coords);
        updateCamera();
    }

    function setCharacter(coords : String, character_ : String, skin_ : String, animation : String)
    {
        sr.enabled = false;
        warpTo(coords);
        character = character_;
        skin = skin_;
        initAnim();
        var tokens = animation.Split();
        if (tokens[0] == "RandomWalk")
        {
            moveAnimation = "Walk";
            if (tokens.Length == 2)
                moveAnimation = tokens[1];
            // HACK: Will add actual random walk some time in the future
            StartCoroutine(anim.run(moveAnimation, ["South", "Idle"]));
        }
        else if (tokens[0] == "Idle")
        {
            moveAnimation = "Walk";
            direction = "South";
            if (tokens.Length > 1)
                direction = tokens[1];
            if (tokens.Length > 2)
                moveAnimation = tokens[2];
            StartCoroutine(anim.run(moveAnimation, [direction, "Idle"]));
        }
        else
        {
            StartCoroutine(anim.run(tokens[0], ["Loop"]));
        }
    }

	function initAnim()
	{
		if (character == "Random")
		{
			character = animScript.listOfCharacters()[Random.Range(0, animScript.animations.Count)];
			skin = animScript.listOfSkins(character)[Random.Range(0, animScript.animations[character].Count)];
		}
		else if (skin == "Random")
			skin = animScript.listOfSkins(character)[Random.Range(0, animScript.animations[character].Count)];
		anim = animScript.getAnimatedObject(sr, character, skin);
		anim.speed = speed;
		StartCoroutine(anim.run(moveAnimation, [direction, "Idle"]));
	}

	function listOfAnimation()
	{
		return anim.listOfAnimations();
	}

	function animate(animName : String, animOptions : String[])
	{
		yield StartCoroutine(anim.run(animName, [direction] + animOptions));
	}

	function moving()
	{
		return isMoving;
	}

	function move(input : String)
	{
		return move(input, 1, false);
	}

	function move(input : String, distance : int)
	{
		return move(input, distance, true);
	}

	function move(input : String, bypass : boolean)
	{
		return move(input, 1, bypass);
	}

	function move(input : String, distance : int, bypass : boolean)
	{
		direction = input;
		var dest = Grid.nextPos(transform.position, direction);

		if (!bypass)
		{
			if (useMapCollisionMask)
			{
				if (!map.isWalkable(dest, direction))
				{
					animate(moveAnimation, [direction, "Idle"]);
					return;
				}
			}

			if (triggerPreEvents)
			{
				var name = map.checkPreEvent(transform.position, direction);
				if (name != "")
				{
					map.StartCoroutine(name, 0f);
					return;
				}
			}
		}

		isMoving = true;
		moveVector = dest - transform.position;
		while (distance > 0)
		{
            var door = map.checkDoorEnteringEvent(transform.position, direction);
            if (door != null)
            {
                yield StartCoroutine(door.openDoor());
            }
			origin = transform.position;
			dest = Grid.nextPos(transform.position, direction);
			yield StartCoroutine(moveCoroutine(bypass));
			distance--;
		}
		isMoving = false;
	}

	function moveCoroutine(bypass : boolean)
	{
		animate(moveAnimation, [direction]);
		var fractionMoved = 0f;

		while (isMoving && fractionMoved < 1f)
		{
			fractionMoved += Time.deltaTime * speed * 5.0;
			if (fractionMoved > 1f)
				fractionMoved = 1f;

			// 10, 8, 6, 8
			var transformedFractionMoved = 0f;
			if (fractionMoved < 0.25)
				transformedFractionMoved = 10f/32f * fractionMoved * 4f;
			else if (fractionMoved < 0.50)
				transformedFractionMoved = 10f/32f + (8f/32f * (fractionMoved-0.25f) * 4f);
			else if (fractionMoved < 0.75)
				transformedFractionMoved = 18f/32f + (6f/32f * (fractionMoved-0.50f) * 4f);
			else
				transformedFractionMoved = 24f/32f + (8f/32f * (fractionMoved-0.75f) * 4f);
			transform.position = origin + moveVector * transformedFractionMoved;

			updateCamera();

			if (fractionMoved == 1f)
			{
				if (!bypass && triggerPostEvents)
				{
					var name = map.checkPostEvent(transform.position, direction);
					if (name != "")
						map.StartCoroutine(name);
				}
			    var door = map.checkDoorLeftEvent(transform.position, direction);
	            if (door != null && door != map.checkAtDoorEvent(transform.position, direction))
	            {                        
	                StartCoroutine(door.closeDoor());
	            }
				break;
			}
			yield;
		}
	}
}
