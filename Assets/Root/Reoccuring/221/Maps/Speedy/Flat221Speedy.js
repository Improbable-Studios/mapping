#pragma strict

class Flat221Speedy extends MapBaseScript
{
	private var player : MainPlayerScript;

	function Awake()
	{
		player = GameObject.Find("Player").GetComponent(MainPlayerScript);
	}
}
