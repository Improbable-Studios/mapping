#pragma strict

class MainPlayerScript extends MonoBehaviour
{
    static var instance : MainPlayerScript;

	var disableInputs = false;
	var triggerExits = true;
	var triggerInteracts = true;

	private var isKeyUpAfterWalking = true;
	private var finishedCheckingExits = true;

	private var isChangingRoom = false;
	private var roomObject : GameObject;

	private var cam : CameraScript;
	private var roomScript : RoomScript;
	private var character : CharacterScript;
	private var mapManager : MapManagerScript;
	private var sr : SpriteRenderer;

	private var quitMenu : CanvasGroup;
	
	function Awake()
	{
        instance = this;

		cam = Camera.main.GetComponent(CameraScript);
        cam.setZoom(2.0);
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

        cam.setFollow(gameObject, FollowMode.Smart);
        mapManager = MapManagerScript.instance;

        yield changeLocation(location, room, coords, "South", "Morning", 1f);       
        yield character.move("South", 4, true);
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
			var name = roomScript.checkInteract(transform.position, character.direction);
			if (name != "")
				roomScript.StartCoroutine(name);
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
        else if (Input.GetKeyUp(KeyCode.S))
            GameData.instance.save("1");
        else if (Input.GetKeyUp(KeyCode.L))
        {
            GameData.instance.load("1");
            var current = GameData.instance.current;
            changeLocation(current.location, current.room, current.coords, current.direction, current.time, 0.2f);
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
		var name = roomScript.checkExit(transform.position, character.direction);
		if (name != "")
		{
			var tokens = name.Split();
			var methodInfo = typeof(roomScript).GetMethod(tokens[0]);
			var success = true;
			if (methodInfo)
				success = methodInfo.Invoke(roomScript, []);
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

    function changeLocation(location : String, room : String, coords : String, direction : String, time : String, fade : float)
    {
        yield ScreenFaderScript.fadeOut(fade, Color.black);

        GameData.instance.current.time = time;
        mapManager.loadLocation(location);
        roomObject = mapManager.getRoomObject(room);
        roomScript = roomObject.GetComponent(RoomScript);

        yield changeRoom(room, coords);
        character.changeDirection(direction);
        yield WaitForSeconds(fade);

        ScreenFaderScript.fadeIn(fade, Color.black);
    }

	function changeRoom(room : String, coords : String)
	{
		isChangingRoom = true;
		if (mapManager.isRoomExist(room))
		{
			if (mapManager.getRoomObject(room) != roomObject)
			{
				yield fadeOutRoom(roomObject);
                roomObject.SetActive(false);
                GameData.instance.current.room = room;
				roomObject = mapManager.getRoomObject();
			}

			if (!roomObject.activeInHierarchy)
			{
                roomObject.SetActive(true);
				roomScript = roomObject.GetComponent(RoomScript) as RoomScript;
				character.changeRoom(roomScript, coords);
                yield fadeInRoom(roomObject);
			}
			else
				yield;
		}
		else
		{
			Debug.Log("Room don't exist: " + room);
			yield;
		}
		isChangingRoom = false;
	}
}
