#pragma strict

class MainPlayerScript extends MonoBehaviour
{
	var disableInputs = false;
	var triggerExits = true;
	var triggerInteracts = true;

	private var isKeyUpAfterWalking = true;
	private var finishedCheckingExits = true;

	private var isChangingRoom = false;
	private var currentRoom : GameObject;

	private var cam : CameraScript;
	private var map : MapBaseScript;
	private var character : CharacterScript;
	private var mapManager : MapManagerScript;
	private var sr : SpriteRenderer;

	private var quitMenu : CanvasGroup;
	
	function Awake()
	{
		cam = Camera.main.GetComponent(CameraScript);
        setCameraZoom(2.0);
		character = GetComponent(CharacterScript);
		sr = GetComponent(SpriteRenderer);
		sr.enabled = false;
		quitMenu = GameObject.Find("Quit Menu").GetComponent(CanvasGroup);
	}

	function Start ()
	{
        var location = "221";
        var room = "Interior/221B/Stairwell";
        var coords = "F2";

		quitMenu.alpha = 0f;
		quitMenu.interactable = false;
        yield ScreenFaderScript.fadeOut(0.0f, Color.black);

        mapManager = MapManagerScript.instance;
        mapManager.loadLocation(location);
		currentRoom = mapManager.getRoomObject(room);
		map = currentRoom.GetComponent(MapBaseScript);
		yield changeRoom(room, coords);
        yield WaitForSeconds(0.5);

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
		if (!character.moving() && !isChangingRoom && !disableInputs && finishedCheckingExits)
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
			quitMenu.alpha = 1f;
			quitMenu.interactable = true;
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
		quitMenu.alpha = 0f;
		quitMenu.interactable = false;
		ScreenFaderScript.fadeIn(0.5f);
	}

	function quitGame()
	{
		Application.Quit();
	}

	function setCameraZoom(zoom : float)
	{
        cam.setCameraZoom(zoom, Camera.main);
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
				yield changeRoom(tokens[1], subtokens[0]);
				if (subtokens.Length == 2)
					yield character.move(subtokens[1], true);
			}
		}
	}

	function fadeOutRoom(location : GameObject)
	{
		sr.enabled = false;
		yield;
	}

	function fadeInRoom(location : GameObject)
	{
		sr.enabled = true;
		yield;
	}

	function changeRoom(location : String, coords : String)
	{
		isChangingRoom = true;
		if (mapManager.isRoomExist(location))
		{
			if (mapManager.getRoomObject(location) != currentRoom)
			{
				yield fadeOutRoom(currentRoom);
                currentRoom.SetActive(false);
				mapManager.currentRoom = location;
				currentRoom = mapManager.getRoomObject();
			}

            mapManager.disableCharacters();
			if (location.StartsWith("Exterior"))
				setCameraZoom(1.0);
			else
				setCameraZoom(2.0);

			if (!currentRoom.activeInHierarchy)
			{
                currentRoom.SetActive(true);
				map = currentRoom.GetComponent(MapBaseScript) as MapBaseScript;
				character.changeRoom(map, coords);
                yield fadeInRoom(currentRoom);
			}
			else
				yield;
		}
		else
		{
			Debug.Log("Room don't exist: " + location);
			yield;
		}
		isChangingRoom = false;
	}
}
