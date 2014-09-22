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

	private var currentLocation : GameObject;
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
		cameraScript = GameObject.Find("Main Camera").GetComponent(CameraScript);
		animScript = GameObject.Find("Manager").GetComponent(AnimationManagerScript);
		sr = GetComponent(SpriteRenderer);

		for (t_ in GameObject.Find("Locations").transform)
		{
			var t : Transform = t_ as Transform;
			var l = t.gameObject;
			if (l.activeInHierarchy)
				currentLocation = l;
		}
	}

	function Start ()
	{
		initAnim();
		updateCamera();
		updateMap();
	}

	function updateMap()
	{
		map = GameObject.Find("Map").GetComponent(MapBaseScript);
	}

	function updateCamera()
	{
		if (transform == cameraScript.follow.transform)
		{
			var newCameraPos = transform.position;
			newCameraPos.x += 0.5f;
			newCameraPos.y -= 0.5f;
			newCameraPos.z = cameraScript.transform.position.z;
			cameraScript.transform.position = newCameraPos;
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
		return move(input, distance, false);
	}

	function move(input : String, bypass : boolean)
	{
		return move(input, 1, bypass);
	}

	function move(input : String, distance : int, bypass : boolean)
	{
		direction = input;
		var dest = map.nextPos(transform.position, direction);

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
			origin = transform.position;
			dest = map.nextPos(transform.position, direction);
			yield StartCoroutine(moveCoroutine(bypass));
			distance--;
		}
	}

	function moveCoroutine(bypass : boolean)
	{
		animate(moveAnimation, [direction]);
		var fractionMoved = 0f;
		isMoving = true;

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
				break;
			}
			yield;
		}
		isMoving = false;
	}
}
