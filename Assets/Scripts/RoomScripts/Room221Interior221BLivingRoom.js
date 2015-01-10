#pragma strict

class Room221Interior221BLivingRoom extends RoomScript
{
	var tvAudio : AudioClip;

	private var player : MainPlayerScript;
	private var character : CharacterScript;

	function Awake()
	{
		player = GameObject.Find("Player").GetComponent(MainPlayerScript);
		character = GameObject.Find("Player").GetComponent(CharacterScript);
		tvAudio = Resources.Load("audio/Ambiance/TV/Baseball") as AudioClip;
		super.Awake();
	}

	function TV()
	{
		if (ambience2script.isPlaying())
			ambience2script.changeClip(null, 1.0f, true);
		else
			ambience2script.changeClip(tvAudio, 1.0f, true);
	}
}
