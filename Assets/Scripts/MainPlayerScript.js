#pragma strict

class MainPlayerScript extends MonoBehaviour
{
	var disableInputs = false;
	var triggerExits = true;
	var triggerInteracts = true;

	private var isKeyUpAfterWalking = true;
	private var finishedCheckingExits = true;

	private var isChangingLocation = false;
	private var currentLocation : GameObject;

	private var map : MapBaseScript;
	private var character : CharacterScript;
	private var mapManager : MapManagerScript;
	private var sr : SpriteRenderer;

	private var canvas : CanvasGroup;
	
	function Awake()
	{
		character = GetComponent(CharacterScript);
		mapManager = GameObject.Find("Manager").GetComponent(MapManagerScript);
		sr = GetComponent(SpriteRenderer);
		sr.enabled = false;
		setCameraZoom(2.0);
		canvas = GameObject.Find("Canvas").GetComponent(CanvasGroup);
	}

	function Start ()
	{
		canvas.alpha = 0f;
		canvas.interactable = false;
		currentLocation = mapManager.getRoomObject();
		map = currentLocation.GetComponent(MapBaseScript);
		yield ScreenFaderScript.fadeOut(0.0f, Color.black);
		yield WaitForSeconds(0.5);
		yield changeLocation("Interior/221B/Stairwell", "F2");
		sr.enabled = true;
		character.move("South", 4, true);
		ScreenFaderScript.fadeIn(1f, Color.black);
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
		if (!character.moving() && !isChangingLocation && !disableInputs && finishedCheckingExits)
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

	function setCameraZoom(zoom : float)
	{
        Camera.main.orthographicSize = 0.99f * Screen.height / (2.0 * 32.0 * zoom);
	}

	function move(direction : String)
	{
		finishedCheckingExits = false;
		if (!isKeyUpAfterWalking)
			yield character.move(character.direction);
		else
		{
			isKeyUpAfterWalking = false;
			yield character.move(direction);
		}
		
		if (triggerExits)
			yield checkExit();
		finishedCheckingExits = true;
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
				yield changeLocation(tokens[1], subtokens[0]);
				if (subtokens.Length == 2)
					yield character.move(subtokens[1], true);
			}
		}
	}

	function fadeOutLocation(location : GameObject)
	{
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
		if (mapManager.isRoomExist(location))
		{
			if (mapManager.getRoomObject(location) != currentLocation)
			{
				yield fadeOutLocation(currentLocation);
				mapManager.currentRoom = location;
				currentLocation = mapManager.getRoomObject();
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
			if (location.StartsWith("Exterior"))
				setCameraZoom(1.0);
			else
				setCameraZoom(2.0);



			if (!currentLocation.activeInHierarchy)
			{
				yield fadeInLocation(currentLocation);
				map = currentLocation.GetComponent(MapBaseScript);
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
