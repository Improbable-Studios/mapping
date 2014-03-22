using UnityEngine;
using System.Collections;

public class MainPlayerScript : MonoBehaviour
{
	public float speed = 1f;
	public string direction = "Down";
	public bool isCameraFollow = true;

	private bool isWalking = false;
	private bool isInteracting = false;

	private MapBaseScript map;
	private Animator animator;
	private float fractionMoved = 0f;
	private Vector3 moveVector;
	private Vector3 origin;

	void Awake()
	{
		map = GameObject.Find("Map").GetComponent<MapBaseScript>();
		animator = GetComponent<Animator>();
	}

	void Start ()
	{
		animator.speed = speed;
		animator.SetTrigger("Idle" + direction);
		if (isCameraFollow)
		{
			Vector3 newCameraPos = transform.position;
			newCameraPos.x += 0.5f;
			newCameraPos.y -= 0.5f;
			newCameraPos.z = -10f;
			Camera.main.transform.position = newCameraPos;
		}
	}
	
	void Update ()
	{
		if (!isWalking && !isInteracting) checkInput();

		if (isWalking) animateWalk();
	}

	void checkInput()
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
			string name = map.checkInteract(transform.position, direction);
			if (name != "")
			{
				map.Invoke (name, 0f);
			}
		}
	}

	void doWalk(string input)
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

		Vector3 dest = transform.position + moveVector;
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

	void animateWalk()
	{
		fractionMoved += Time.deltaTime * speed;
		if (fractionMoved > 1f)
			fractionMoved = 1f;

		// 10, 8, 6, 8
		float transformedFractionMoved = 0f;
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
			Vector3 newCameraPos = transform.position;
			newCameraPos.x += 0.5f;
			newCameraPos.y -= 0.5f;
			newCameraPos.z = -10f;
			Camera.main.transform.position = newCameraPos;
		}

		if (fractionMoved == 1f)
		{
			isWalking = false;
			animator.SetBool("AlternateWalk", !animator.GetBool("AlternateWalk"));
			string name = map.checkEvent(transform.position, direction);
			if (name != "")
			{
				map.Invoke (name, 0f);
			}
		}
	}
}
