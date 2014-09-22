#pragma strict

class MainPlayerScript extends MonoBehaviour
{
	var disableInputs = false;
	var triggerExits = true;
	var triggerInteracts = true;

	private var isKeyUpAfterWalking = true;

	private var isChangingLocation = false;
	private var currentLocation : GameObject;
	private var locationsDict = Dictionary.<String, GameObject>();

	private var map : MapBaseScript;
	private var character : CharacterScript;
	private var sr : SpriteRenderer;

	private var canvas : CanvasGroup;
	
	function Awake()
	{
		map = GameObject.Find("Map").GetComponent(MapBaseScript);
		character = GetComponent(CharacterScript);
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
        Camera.main.orthographicSize = 0.99f * Screen.height / (2.0 * 32.0 * cameraZoom);
		canvas = GameObject.Find("Canvas").GetComponent(CanvasGroup);
	}

	function Start ()
	{
		canvas.alpha = 0f;
		canvas.interactable = false;
		yield WaitForSeconds(0.5);
		character.move("South", 4, true);
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
		if (!character.moving() && !isChangingLocation && !disableInputs)
			checkInput();
	}

	function checkInput()
	{
		if (Input.GetKey(KeyCode.RightArrow))
			move("East");
		else if (Input.GetKey(KeyCode.DownArrow))
			move("South");
		else if (Input.GetKey(KeyCode.UpArrow))
			move("North");
		else if (Input.GetKey(KeyCode.LeftArrow))
			move("West");
		else if (triggerInteracts && Input.GetKeyDown(KeyCode.Space))
		{
			var name = map.checkInteract(transform.position, character.direction);
			if (name != "")
				map.StartCoroutine(name);
		}
		else if (Input.GetKeyDown(KeyCode.Escape))
		{
			yield ScreenFaderScript.fadeOut(0.5f, Color.black);
			canvas.alpha = 1f;
			canvas.interactable = true;
		}
		else if (Input.GetKeyDown(KeyCode.Tab))
		{
			// TESTING AREA
			var anims = character.listOfAnimation();
			var animName = anims[Random.Range(0, anims.Length)];
			character.animate(animName, ["Random"]);
		}
	}

	function cancelQuit()
	{
		canvas.alpha = 0f;
		canvas.interactable = false;
		ScreenFaderScript.fadeIn(0.5f);
	}

	function quitGame()
	{
		Application.Quit();
	}

	function move(direction : String)
	{
		if (!isKeyUpAfterWalking)
			yield character.move(character.direction);
		else
		{
			isKeyUpAfterWalking = false;
			yield character.move(direction);
		}
		
		if (triggerExits)
			checkExit();
	}

	function checkExit()
	{
		var name = map.checkExit(transform.position, character.direction);
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
					character.move(subtokens[1], true);
				disableInputs = false;
			}
		}
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
			character.updateCamera();

			if (!currentLocation.activeInHierarchy)
			{
				yield fadeInLocation(currentLocation);
				map = GameObject.Find("Map").GetComponent(MapBaseScript);
				character.updateMap();
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
}
