#pragma strict

var randomiseTime = false;
var pointSource = false;
var fadeOut = true;
var fadeIn = true;

private var sound : AudioSource;
private var volume : float;
private var minDiff = 0.4;

function Awake()
{
	sound = GetComponent(AudioSource);
	volume = sound.audio.volume;
}

function changeDefaultVolume(vol : float)
{
	volume = vol;
}

function changeCurrentVolume(vol : float)
{
	sound.audio.volume = vol;
}

function currentVolume()
{
	return sound.audio.volume;
}

function doFadeIn()
{
	sound.audio.volume = 0f;
	yield doFadeToVolume(volume, 2f);
}

function doFadeOut()
{
	if (sound.audio.volume > 0 && sound.audio.isPlaying)
		yield doFadeToVolume(0f, 2f);
	yield;
}

function doFadeToVolume(vol : float, speed : float)
{
	StopCoroutine("doFadeToVolume");

	var diff : float;
    if (vol > 0f && !isPlaying())
        sound.audio.Play();
	if (sound.audio.volume < vol)
	{
        diff = vol - sound.audio.volume;
        if (diff < minDiff)
            diff = minDiff;
		while (sound.audio.volume < vol)
		{
			sound.audio.volume += Time.deltaTime * diff * speed;
			yield;
		}
	}
	else
	{
        diff = sound.audio.volume - vol;
        if (diff < minDiff)
            diff = minDiff;
   	    while (sound.audio.volume > vol)
		{
			sound.audio.volume -= Time.deltaTime * diff * speed;
			yield;
		}
	}
	sound.audio.volume = vol;
    if (vol == 0f && isPlaying())
        stopPlaying();

	yield;
}

function changeClip(clip : AudioClip, vol : float, skipFade : boolean, interrupt : boolean)
{
	while (!sound)
		yield;
		
	StopAllCoroutines();
		
	if (interrupt || sound.audio.clip != clip)
	{
		volume = vol;
		if (!skipFade && fadeOut)
			yield doFadeOut();
		else
			sound.audio.volume = 0f;

		sound.audio.clip = clip;
		if (!pointSource)
			sound.panLevel = 0.0;
		if (sound.audio.clip && randomiseTime)
			sound.audio.time = UnityEngine.Random.Range(0f, sound.audio.clip.length);
		sound.audio.Play();
		if (!skipFade && fadeIn)
			yield doFadeIn();
		else
			sound.audio.volume = vol;
	}
	else
	{
		if (!isPlaying())
			sound.audio.Play();
		yield doFadeToVolume(vol, 1f);
	}
}

function changeClip(clip : AudioClip, vol : float, skipFade : boolean)
{
    return changeClip(clip, vol, skipFade, false);
}

function changeClip(clip : AudioClip, vol : float)
{
	return changeClip(clip, vol, false, false);
}

function isPlaying()
{
    if (!sound)
        return false;
	return sound.isPlaying;
}

function stopPlaying()
{
	sound.audio.Stop();
}

function waitTillFinished()
{
    while (isPlaying())
        yield;
}