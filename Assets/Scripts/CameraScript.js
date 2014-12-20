#pragma strict

enum FollowMode {Always, Smart, Manual, ERROR};

static var instance : CameraScript;

private var sr : SpriteRenderer;

private var followedObject : GameObject;
private var mode : FollowMode;

private var roomSize : Vector2;
private var screenSize : Vector2;
private var zoom = 1f;


function Awake()
{
    instance = this;
}

function Start ()
{	
	sr = MapManagerScript.shaderOutput.GetComponent(SpriteRenderer) as SpriteRenderer;
}

function Update()
{
	if (Screen.fullScreen)
	{
		var res = Screen.resolutions[Screen.resolutions.Length-1];
		if (Screen.width != res.width || Screen.height != res.height)
			Screen.SetResolution(res.width, res.height, true);
	}

	if (screenSize.x != Screen.width || screenSize.y != Screen.height || zoom != Screen.height / (camera.orthographicSize * 2.0 * 32.0))
	{
		setCameraZoom(zoom, camera);
		initialise();
	}
}

function initialise()
{
    if (sr.sprite)
        Destroy(sr.sprite.texture);
    screenSize = Vector2(Screen.width, Screen.height);
    var texture = new Texture2D(Screen.width/zoom, Screen.height/zoom, TextureFormat.ARGB32, false);
    texture.anisoLevel = 0;
    texture.filterMode = FilterMode.Point;
    var rect = Rect(0f, texture.height, texture.width, -texture.height);
    var pivot = Vector2(0.5f, 0.5f);
    sr.sprite = Sprite.Create(texture, rect, pivot, 32);
    sr.sprite.name = sr.name + "_sprite";
    if (followedObject)
        lookAt(followedObject);
}

function setOverlayBlending(flag : boolean)
{
    MapManagerScript.shaderOutput.SetActive(flag);
    if (flag)
        camera.cullingMask = (1 << LayerMask.NameToLayer("Final")) | (1 << LayerMask.NameToLayer("UI"));
    else
        camera.cullingMask = (1 << LayerMask.NameToLayer("Default")) | (1 << LayerMask.NameToLayer("UI"));
}

function setCameraZoom(zoom_ : float, viewingCamera : Camera)
{
	zoom = zoom_;
	viewingCamera.orthographicSize = Screen.height / (2.0 * 32.0 * zoom);
}

function roundToNearestPixel(unityUnits : float, viewingCamera : Camera)
{
	var valueInPixels = (Screen.height / (viewingCamera.orthographicSize * 2)) * unityUnits;
	valueInPixels = Mathf.Round(valueInPixels);
	var adjustedUnityUnits = valueInPixels / (Screen.height / (viewingCamera.orthographicSize * 2));
	return adjustedUnityUnits;
}

function onePixel(viewingCamera : Camera)
{
	return 1f / (Screen.height / (viewingCamera.orthographicSize * 2));
}

function setFollow(obj : GameObject, mode_ : FollowMode)
{
    followedObject = obj;
    mode = mode_;
    lookAt(obj);
}

function setRoomSize(width : float, height : float)
{
    roomSize = Vector2(width, height);
}

function lookAt(obj : GameObject)
{
    if (mode == FollowMode.Manual || mode == FollowMode.ERROR || obj != followedObject)
        return;    

    if (mode == FollowMode.Always)
    {
    	var newCameraPos = obj.transform.position;
        newCameraPos.x += 0.5f;
        newCameraPos.y -= 0.5f;
    	newCameraPos.z = transform.position.z;
    	transform.position = newCameraPos;
    }
    else if (mode == FollowMode.Smart)
    {
//        Debug.Log(Screen.width + ", " + Screen.height + " -- " + transform.position.x * (2f * 32f) + "+" + roomSize.x*zoom +
//                                                          ", " + -transform.position.y * (2f * 32f) + "+" + roomSize.y*zoom);
        var screenWidth = screenSize.x / (32f * zoom);
        var screenHeight = screenSize.y / (32f * zoom);
        var roomWidth = roomSize.x / 32f;
        var roomHeight = roomSize.y / 32f;
        var posX = obj.transform.position.x + 0.5f;
        var posY = -obj.transform.position.y + 0.5f;

        newCameraPos = transform.position;
        if (screenWidth < roomWidth)
        {
            if (posX < screenWidth / 2f)
                newCameraPos.x = screenWidth / 2f;
            else if (posX + screenWidth / 2f > roomWidth)
                newCameraPos.x = roomWidth - screenWidth / 2f;
            else
                newCameraPos.x = posX;
        }
        else
            newCameraPos.x = roomWidth / 2f;;

        if (screenHeight < roomHeight)
        {
            if (posY < screenHeight / 2f)
                newCameraPos.y = -screenHeight / 2f;
            else if (posY + screenHeight / 2f > roomHeight)
                newCameraPos.y = -(roomHeight - screenHeight / 2f);
            else
                newCameraPos.y = -posY;
        }
        else
            newCameraPos.y = -roomHeight / 2f;
        transform.position = newCameraPos;
    }
}