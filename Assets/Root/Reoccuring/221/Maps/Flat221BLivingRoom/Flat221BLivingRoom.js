#pragma strict

var tvAudio : GameObject;

class Flat221BLivingRoom extends MapBaseScript
{
	private var player : MainPlayerScript;

	function Awake()
	{
		player = GameObject.Find("Player").GetComponent(MainPlayerScript);
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
		player.doWalk("North", true);
	}

	function UpStairs()
	{
		player.disableInputs = true;
		player.doWalk("North", true);
		yield ScreenFaderScript.fadeOut(0.5f, Color.black);
		player.initAnim("Random", "Random");
		player.doWalk("South", true);
		yield ScreenFaderScript.fadeIn(0.5f);
		player.disableInputs = false;
	}
}
