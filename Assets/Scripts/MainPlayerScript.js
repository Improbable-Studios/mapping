#pragma strict

class MainPlayerScript extends MonoBehaviour
{
	var speed = 1f;
	var direction = "South";
	var isCameraFollow = true;

	var disableInputs = false;

	private var isWalking = false;
	private var isKeyUpAfterWalking = true;

	private var isChangingLocation = false;
	private var currentLocation : GameObject;
	private var locationsDict = Dictionary.<String, GameObject>();

	private var map : MapBaseScript;
	private var animScript : AnimationManagerScript;
	private var anim : AnimatedObject;
	private var sr : SpriteRenderer;
	
	private var fractionMoved = 0f;
	private var moveVector : Vector3;
	private var origin : Vector3;

	function Awake()
	{
		animScript = GameObject.Find("Manager").GetComponent(AnimationManagerScript);
		sr = GetComponent(SpriteRenderer);

		for (t_ in GameObject.Find("Locations").transform)
		{
			var t : Transform = t_ as Transform;
			var l = t.gameObject;
			locationsDict[l.name] = l;
			if (l.activeInHierarchy)
				currentLocation = l;
		}
		var cameraZoom = 2.0;
        Camera.main.orthographicSize = Screen.height / (2.0 * 32.0 * cameraZoom);
	}

	function Start ()
	{
		initAnim("john", "Jacket");
		if (isCameraFollow)
			centerCamera();
		map = GameObject.Find("Map").GetComponent(MapBaseScript);
		yield WaitForSeconds(0.2);
		doWalk("South", true);
	}
	
	function Update ()
	{
		// Check for directional key releases
		if (Input.GetKeyUp(KeyCode.RightArrow)
				|| Input.GetKeyUp(KeyCode.DownArrow)
				|| Input.GetKeyUp(KeyCode.UpArrow)
				|| Input.GetKeyUp(KeyCode.LeftArrow))
			isKeyUpAfterWalking = true;
		else if (!Input.GetKey(KeyCode.RightArrow)
				&& !Input.GetKey(KeyCode.DownArrow)
				&& !Input.GetKey(KeyCode.UpArrow)
				&& !Input.GetKey(KeyCode.LeftArrow))
			isKeyUpAfterWalking = true;

		// Check for active inputs
		if (!isWalking && !isChangingLocation && !disableInputs)
			checkInput();

		// Do any remaining animations
		if (isWalking)
			animateWalk();
	}

	function initAnim(character : String, skin : String)
	{
		if (character == "Random")
			character = animScript.listOfCharacters()[Random.Range(0, animScript.animations.Count)];
		if (skin == "Random")
			skin = animScript.listOfSkins(character)[Random.Range(0, animScript.animations[character].Count)];
		anim = animScript.getAnimatedObject(sr, character, skin);
		anim.speed = speed;
		animScript.StartCoroutine(anim.run("Walk", [direction, "Idle"]));
	}

	function checkInput()
	{
		if (Input.GetKey(KeyCode.RightArrow))
			doWalk("East");
		else if (Input.GetKey(KeyCode.DownArrow))
			doWalk("South");
		else if (Input.GetKey(KeyCode.UpArrow))
			doWalk("North");
		else if (Input.GetKey(KeyCode.LeftArrow))
			doWalk("West");
		else if (Input.GetKeyDown(KeyCode.Space))
		{
			var name = map.checkInteract(transform.position, direction);
			if (name != "")
				map.StartCoroutine(name);
		}
		else if (Input.GetKeyDown(KeyCode.Tab))
		{
			// TESTING AREA
			var animName = anim.listOfAnimations()[Random.Range(0, anim.skin.anims.Count)];
			Debug.Log(animName);
			yield StartCoroutine(anim.run(animName, ["Random"]));
		}
	}

	function doWalk(input : String)
	{
		doWalk(input, false);
	}

