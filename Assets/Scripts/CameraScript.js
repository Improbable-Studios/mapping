#pragma strict

enum FollowMode {Always, Smart, Manual, ERROR};

static var instance : CameraScript;

private var sr : SpriteRenderer;

private var followedObject : GameObject;
private var mode : FollowMode;

private var roomSize : Vector2;
private var screenSize : Vector2;
var captureRect : Rect;
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

	checkScreen();
}

function initialise()
{
    camera.orthographicSize = Screen.height / (2.0 * 32.0 * zoom);

    if (!sr)
        return;
    if (sr.sprite)
        Destroy(sr.sprite.texture);

    screenSize = Vector2(Screen.width, Screen.height);
    captureRect = Rect((screenSize.x-screenSize.x/zoom)/2f, (screenSize.y-screenSize.y/zoom)/2f, screenSize.x/zoom, screenSize.y/zoom);
    captureRect.width = Mathf.Floor(captureRect.width/2f)*2f;
    captureRect.x = (screenSize.x-captureRect.width)/2f;
    captureRect.height = Mathf.Floor(captureRect.height/2f)*2f;
    captureRect.y = (screenSize.y-captureRect.height)/2f;
    if (mode == FollowMode.Smart && roomSize.x > 0)
    {
        if (roomSize.x < captureRect.width)
        {
            captureRect.width = roomSize.x;
            captureRect.x = (screenSize.x-roomSize.x)/2f;
        }
        if (roomSize.y < captureRect.height)
        {
            captureRect.height = roomSize.y;
            captureRect.y = (screenSize.y-roomSize.y)/2f;
        }
    }

    var texture = new Texture2D(captureRect.width, captureRect.height, TextureFormat.ARGB32, false);
    texture.anisoLevel = 0;
    texture.filterMode = FilterMode.Point;
    var rect = Rect(0f, texture.height, texture.width, -texture.height);
    var pivot = Vector2(0.5f, 0.5f);
    sr.sprite = Sprite.Create(texture, rect, pivot, 32);
    sr.sprite.name = sr.name + "_sprite";

    if (followedObject)
        lookAt(followedObject);
}

function getCaptureRect()
{
    return captureRect;
}

function setOverlayBlending(flag : boolean)
{
    MapManagerScript.shaderOutput.SetActive(flag);
    if (flag)
        camera.cullingMask = (1 << LayerMask.NameToLayer("Final")) | (1 << LayerMask.NameToLayer("UI"));
    else
        camera.cullingMask = (1 << LayerMask.NameToLayer("Default")) | (1 << LayerMask.NameToLayer("UI"));
}

function checkScreen()
{
    if (screenSize.x != Screen.width || screenSize.y != Screen.height || zoom != Screen.height / (camera.orthographicSize * 2.0 * 32.0))
    {
        initialise();
    }
}

function setZoom(zoom_ : float)
{
    if (zoom == zoom_)
        return;
    zoom = zoom_;
    initialise();
}

function roundToNearestPixel(unityUnits : float, viewingCamera : Camera)
{
	var valueInPixels = (Screen.height / (viewingCamera.orthographicSize * 2)) * unityUnits;
	valueInPixels = Mathf.Round(valueInPixels);
	var adjustedUnityUnits = valueInPixels / (Screen.height / (viewingCamera.orthographicSize * 2));
	return adjustedUnityUnits;
}

function onePixel()
{
    return 1f / 32f;
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
    if (width == roomSize.x && height == roomSize.y)
        return;
    roomSize = Vector2(width, height);
    initialise();
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
    }
    else if (mode == FollowMode.Smart)
    {
        var screenWidth = captureRect.width / 32f;
        var screenHeight = captureRect.height / 32f;
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

        if (MapManagerScript.shaderOutput.activeInHierarchy)
        {
            var shaderCamPos = Vector3();
            if (screenSize.x % 2 == 1)
                shaderCamPos.x = onePixel() / (2f * zoom);
            if (screenSize.y % 2 == 1)
                shaderCamPos.y = -onePixel() / (2f * zoom);
            transform.position = newCameraPos;
            MapManagerScript.shaderCamera.transform.position = shaderCamPos + newCameraPos;
        }
        else
        {
            if (screenSize.x % 2 == 1)
                newCameraPos.x -= onePixel() / (2f * zoom);
            if (screenSize.y % 2 == 1)
                newCameraPos.y += onePixel() / (2f * zoom);
        }

//        Debug.Log(screenSize + " -- " + roomSize + " -- " + captureRect);
//        Debug.Log(newCameraPos.x/onePixel() + ", " + newCameraPos.y/onePixel());
    }
    if (SystemInfo.graphicsShaderLevel <= 30)
    {
        if (MapManagerScript.shaderOutput.activeInHierarchy)
        {
            newCameraPos.x -= onePixel() * zoom / 4f;
            newCameraPos.y += onePixel() * zoom / 4f;
        }
        else
        {
            newCameraPos.x -= onePixel() * zoom / 8f;
            newCameraPos.y += onePixel() * zoom / 8f;
        }
    }
    transform.position = newCameraPos;
}