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
        ZTest Always
		Fog { Mode Off }
        Blend SrcAlpha OneMinusSrcAlpha
       
        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma fragmentoption ARB_precision_hint_fastest
            #include "UnityCG.cginc"

            sampler2D _MainTex;
            fixed4 _MainTex_ST;
            sampler2D _OverlayTex;
            fixed4 _OverlayTex_ST;
            sampler2D _BackgroundTex;
            fixed4 _BackgroundTex_ST;

            struct appdata_t
            {
                float4 vertex   : POSITION;
                float2 texcoord : TEXCOORD0;
            };

            struct v2f
            {
                float4 vertex        : POSITION;
                float2 texcoord      : TEXCOORD0;
            };

            v2f vert(appdata_t IN)
            {
                v2f OUT;
                OUT.vertex = mul(UNITY_MATRIX_MVP, IN.vertex);
                OUT.texcoord = TRANSFORM_TEX(IN.texcoord, _MainTex);

                // Snapping params
                float hpcX = _ScreenParams.x * 0.5;
                float hpcY = _ScreenParams.y * 0.5;
            #ifdef UNITY_HALF_TEXEL_OFFSET
                float hpcOX = -0.5;
                float hpcOY = 0.5;
            #else
                float hpcOX = 0;
                float hpcOY = 0;
            #endif  
                // Snap
                float pos = floor((OUT.vertex.x / OUT.vertex.w) * hpcX + 0.5f) + hpcOX;
                OUT.vertex.x = pos / hpcX * OUT.vertex.w;

                pos = floor((OUT.vertex.y / OUT.vertex.w) * hpcY + 0.5f) + hpcOY;
                OUT.vertex.y = pos / hpcY * OUT.vertex.w;

                return OUT;
            }
           
            fixed4 frag (v2f i) : COLOR
            {
                fixed4 diffuse = tex2D(_OverlayTex, i.texcoord);
                fixed4 text = tex2D(_BackgroundTex, i.texcoord);
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