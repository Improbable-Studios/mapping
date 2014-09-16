import UnityEngine;
import UnityEditor;
 
class TexturePreProcessor extends AssetPostprocessor
{
    function OnPreprocessTexture()
    {
        var importer : TextureImporter = assetImporter;
	    importer.textureType = TextureImporterType.Advanced;
	    importer.npotScale = TextureImporterNPOTScale.None;
	    importer.mipmapEnabled = false;
	    importer.textureFormat = TextureImporterFormat.AutomaticTruecolor;
	    importer.anisoLevel = 0;
	    importer.filterMode = FilterMode.Point;
	    importer.isReadable = true;
	    importer.maxTextureSize = 4096;
	    importer.spritePixelsToUnits = 32;
	    var pivot = Vector2(0f, 0f); //top left;
	    importer.spritePivot = pivot;
    }
}