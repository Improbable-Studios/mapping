#pragma strict

import System.IO;

@CustomEditor (MapManagerScript)
public class MapManagerEditor extends Editor
{
	var locationText = "221";

	function OnEnable()
	{
	}

    function OnInspectorGUI()
    {
        DrawDefaultInspector();
        
        var mapScript : MapManagerScript = target as MapManagerScript;
        var resourceScript : ResourceManagerScript = GameObject.Find("Manager").GetComponent(ResourceManagerScript) as ResourceManagerScript;
        GUILayout.Label("== EDITOR SCRIPTS ==");
        GUILayout.BeginHorizontal();
        GUILayout.Label("Location");
        locationText = GUILayout.TextField(locationText);
        if(GUILayout.Button("Load"))
        {
        	resourceScript.Awake();
			mapScript.Awake();
			mapScript.loadLocation(locationText);
       	}
        GUILayout.EndHorizontal();
    }
}