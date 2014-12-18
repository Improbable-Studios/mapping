#pragma strict

var follow : GameObject;
var finalTexture : GameObject;

private var sr : SpriteRenderer;
private var screenSize : Vector2;
private var zoom = 1f;

function Awake ()
{	
	sr = finalTexture.GetComponent(SpriteRenderer) as SpriteRenderer;
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
	
//	if (finalTexture.active)
//		setCameraZoom(1f, camera);
//	else
//		setCameraZoom(zoom, camera);
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

function lookAt(obj : GameObject)
{
	var newCameraPos = obj.transform.position;
	newCameraPos.x += 0.5f + onePixel(camera)/2f;
	newCameraPos.y -= 0.5f;
	newCameraPos.z = transform.position.z;
	transform.position = newCameraPos;
}