#pragma strict

var destinationObject : GameObject;
var textureName : String;

var outputTexture : Texture2D;

private var sr : SpriteRenderer;
private var captureRect : Rect;

function Awake()
{
	sr = destinationObject.GetComponent(SpriteRenderer);
}

function OnEnable()
{
	if (CameraScript.instance && captureRect != CameraScript.instance.getCaptureRect())
		initialise();
}

function initialise()
{
    camera.orthographicSize = Screen.height / (2.0 * 32.0);
    captureRect = CameraScript.instance.getCaptureRect();
	outputTexture = new Texture2D(captureRect.width, captureRect.height, TextureFormat.ARGB32, false);
	outputTexture.name = textureName;
	outputTexture.anisoLevel = 0;
	outputTexture.filterMode = FilterMode.Point;
	Destroy(sr.material.GetTexture(textureName));
	sr.material.SetTexture(textureName, outputTexture);
}

function OnPostRender()
{
	if (CameraScript.instance && captureRect != CameraScript.instance.getCaptureRect())
		initialise();
 	outputTexture.ReadPixels(captureRect, 0, 0, false);
	outputTexture.Apply(false, false);
}