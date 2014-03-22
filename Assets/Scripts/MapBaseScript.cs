using UnityEngine;
using System.Collections;
using System.Collections.Generic;

public class MapBaseScript : MonoBehaviour {

	public string location;
	public Texture2D collisionMask;
	public TextAsset text;

	private Dictionary<string, string> obstacles = new Dictionary<string, string>();
	private Dictionary<string, string> objects = new Dictionary<string, string>();
	private Dictionary<string, string> events = new Dictionary<string, string>();

	void Awake ()
	{
		string[] lines = text.text.Split('\n');
		for (int l=0; l<lines.GetLength(0); l++)
		{
			string line = lines[l].Trim();
			if (line == "")
				continue;
			string[] tokens = line.Split(':');
			string nametype = tokens[0].Trim ();
			string value = tokens[1].Trim();
			
			tokens = nametype.Split(' ');
			string type = tokens[0].Trim();
			string name = tokens[tokens.GetLength(0)-1].Trim();
			
			tokens = value.Split(' ');
			for (int t=0; t<tokens.GetLength(0); t++)
			{
				string coords = tokens[t].Trim();
				if (type == "Obstacle")
					obstacles[coords] = name;
				else if (type == "Object")
					objects[coords] = name;
				else if (type == "Event")
					events[coords] = name;
			}
			
		}
	}

	public string getCoords(Vector3 pos)
	{
		int x = (int)pos.x;
		int y = (int)pos.y;
		return ((char)('A'+x)).ToString() + (-y);
	}

	public string getCoordsObstacle(Vector3 pos, string direction)
	{
		int x = (int)pos.x;
		int y = (int)pos.y;
		return ((char)('A'+x)).ToString() + (-y) + "_" + direction;
	}

	public string getCoordsObject(Vector3 pos, string direction)
	{
		int x = (int)pos.x;
		int y = (int)pos.y;
		switch (direction)
		{
		case "Up":
			y++;
			break;
		case "Down":
			y--;
			break;
		case "Left":
			x--;
			break;
		case "Right":
			x++;
			break;
		}
		return ((char)('A'+x)).ToString() + (-y) + "_" + direction;
	}

	public bool isWalkable(Vector3 pos, string direction)
	{
		// Check other characters

		// Check obstacles
		if (obstacles.ContainsKey(getCoords(pos)))
			return false;
		if (obstacles.ContainsKey(getCoordsObstacle(pos, direction)))
			return false;

		// Check collision mask
		int x = (int)pos.x;
		int y = (int)pos.y;
		x = (x * 32) + 16;
		y = collisionMask.height + (y * 32) - 16;
		return collisionMask.GetPixel(x, y).a == 1;
	}

	public string checkEvent(Vector3 pos, string direction)
	{
		string coords = getCoords(pos);
		if (events.ContainsKey(coords))
			return events[coords];

		coords = getCoordsObstacle(pos, direction);
		if (events.ContainsKey(coords))
			return events[coords];

		return "";
	}

	public string checkInteract(Vector3 pos, string direction)
	{
		string coords = getCoords(pos);
		if (objects.ContainsKey(coords))
			return objects[coords];

		coords = getCoordsObject(pos, direction);
		if (objects.ContainsKey(coords))
			return objects[coords];

		return "";
	}
}
