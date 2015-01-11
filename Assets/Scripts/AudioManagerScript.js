#pragma strict

class AudioManagerScript extends MonoBehaviour
{
    static var instance : AudioManagerScript;

    static var bgmPlayer : AudioSource;
    static var bgmScript : AudioScript;
    static var ambiancePlayers : Dictionary.<String, AudioSource>;
    static var ambianceScripts : Dictionary.<String, AudioScript>;
    static var sfxPlayers : Dictionary.<String, AudioSource>;
    static var sfxScripts : Dictionary.<String, AudioScript>;
    static var audioClips : Dictionary.<String, AudioClip>;

    static var ambianceObject : GameObject;
    static var ambiancePrefab : GameObject;
    static var sfxObject : GameObject;
    static var sfxPrefab : GameObject;

    var pathToAudio = "audio";
    var preLoadAllAudio = false;
    var preLoadLocationAudio = true;

    private var resource : ResourceManagerScript;

    function Awake ()
    {
        instance = this;
        resource = ResourceManagerScript.instance;

        bgmPlayer = GameObject.Find("Background Music").GetComponent(AudioSource);
        bgmScript = GameObject.Find("Background Music").GetComponent(AudioScript);
        ambianceObject = GameObject.Find("Ambiance");
        ambiancePrefab = Resources.Load("AmbiancePrefab") as GameObject;
        sfxObject = GameObject.Find("SFX");
        sfxPrefab = Resources.Load("SFXPrefab") as GameObject;
        
        ambiancePlayers = Dictionary.<String, AudioSource>();
        ambianceScripts = Dictionary.<String, AudioScript>();
        sfxPlayers = Dictionary.<String, AudioSource>();
        sfxScripts = Dictionary.<String, AudioScript>();
        audioClips = Dictionary.<String, AudioClip>();
    }

    function getAudioClip(name : String)
    {
        if (!name || name == "")
            return null;
        if (!(name in audioClips))
            audioClips[name] = Resources.Load(pathToAudio + "/" + name) as AudioClip;
        return audioClips[name];
    }

    function playBGM(name : String, volume : float)
    {
        for (k in audioClips.Values)
            Debug.Log("PREVIOUS: " + k.name);
        StopCoroutine("playBGM");
        var previousClip = bgmPlayer.clip;
        var clip = getAudioClip(name);
        bgmScript.changeClip(clip, volume);
        if (!preLoadLocationAudio && previousClip && clip != previousClip)
        {
            while (bgmPlayer.clip != clip)
                yield;
            removeClip(previousClip);
        }
        for (k in audioClips.Values)
            Debug.Log("AFTER: " + k.name);
    }

    function playAmbiances(names : String[], volumes : float[])
    {
        var players : String[];
        if (names)
        {
            players = new String[names.Length];
            for (var i=0; i<names.Length; i++)
            {
                players[i] = "Room Ambiance " + i;
                playAmbiance(players[i], names[i], volumes[i], false);
            }
        }
        for (player in ambiancePlayers.Keys)
        {
            if (player in players)
                continue;
            stopAmbiance(player, false);
        }
    }

    function playAmbiance(player : String, name : String, volume : float, skipFade : boolean)
    {
        if (!(player in ambiancePlayers))
        {
            var object = gameObject.Instantiate(ambiancePrefab);
            object.transform.parent = ambianceObject.transform;
            object.name = player;
            ambiancePlayers[player] = object.GetComponent(AudioSource) as AudioSource;
            ambianceScripts[player] = object.GetComponent(AudioScript) as AudioScript;
            ambianceScripts[player].changeClip(getAudioClip(name), volume, skipFade);
        }
        else
        {
            var previousClip = ambiancePlayers[player].clip;
            var clip = getAudioClip(name);
            ambianceScripts[player].changeClip(clip, volume, skipFade);
            if (previousClip != clip)
                removeClip(previousClip);
        }
    }

    function stopAmbiance(player : String, skipFade : boolean)
    {
        if (player in ambiancePlayers)
        {
            if (skipFade)
                ambianceScripts[player].stopPlaying();
            else
                ambianceScripts[player].doFadeOut();
            if (!preLoadLocationAudio)
                removeAmbiance(player, true);
        }
    }

    function isAmbiancePlaying(player : String)
    {
        if (player in ambiancePlayers)
            return ambianceScripts[player].isPlaying();
    }
    
    function toggleAmbiance(player : String, name : String, volume : float, skipFade : boolean)
    {
        if (isAmbiancePlaying(player))
            stopAmbiance(player, skipFade);
        else
            playAmbiance(player, name, volume, skipFade);
    }

    function playSFX(player : String, name : String, volume : float)
    {
        if (!(player in sfxPlayers))
        {
            var object = gameObject.Instantiate(sfxPrefab);
            object.transform.parent = sfxObject.transform;
            object.name = player;
            sfxPlayers[player] = object.GetComponent(AudioSource) as AudioSource;
            sfxScripts[player] = object.GetComponent(AudioScript) as AudioScript;
            sfxScripts[player].changeClip(getAudioClip(name), volume, true, true);
        }
        else
        {
            var previousClip = sfxPlayers[player].clip;
            var clip = getAudioClip(name);
            sfxScripts[player].changeClip(clip, volume, true, true);
            if (previousClip != clip)
                removeClip(previousClip);
        }
        if (!preLoadLocationAudio)
            removeSFX(player, true);
    }
    
    function removeClip(clip : AudioClip)
    {
        for (k in List.<String>(audioClips.Keys))
        {
            if (audioClips[k] == clip)
                audioClips.Remove(k);
        }
    }
    
    function removeSFX(player : String, waitTillFinished : boolean)
    {
        var object = sfxScripts[player].gameObject;
        if (waitTillFinished)
            yield sfxScripts[player].waitTillFinished();
        if (!(player in sfxPlayers))
            return;
        removeClip(sfxPlayers[player].clip);
        sfxPlayers.Remove(player);
        sfxScripts.Remove(player);
        Destroy(object);
    }

    function removeAmbiance(player : String, waitTillFinished : boolean)
    {
        var object = ambianceScripts[player].gameObject;
        if (waitTillFinished)
            yield ambianceScripts[player].waitTillFinished();
        if (!(player in ambiancePlayers))
            return;
        removeClip(ambiancePlayers[player].clip);
        ambiancePlayers.Remove(player);
        ambianceScripts.Remove(player);
        Destroy(object);
    }

    function cleanUp(waitTillFinished : boolean)
    {
        if (!sfxObject)
            return;
        for (sfx in List.<String>(sfxPlayers.Keys))
            removeSFX(sfx, false);
        for (amb in List.<String>(ambiancePlayers.Keys))
            removeAmbiance(amb, false);
        audioClips.Clear();
    }
    
    function onRoomLeave()
    {
    }
    
    function onLocationLeave()
    {
        if (preLoadAllAudio)
            return;
        StopAllCoroutines();
        cleanUp(false);
    }
}