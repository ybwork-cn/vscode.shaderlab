// Included content

cbuffer TestBuffer
{
    float4 aa[10];
};

float4 TestFunction(float a)
{
    float4 color = float4(0, 1, 0, a);
    return color;
}
