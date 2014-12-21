#pragma strict

static var instance : Grid;

function Awake()
{
    instance = this;
}

static function nextChar(character : String, increment : int) : String
{
    var intValue : int = character[0];
    var charValue = System.Convert.ToChar(intValue + increment);
    return System.Convert.ToString(charValue);
}

static function nextPos(pos : Vector3, direction : String) : Vector3
{
    var newPos = pos;
    switch (direction)
    {
    case "North":
        newPos.y++;
        break;
    case "South":
        newPos.y--;
        break;
    case "West":
        newPos.x--;
        break;
    case "East":
        newPos.x++;
        break;
    }
    return newPos;
}

static function previousPos(pos : Vector3, direction : String) : Vector3
{
    var newPos = pos;
    switch (direction)
    {
    case "North":
        newPos.y--;
        break;
    case "South":
        newPos.y++;
        break;
    case "West":
        newPos.x++;
        break;
    case "East":
        newPos.x--;
        break;
    }
    return newPos;
}

static function getPos(coords : String) : Vector3
{
    var x : int = coords[0];
    var a : int = 'A'[0];
    x -= a;
    var y : int = int.Parse(coords[1:]);
    return Vector3(x, -y+1, 0f);
}

static function getCoords(pos : Vector3) : String
{
    var x = pos.x;
    var y = pos.y;
    return nextChar('A', x) + (1-y);
}

static function getCoordsDirectional(pos : Vector3, direction : String) : String
{
    var x = pos.x;
    var y = pos.y;
    return getCoords(pos) + "_" + direction;
}

static function isValidCoords(coords : String) : boolean
{
    var x : int = coords[0];
    var a : int = 'A'[0];
    x -= a;
    var y : int;
    var res : boolean = int.TryParse(coords[1:], y);

    return x>=0 && res;
}
