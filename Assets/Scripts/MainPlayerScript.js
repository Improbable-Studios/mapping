#pragma strict

class MainPlayerScript extends MonoBehaviour
{
	var speed = 1f;
	var direction = "Down";
	var isCameraFollow = true;

	private var isWalking = false;
	private var isInteracting = false;

	private var map : MapBaseScript;
	private var animator : Animator;
	private var fractionMoved = 0f;
	private var moveVector : Vector3;
	private var origin : Vector3;

	function Awake()
	{
		map = GameObject.Find("Map").GetComponent(MapBaseScript);
		animator = GetComponent(Animator);
	}

	function Start ()
	{
		animator.speed = speed;
		animator.SetTrigger("Idle" + direction);
		if (isCameraFollow)
		{
			var newCameraPos = transform.position;
			newCameraPos.x += 0.5f;
			newCameraPos.y -= 0.5f;
			newCameraPos.z = -10f;
			Camera.main.transform.position = newCameraPos;
		}
	}
	
	function Update ()
	{
		if (!isWalking && !isInteracting) checkInput();

		if (isWalking) animateWalk();
	}

	function checkInput()
	{
		if (Input.GetKey(KeyCode.RightArrow))
			doWalk("Right");
		else if (Input.GetKey(KeyCode.DownArrow))
			doWalk("Down");
		else if (Input.GetKey(KeyCode.UpArrow))
			doWalk("Up");
		else if (Input.GetKey(KeyCode.LeftArrow))
			doWalk("Left");
		else if (Input.GetKeyDown(KeyCode.Space))
		{
			name = map.checkInteract(transform.position, direction);
			if (name != "")
			{
				map.Invoke (name, 0f);
			}
		}
	}

	function doWalk(input : String)
	{
		direction = input;
		moveVector = new Vector3();
		switch (direction)
		{
		case "Up":
			moveVector.y = 1;
			break;
		case "Right":
			moveVector.x = 1;
			break;
		case "Down":
			moveVector.y = -1;
			break;
		case "Left":
			moveVector.x = -1;
			break;
		}

		var dest = transform.position + moveVector;
		if (map.isWalkable(dest, direction))
		{
			isWalking = true;
			fractionMoved = 0f;
			origin = transform.position;
			animator.SetTrigger("Walk" + direction);
		}
		else
		{
			animator.SetTrigger("Idle" + direction);
		}
	}

	function animateWalk()
	{
		fractionMoved += Time.deltaTime * speed;
		if (fractionMoved > 1f)
			fractionMoved = 1f;

		// 10, 8, 6, 8
		var transformedFractionMoved = 0f;
		if (fractionMoved < 0.25)
			transformedFractionMoved = 10f/32f * fractionMoved * 4f;
		else if (fractionMoved < 0.50)
			transformedFractionMoved = 10f/32f + (8f/32f * (fractionMoved-0.25f) * 4f);
		else if (fractionMoved < 0.75)
			transformedFractionMoved = 18f/32f + (6f/32f * (fractionMoved-0.50f) * 4f);
		else
			transformedFractionMoved = 24f/32f + (8f/32f * (fractionMoved-0.75f) * 4f);
		transform.position = origin + moveVector * transformedFractionMoved;

		if (isCameraFollow)
		{
			var newCameraPos = transform.position;
			newCameraPos.x += 0.5f;
			newCameraPos.y -= 0.5f;
			newCameraPos.z = -10f;
			Camera.main.transform.position = newCameraPos;
		}

		if (fractionMoved == 1f)
		{
			isWalking = false;
			animator.SetBool("AlternateWalk", !animator.GetBool("AlternateWalk"));
			name = map.checkEvent(transform.position, direction);
			if (name != "")
			{
				map.Invoke (name, 0f);
			}
		}
	}
}
