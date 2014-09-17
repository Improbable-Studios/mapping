#pragma strict

import System.IO;

@CustomEditor (ResourceManagerScript)
public class ResourceManagerEditor extends Editor
{
    function OnInspectorGUI()
    {
        DrawDefaultInspector();
        
        var myScript : ResourceManagerScript = target;
        if(GUILayout.Button("Generate JSON Directory"))
        {
			var json = myScript.generateJSON();
			var f = File.CreateText(Application.dataPath + "/Resources/directory.json");
			f.Write(json);
			f.Close();
       	}
    }
}