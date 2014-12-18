#pragma strict

var destinationObject : GameObject;
var textureName : String;

var outputTexture : Texture2D;

private var sr : SpriteRenderer;
private var captureRect : Rect;
private var screenSize : Vector2;
private var zoom = 1f;

function Awake()
{
	sr = destinationObject.GetComponent(SpriteRenderer);
}

function OnEnable()
{
	if (screenSize.x != Screen.width || screenSize.y != Screen.height || zoom != camera.orthographicSize / Camera.main.orthographicSize)
		initialise();
}

function initialise()
{
	camera.orthographicSize = Screen.height / (2.0 * 32.0);
	zoom = camera.orthographicSize / Camera.main.orthographicSize;
	screenSize = Vector2(Screen.width, Screen.height);
	outputTexture = new Texture2D(Screen.width/zoom, screenSize.y/zoom, TextureFormat.ARGB32, false);
	outputTexture.name = textureName;
	outputTexture.anisoLevel = 0;
	outputTexture.filterMode = FilterMode.Point;
	Destroy(sr.material.GetTexture(textureName));
	sr.material.SetTexture(textureName, outputTexture);
	captureRect = new Rect((Screen.width-screenSize.x/zoom)/2f, (Screen.height-screenSize.y/zoom)/2f, screenSize.x/zoom, screenSize.y/zoom);	
}

function OnPostRender()
{
	if (screenSize.x != Screen.width || screenSize.y != Screen.height || zoom != camera.orthographicSize / Camera.main.orthographicSize)
		initialise();
 	outputTexture.ReadPixels(captureRect, 0, 0, false);
	outputTexture.Apply(false, false);
}