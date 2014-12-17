Shader "Custom/OverlayBlend"
{
    Properties
    {
        [PerRendererData] _MainTex ("Sprite Texture", 2D) = "white" {}
        _OverlayTex ("Overlay", 2D) = "white" {}
        _BackgroundTex ("Background", 2D) = "white" {}
    }
   
    SubShader
    {
        Tags
        {
            "Queue" = "Transparent"
            "IgnoreProjector"="True" 
            "RenderType" = "Transparent"
            "PreviewType"="Plane"
            "CanUseSpriteAtlas"="True"
        }

		Cull Off
        Lighting Off
  		ZWrite Off
		Fog { Mode Off }
        Blend SrcAlpha OneMinusSrcAlpha
       
        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma fragmentoption ARB_precision_hint_fastest
           
            #include "UnityCG.cginc"
           
            struct appdata_custom
            {
                float4 vertex : POSITION;
                fixed2 uv : TEXCOORD0;
                float4 color : COLOR;
            };
           
            struct v2f
            {
                float4 vertex : POSITION;
                fixed2 uv : TEXCOORD0;
                float4 color : COLOR;
            };
           
            sampler2D _MainTex;
            fixed4 _MainTex_ST;
            sampler2D _OverlayTex;
            fixed4 _OverlayTex_ST;
            sampler2D _BackgroundTex;
            fixed4 _BackgroundTex_ST;
           
            v2f vert (appdata_custom v)
            {
                v2f o;
                o.vertex = mul(UNITY_MATRIX_MVP, v.vertex);
                o.uv = TRANSFORM_TEX(v.uv,_BackgroundTex);
                o.color = v.color;
                return o;
            }          
           
            fixed4 frag (v2f i) : COLOR
            {
                fixed4 diffuse = tex2D(_OverlayTex, i.uv);
                fixed4 text = tex2D(_BackgroundTex, i.uv);
                fixed luminance =  dot(diffuse, fixed4(0.2126, 0.7152, 0.0722, 0));
                fixed oldAlpha = diffuse.a;

                if (luminance < 0.5)
                    diffuse *= 2 * text;
                else
                    diffuse = 1-2*(1-diffuse)*(1-text);
                diffuse.a  = oldAlpha * text.a;

                return diffuse;
            }
            ENDCG
        }
    }
    Fallback off
}