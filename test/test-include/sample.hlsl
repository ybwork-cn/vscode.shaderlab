// Test HLSL file for DocumentLinkProvider
#include "includes/test_include.hlsl"
#include "missing_file.hlsl"

float4 main() : SV_Target
{
    return TestFunction();
}
