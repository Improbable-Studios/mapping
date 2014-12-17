#pragma strict

var destinationObject : GameObject;
var textureName : String;

var outputTexture : Texture2D;

private var sr : SpriteRenderer;
private var captureRect : Rect;

function Awake ()
{
	sr = destinationObject.GetComponent(SpriteRenderer);
	outputTexture = new Texture2D(Screen.width, Screen.height, TextureFormat.ARGB32, false);
	outputTexture.name = textureName;
	outputTexture.anisoLevel = 0;
	outputTexture.filterMode = FilterMode.Point;
	sr.material.SetTexture(textureName, outputTexture);
	captureRect = new Rect(0f, 0f, Screen.width, Screen.height);	
	camera.orthographicSize = Screen.height / (2.0 * 32.0);
}

function OnPostRender()
{
	outputTexture.ReadPixels(captureRect, 0, 0, false);
	outputTexture.Apply(false, false);
}