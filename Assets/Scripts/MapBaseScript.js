#pragma strict

import System.Collections.Generic;

class MapBaseScript extends MonoBehaviour
{
	var location : String;
	var collisionMask : Texture2D;
	var text : TextAsset;

	private var obstacles = Dictionary.<String, String>();
	private var objects = Dictionary.<String, String>();
	private var events = Dictionary.<String, String>();

	function Awake ()
	{
		var lines = text.text.Split('\n'[0]);
		for (var l=0; l<lines.GetLength(0); l++)
		{
			var line = lines[l].Trim();
			if (line == "")
				continue;
			var tokens = line.Split(':'[0]);
			var nametype = tokens[0].Trim ();
			var val = tokens[1].Trim();
			
			tokens = nametype.Split(' '[0]);
			var type = tokens[0].Trim();
			var name = tokens[tokens.GetLength(0)-1].Trim();
			
			tokens = val.Split(' '[0]);
			for (var t=0; t<tokens.GetLength(0); t++)
			{
				var coords = tokens[t].Trim();
				if (type == "Obstacle")
					obstacles[coords] = name;
				else if (type == "Object")
					objects[coords] = name;
				else if (type == "Event")
					events[coords] = name;
			}
		}
	}

	function nextChar(character : String, increment : int) : String
	{
		var intValue : int = character[0];
	    var charValue = System.Convert.ToChar(intValue + increment);
	    return System.Convert.ToString(charValue);
	}

	function getCoords(pos : Vector3) : String
	{
		var x = pos.x;
		var y = pos.y;
		return nextChar('A', x) + (-y);
	}

	function getCoordsObstacle(pos : Vector3, direction : String) : String
	{
		var x = pos.x;
		var y = pos.y;
		return nextChar('A', x) + (-y) + "_" + direction;
	}

	function getCoordsObject(pos : Vector3, direction : String) : String
	{
		var x = pos.x;
		var y = pos.y;
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
		return nextChar('A', x) + (-y) + "_" + direction;
	}

	function isWalkable(pos : Vector3, direction : String) : boolean
	{
		// Check other characters

		// Check obstacles
		if (obstacles.ContainsKey(getCoords(pos)))
			return false;
		if (obstacles.ContainsKey(getCoordsObstacle(pos, direction)))
			return false;

		// Check collision mask
		var x : int = pos.x;
		var y : int = pos.y;
		x = (x * 32) + 16;
		y = collisionMask.height + (y * 32) - 16;
		return collisionMask.GetPixel(x, y).a == 1;
	}

	function checkEvent(pos : Vector3, direction : String) : String
	{
		var coords = getCoords(pos);
		if (events.ContainsKey(coords))
			return events[coords];

		coords = getCoordsObstacle(pos, direction);
		if (events.ContainsKey(coords))
			return events[coords];

		return "";
	}

	function checkInteract(pos : Vector3, direction : String) : String
	{
		var coords = getCoords(pos);
		if (objects.ContainsKey(coords))
			return objects[coords];

		coords = getCoordsObject(pos, direction);
		if (objects.ContainsKey(coords))
			return objects[coords];

		return "";
	}
}
