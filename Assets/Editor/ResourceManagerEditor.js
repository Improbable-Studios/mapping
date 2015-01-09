#pragma strict

import System;
import System.IO;
import System.Collections.Generic;
import System.Runtime.Serialization.Formatters.Binary;

@CustomEditor (ResourceManagerScript)
public class ResourceManagerEditor extends Editor
{
    function OnInspectorGUI()
    {
        DrawDefaultInspector();
        
        var myScript : ResourceManagerScript = target as ResourceManagerScript;
        if(GUILayout.Button("Refresh Resources"))
        {
            myScript.generateDirectoryJSON();
            myScript.downloadLocationsSpreadsheet();

            var r = ResourceSerializable();
            r.directoryJsonStr = myScript.directoryJson.ToString();
            r.locationsTab = myScript.locationsTab;
            var str = myScript.serialize(r);

            var f = File.CreateText(Application.dataPath + "/Data/Resources/resource.txt");
            f.Write(str);
            f.Close();
            AssetDatabase.Refresh();
            
//            myScript.finishedDownloadLocationsSpreadsheet();
            Debug.Log("DONE: File saved!");
       	}
    }
}