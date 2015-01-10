#pragma strict

class Room221Interior221BStairwell extends RoomScript
{
	private var player : MainPlayerScript;
	private var character : CharacterScript;

	function Awake()
	{
		player = GameObject.Find("Player").GetComponent(MainPlayerScript);
		character = player.GetComponent(CharacterScript);
		super.Awake();
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