	function doWalk(input : String, bypass : boolean)
	{
		if (isKeyUpAfterWalking)
		{
			isKeyUpAfterWalking = false;
			direction = input;
		}

		if (bypass)
			direction = input;

		var dest = map.nextPos(transform.position, direction);

		if (!bypass)
		{
			if (!map.isWalkable(dest, direction))
			{
				animScript.StartCoroutine(anim.run("Walk", [direction, "Idle"]));
				return;
			}
				
			var name = map.checkPreEvent(transform.position, direction);
			if (name != "")
			{
				map.StartCoroutine(name, 0f);
				return;
			}
		}

		isWalking = true;
		moveVector = dest - transform.position;
		fractionMoved = 0f;
		origin = transform.position;
		animScript.StartCoroutine(anim.run("Walk", [direction]));
	}

	function fadeOutAudio(location : GameObject)
	{
		var audiolist = location.GetComponentsInChildren(AudioScript);
		var audio : AudioScript;
		for (audio_ in audiolist)
		{
			audio = audio_ as AudioScript;
			if (audio.fadeOut)
				audio.doFadeOut();
			else
				audio.changeCurrentVolume(0f);
		}
		
		var stillFadingOut = true;
		while (stillFadingOut)
		{
			stillFadingOut = false;
			for (audio_ in audiolist)
			{
				audio = audio_ as AudioScript;
				if (audio.currentVolume() > 0)
					stillFadingOut = true;
			}
			yield;
		}
	}

	function fadeOutLocation(location : GameObject)
	{
//		var thismap = GameObject.Find("Map");
//		var thischar = GameObject.Find("Characters");
//
//		sr.enabled = false;
//		thismap.SetActive(false);
//		thischar.SetActive(false);
//
//		yield fadeOutAudio(location);
//
//		location.SetActive(false);
//		thismap.SetActive(true);
//		thischar.SetActive(true);
		sr.enabled = false;
		location.SetActive(false);
		yield;
	}

	function fadeInLocation(location : GameObject)
	{
		location.SetActive(true);
		sr.enabled = true;
		yield;
	}

	function changeLocation(location : String, coords : String)
	{
		isChangingLocation = true;
		if (locationsDict.ContainsKey(location))
		{
			if (locationsDict[location] != currentLocation)
			{
				yield fadeOutLocation(currentLocation);
				currentLocation = locationsDict[location];
			}

			var x : int = coords[0];
			var a : int = 'A'[0];
			x -= a;
			var y : int = int.Parse(coords[1:]);
			var newPos = transform.position;
			newPos.x = x;
			newPos.y = -y + 1;
			transform.position = newPos;
			centerCamera();

			if (!currentLocation.activeInHierarchy)
			{
				yield fadeInLocation(currentLocation);
				map = GameObject.Find("Map").GetComponent(MapBaseScript);
			}
			else
				yield;
		}
		else
		{
			Debug.Log("Location don't exist: " + location);
			yield;
		}
		isChangingLocation = false;
	}

	function centerCamera()
	{
		var newCameraPos = transform.position;
		newCameraPos.x += 0.5f;
		newCameraPos.y -= 0.5f;
		newCameraPos.z = Camera.main.transform.position.z;
		Camera.main.transform.position = newCameraPos;
	}

	function animateWalk()
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

		if (isCameraFollow)
			centerCamera();

		if (fractionMoved == 1f)
		{
			isWalking = false;
			var name = map.checkPostEvent(transform.position, direction);
			if (name != "")
				map.StartCoroutine(name);

			name = map.checkExit(transform.position, direction);
			if (name != "")
			{
				var tokens = name.Split();
				var methodInfo = typeof(map).GetMethod(tokens[0]);
				var success = true;
				if (methodInfo)
					success = methodInfo.Invoke(map, []);
				if (success == true)
				{
					var subtokens = tokens[2].Split('_'[0]);
					disableInputs = true;
					yield changeLocation(tokens[1], subtokens[0]);
					if (subtokens.Length == 2)
						doWalk(subtokens[1], true);
					disableInputs = false;
				}
			}
		}
	}
}
