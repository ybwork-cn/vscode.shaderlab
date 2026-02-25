// Test HLSL file for DocumentLinkProvider
#include "includes/test_include.hlsl"
#include "missing_file.hlsl"

cbuffer TestBuffer
{
    float4 aa[10];
};

float4 main() : SV_Target
{
    return TestFunction(0);
}
