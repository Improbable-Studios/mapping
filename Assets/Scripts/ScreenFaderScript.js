#pragma strict

static private var instance : ScreenFaderScript;
static private var targetColor : Color;
static private var deltaColor : Color;

static private var isRunning : boolean;

function Awake ()
{
    instance = this;
    // Set the texture so that it is the the size of the screen and covers it.
    targetColor = guiTexture.color;
    guiTexture.enabled = false;
	guiTexture.color = new Color(targetColor.r, targetColor.g, targetColor.b, 0);
    guiTexture.pixelInset = new Rect(0f, 0f, Screen.width, Screen.height);
    isRunning = false;
}

static function fadeIn(fadeDuration : float)
{
	return fadeIn(fadeDuration, instance.guiTexture.color);
}

static function fadeIn(fadeDuration : float, targetColor_ : Color)
{
    while (isRunning)
        yield;
	targetColor = new Color(targetColor_.r, targetColor_.g, targetColor_.b, 0f);

	if (fadeDuration <= 0.0f)		
	{
		instance.guiTexture.enabled = false;
	}
	else					
	{
		deltaColor = (targetColor - instance.guiTexture.color) / fadeDuration;
	
        isRunning = true;
		while (Mathf.Abs(instance.guiTexture.color.a - targetColor.a) > Mathf.Abs(deltaColor.a) * Time.deltaTime)
		{
			instance.guiTexture.color += deltaColor * Time.deltaTime;
			yield;
		}
		instance.guiTexture.enabled = false;
        isRunning = false;
	}
}

static function fadeOut(fadeDuration : float)
{
	return fadeOut(fadeDuration, instance.guiTexture.color);
}

static function fadeOut(fadeDuration : float, targetColor_ : Color)
{
    while (isRunning)
        yield;
	targetColor = new Color(targetColor_.r, targetColor_.g, targetColor_.b, 0.5f);

	if (fadeDuration <= 0.0f)		
	{
		instance.guiTexture.color = targetColor;
		instance.guiTexture.enabled = true;
	}
	else					
	{
		instance.guiTexture.enabled = true;
		deltaColor = (targetColor - instance.guiTexture.color) / fadeDuration;
	
        isRunning = true;
		while (Mathf.Abs(instance.guiTexture.color.a - targetColor.a) > Mathf.Abs(deltaColor.a) * Time.deltaTime)
		{
			instance.guiTexture.color += deltaColor * Time.deltaTime;
			yield;
		}
		instance.guiTexture.color = targetColor;
        isRunning = false;
	}
}
