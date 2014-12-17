#pragma strict

var follow : GameObject;
var finalTexture : GameObject;

function Awake ()
{
	var sr = finalTexture.GetComponent(SpriteRenderer) as SpriteRenderer;
	var texture = new Texture2D(Screen.width, Screen.height, TextureFormat.ARGB32, false);
//	var texture = Resources.Load("maps/221/Interior/221B/LivingRoom/Layers/back") as Texture2D;
	var rect = Rect(0f, texture.height, texture.width, -texture.height);
	var pivot = Vector2(0.5f, 0.5f);
	sr.sprite = Sprite.Create(texture, rect, pivot, 32);
	sr.sprite.name = sr.name + "_sprite";
}


