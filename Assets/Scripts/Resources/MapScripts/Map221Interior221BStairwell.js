#pragma strict

class Map221Interior221BStairwell extends MapBaseScript
{
	private var player : MainPlayerScript;
	private var character : CharacterScript;

	function Awake()
	{
		player = GameObject.Find("Player").GetComponent(MainPlayerScript);
		character = GameObject.Find("Player").GetComponent(CharacterScript);
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
