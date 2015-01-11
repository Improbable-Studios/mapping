#pragma strict

class Room221Interior221BLivingRoom extends RoomScript
{
    var tvAudio : String;

	private var player : MainPlayerScript;
	private var character : CharacterScript;

	function Awake()
	{
		player = GameObject.Find("Player").GetComponent(MainPlayerScript);
		character = GameObject.Find("Player").GetComponent(CharacterScript);
		tvAudio = "Ambiance/TV/Baseball";
		super.Awake();
	}

	function TV()
	{
		AudioManagerScript.instance.toggleAmbiance("TV", tvAudio, 1f, true);
	}
}
