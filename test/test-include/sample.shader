Shader "Custom/TestShader"
{
    Properties
    {
    }
    SubShader
    {
        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag

            #include "includes/test_include.hlsl"
            #include "missing.cginc"

            struct appdata
            {
                float4 vertex : POSITION;
            };
            struct v2f
            {
                float4 vertex : SV_POSITION;
            };

            v2f vert(appdata v)
            {
                v2f o;
                o.vertex = v.vertex;
                return o;
            }

            fixed4 frag(v2f i) : SV_Target
            {
                return TestFunction();
            }
            ENDCG
        }
    }
}
