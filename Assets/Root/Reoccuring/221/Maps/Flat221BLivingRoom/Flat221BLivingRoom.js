#pragma strict

var tvAudio : GameObject;

class Flat221BLivingRoom extends MapBaseScript
{
	private var player : MainPlayerScript;
	private var character : CharacterScript;

	function Awake()
	{
		player = GameObject.Find("Player").GetComponent(MainPlayerScript);
		character = GameObject.Find("Player").GetComponent(CharacterScript);
	}

	function Fridge()
	{
		Debug.Log ("Fridge interaction successful!");
	}

	function JohnChair()
	{
		Debug.Log ("JohnChair interaction successful!");
	}

	function SherlockChair()
	{
		Debug.Log ("SherlockChair interaction successful!");
	}

	function TV()
	{
		tvAudio.SetActive(!tvAudio.activeSelf);
	}

	function BedroomDoor()
	{
		Debug.Log ("BedroomDoor event successful!");
		character.move("North", true);
	}

	function UpStairs()
	{
		player.disableInputs = true;
		character.move("North", 4, true);
		yield ScreenFaderScript.fadeOut(0.8f, Color.black);
		character.character = "Random";
		character.initAnim();
		character.move("South", 4, true);
		yield ScreenFaderScript.fadeIn(0.8f);
		player.disableInputs = false;
	}
}
