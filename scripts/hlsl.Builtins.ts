import * as vscode from 'vscode';

/**
 * HLSL Built-in Function Definition
 */
export interface HlslFunctionDef {
    name: string;
    signature: string;
    description: string;
    category: 'math' | 'texture' | 'intrinsic' | 'compute' | 'unity' | 'barrier' | 'atomic';
}

/**
 * HLSL Semantic Definition
 */
export interface HlslSemanticDef {
    name: string;
    description: string;
    stage: 'vertex' | 'pixel' | 'compute' | 'geometry' | 'hull' | 'domain' | 'all';
}

// ============================================================================
// HLSL Basic Types
// ============================================================================

export const HLSL_SCALAR_TYPES = [
    'bool', 'int', 'uint', 'half', 'float', 'double', 'dword',
    'min16float', 'min10float', 'min16int', 'min12int', 'min16uint',
    'void', 'string'
];

export const HLSL_VECTOR_TYPES = [
    'float2', 'float3', 'float4', 'half2', 'half3', 'half4',
    'int2', 'int3', 'int4', 'uint2', 'uint3', 'uint4',
    'bool2', 'bool3', 'bool4', 'double2', 'double3', 'double4',
    'min16float2', 'min16float3', 'min16float4',
    'min16int2', 'min16int3', 'min16int4',
    'min16uint2', 'min16uint3', 'min16uint4',
];

export const HLSL_MATRIX_TYPES = [
    'float2x2', 'float2x3', 'float2x4',
    'float3x2', 'float3x3', 'float3x4',
    'float4x2', 'float4x3', 'float4x4',
    'half2x2', 'half3x3', 'half4x4',
    'int2x2', 'int3x3', 'int4x4',
    'uint2x2', 'uint3x3', 'uint4x4',
    'bool2x2', 'bool3x3', 'bool4x4',
    'double2x2', 'double3x3', 'double4x4',
    'matrix', 'row_major', 'column_major',
];

export const HLSL_SAMPLER_TYPES = [
    'sampler', 'sampler1D', 'sampler2D', 'sampler3D', 'samplerCUBE',
    'sampler_state', 'SamplerState', 'SamplerComparisonState',
];

export const HLSL_TEXTURE_TYPES = [
    'Texture1D', 'Texture1DArray',
    'Texture2D', 'Texture2DArray', 'Texture2DMS', 'Texture2DMSArray',
    'Texture3D', 'TextureCube', 'TextureCubeArray',
];

export const HLSL_RW_TEXTURE_TYPES = [
    'RWTexture1D', 'RWTexture1DArray',
    'RWTexture2D', 'RWTexture2DArray',
    'RWTexture3D',
];

export const HLSL_BUFFER_TYPES = [
    'Buffer', 'RWBuffer',
    'StructuredBuffer', 'RWStructuredBuffer',
    'ByteAddressBuffer', 'RWByteAddressBuffer',
    'AppendStructuredBuffer', 'ConsumeStructuredBuffer',
];

export const HLSL_ALL_TYPES = new Set([
    ...HLSL_SCALAR_TYPES,
    ...HLSL_VECTOR_TYPES,
    ...HLSL_MATRIX_TYPES,
    ...HLSL_SAMPLER_TYPES,
    ...HLSL_TEXTURE_TYPES,
    ...HLSL_RW_TEXTURE_TYPES,
    ...HLSL_BUFFER_TYPES,
]);

/**
 * Check if a type name is a valid HLSL type
 */
export const isHlslType = (typeName: string): boolean => {
    return HLSL_ALL_TYPES.has(typeName);
};

// ============================================================================
// HLSL Keywords
// ============================================================================

export const HLSL_CONTROL_KEYWORDS = [
    'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default',
    'break', 'continue', 'return', 'discard', 'clip',
];

export const HLSL_STORAGE_KEYWORDS = [
    'struct', 'cbuffer', 'tbuffer', 'ConstantBuffer', 'class', 'interface', 'namespace',
];

export const HLSL_MODIFIER_KEYWORDS = [
    'const', 'static', 'extern', 'volatile', 'inline', 'uniform', 'shared',
    'groupshared', 'precise', 'nointerpolation', 'noperspective',
    'centroid', 'sample', 'linear', 'point', 'lineadj', 'triangleadj', 'triangle',
    'in', 'out', 'inout', 'row_major', 'column_major', 'register', 'packoffset',
];

export const HLSL_OTHER_KEYWORDS = [
    'true', 'false', 'NULL',
];

export const HLSL_ALL_KEYWORDS = [
    ...HLSL_CONTROL_KEYWORDS,
    ...HLSL_STORAGE_KEYWORDS,
    ...HLSL_MODIFIER_KEYWORDS,
    ...HLSL_OTHER_KEYWORDS,
];

// ============================================================================
// HLSL Built-in Functions
// ============================================================================

export const HLSL_MATH_FUNCTIONS: HlslFunctionDef[] = [
    { name: 'abs', signature: 'T abs(T v)', description: '返回参数的绝对值（多个通道时分别计算）', category: 'math' },
    { name: 'acos', signature: 'T acos(T v)', description: '返回反余弦值（弧度）', category: 'math' },
    { name: 'all', signature: 'bool all(T v)', description: '如果所有分量都非零则返回 true', category: 'math' },
    { name: 'any', signature: 'bool any(T v)', description: '如果任一分量非零则返回 true', category: 'math' },
    { name: 'asin', signature: 'T asin(T v)', description: '返回反正弦值（弧度）', category: 'math' },
    { name: 'atan', signature: 'T atan(T v)', description: '返回反正切值（弧度）', category: 'math' },
    { name: 'atan2', signature: 'T atan2(T y, T x)', description: '返回 y/x 的反正切值（弧度）', category: 'math' },
    { name: 'ceil', signature: 'T ceil(T v)', description: '向上取整（多个通道时分别计算）', category: 'math' },
    { name: 'clamp', signature: 'T clamp(T v, T min, T max)', description: '将参数限制在指定范围内', category: 'math' },
    { name: 'cos', signature: 'T cos(T v)', description: '计算余弦值', category: 'math' },
    { name: 'cosh', signature: 'T cosh(T v)', description: '计算双曲余弦值', category: 'math' },
    { name: 'cross', signature: 'float3 cross(float3 a, float3 b)', description: '计算两个向量的叉积', category: 'math' },
    { name: 'degrees', signature: 'T degrees(T radians)', description: '将弧度转换为角度', category: 'math' },
    { name: 'determinant', signature: 'float determinant(matrix m)', description: '计算矩阵的行列式', category: 'math' },
    { name: 'distance', signature: 'float distance(T a, T b)', description: '计算两点之间的距离', category: 'math' },
    { name: 'dot', signature: 'float dot(T a, T b)', description: '计算两个向量的点积', category: 'math' },
    { name: 'exp', signature: 'T exp(T v)', description: '计算 e 的 v 次幂', category: 'math' },
    { name: 'exp2', signature: 'T exp2(T v)', description: '计算 2 的 v 次幂', category: 'math' },
    { name: 'floor', signature: 'T floor(T v)', description: '向下取整（多个通道时分别计算）', category: 'math' },
    { name: 'fmod', signature: 'T fmod(T x, T y)', description: '返回 x/y 的浮点余数', category: 'math' },
    { name: 'frac', signature: 'T frac(T v)', description: '返回参数的小数部分', category: 'math' },
    { name: 'frexp', signature: 'T frexp(T v, out T exp)', description: '将浮点数分解为尾数和指数', category: 'math' },
    { name: 'fwidth', signature: 'T fwidth(T v)', description: '返回 abs(ddx(v)) + abs(ddy(v))', category: 'math' },
    { name: 'isfinite', signature: 'bool isfinite(T v)', description: '判断是否为有限数', category: 'math' },
    { name: 'isinf', signature: 'bool isinf(T v)', description: '判断是否为无穷大', category: 'math' },
    { name: 'isnan', signature: 'bool isnan(T v)', description: '判断是否为 NaN', category: 'math' },
    { name: 'ldexp', signature: 'T ldexp(T v, T exp)', description: '返回 v * 2^exp', category: 'math' },
    { name: 'length', signature: 'float length(T v)', description: '计算向量的长度', category: 'math' },
    { name: 'lerp', signature: 'T lerp(T a, T b, T t)', description: '在 a 和 b 之间根据 t 进行线性插值', category: 'math' },
    { name: 'log', signature: 'T log(T v)', description: '计算自然对数', category: 'math' },
    { name: 'log10', signature: 'T log10(T v)', description: '计算以 10 为底的对数', category: 'math' },
    { name: 'log2', signature: 'T log2(T v)', description: '计算以 2 为底的对数', category: 'math' },
    { name: 'mad', signature: 'T mad(T a, T b, T c)', description: '计算 a * b + c（融合乘加）', category: 'math' },
    { name: 'max', signature: 'T max(T a, T b)', description: '返回两个参数中的较大值', category: 'math' },
    { name: 'min', signature: 'T min(T a, T b)', description: '返回两个参数中的较小值', category: 'math' },
    { name: 'modf', signature: 'T modf(T v, out T intPart)', description: '将浮点数分解为整数和小数部分', category: 'math' },
    { name: 'mul', signature: 'T mul(T a, T b)', description: '矩阵或向量乘法', category: 'math' },
    { name: 'normalize', signature: 'T normalize(T v)', description: '返回归一化的向量', category: 'math' },
    { name: 'pow', signature: 'T pow(T base, T exp)', description: '计算 base 的 exp 次幂', category: 'math' },
    { name: 'radians', signature: 'T radians(T degrees)', description: '将角度转换为弧度', category: 'math' },
    { name: 'rcp', signature: 'T rcp(T v)', description: '返回 1/v（倒数）', category: 'math' },
    { name: 'reflect', signature: 'T reflect(T incident, T normal)', description: '计算反射向量', category: 'math' },
    { name: 'refract', signature: 'T refract(T incident, T normal, float eta)', description: '计算折射向量', category: 'math' },
    { name: 'round', signature: 'T round(T v)', description: '四舍五入取整', category: 'math' },
    { name: 'rsqrt', signature: 'T rsqrt(T v)', description: '返回 1/sqrt(v)（平方根的倒数）', category: 'math' },
    { name: 'saturate', signature: 'T saturate(T v)', description: '将参数限制在 0 到 1 之间', category: 'math' },
    { name: 'sign', signature: 'T sign(T v)', description: '返回参数的符号（-1, 0, 或 1）', category: 'math' },
    { name: 'sin', signature: 'T sin(T v)', description: '计算正弦值', category: 'math' },
    { name: 'sincos', signature: 'void sincos(T v, out T s, out T c)', description: '同时计算正弦和余弦值', category: 'math' },
    { name: 'sinh', signature: 'T sinh(T v)', description: '计算双曲正弦值', category: 'math' },
    { name: 'smoothstep', signature: 'T smoothstep(T edge0, T edge1, T v)', description: '在 edge0 和 edge1 之间进行平滑 Hermite 插值', category: 'math' },
    { name: 'sqrt', signature: 'T sqrt(T v)', description: '计算平方根', category: 'math' },
    { name: 'step', signature: 'T step(T edge, T v)', description: '如果 v >= edge 返回 1，否则返回 0', category: 'math' },
    { name: 'tan', signature: 'T tan(T v)', description: '计算正切值', category: 'math' },
    { name: 'tanh', signature: 'T tanh(T v)', description: '计算双曲正切值', category: 'math' },
    { name: 'transpose', signature: 'matrix transpose(matrix m)', description: '返回矩阵的转置', category: 'math' },
    { name: 'trunc', signature: 'T trunc(T v)', description: '截断小数部分，向零取整', category: 'math' },
];

export const HLSL_TEXTURE_FUNCTIONS: HlslFunctionDef[] = [
    { name: 'tex1D', signature: 'float4 tex1D(sampler1D s, float u)', description: '1D 纹理采样', category: 'texture' },
    { name: 'tex1Dbias', signature: 'float4 tex1Dbias(sampler1D s, float4 t)', description: '带 mip 偏移的 1D 纹理采样', category: 'texture' },
    { name: 'tex1Dgrad', signature: 'float4 tex1Dgrad(sampler1D s, float u, float ddx, float ddy)', description: '带梯度的 1D 纹理采样', category: 'texture' },
    { name: 'tex1Dlod', signature: 'float4 tex1Dlod(sampler1D s, float4 t)', description: '指定 LOD 的 1D 纹理采样', category: 'texture' },
    { name: 'tex1Dproj', signature: 'float4 tex1Dproj(sampler1D s, float4 t)', description: '投影 1D 纹理采样', category: 'texture' },
    { name: 'tex2D', signature: 'float4 tex2D(sampler2D s, float2 uv)', description: '2D 纹理采样', category: 'texture' },
    { name: 'tex2Dbias', signature: 'float4 tex2Dbias(sampler2D s, float4 t)', description: '带 mip 偏移的 2D 纹理采样', category: 'texture' },
    { name: 'tex2Dgrad', signature: 'float4 tex2Dgrad(sampler2D s, float2 uv, float2 ddx, float2 ddy)', description: '带梯度的 2D 纹理采样', category: 'texture' },
    { name: 'tex2Dlod', signature: 'float4 tex2Dlod(sampler2D s, float4 t)', description: '指定 LOD 的 2D 纹理采样', category: 'texture' },
    { name: 'tex2Dproj', signature: 'float4 tex2Dproj(sampler2D s, float4 t)', description: '投影 2D 纹理采样', category: 'texture' },
    { name: 'tex3D', signature: 'float4 tex3D(sampler3D s, float3 uvw)', description: '3D 纹理采样', category: 'texture' },
    { name: 'tex3Dbias', signature: 'float4 tex3Dbias(sampler3D s, float4 t)', description: '带 mip 偏移的 3D 纹理采样', category: 'texture' },
    { name: 'tex3Dgrad', signature: 'float4 tex3Dgrad(sampler3D s, float3 uvw, float3 ddx, float3 ddy)', description: '带梯度的 3D 纹理采样', category: 'texture' },
    { name: 'tex3Dlod', signature: 'float4 tex3Dlod(sampler3D s, float4 t)', description: '指定 LOD 的 3D 纹理采样', category: 'texture' },
    { name: 'tex3Dproj', signature: 'float4 tex3Dproj(sampler3D s, float4 t)', description: '投影 3D 纹理采样', category: 'texture' },
    { name: 'texCUBE', signature: 'float4 texCUBE(samplerCUBE s, float3 v)', description: '立方体贴图采样', category: 'texture' },
    { name: 'texCUBEbias', signature: 'float4 texCUBEbias(samplerCUBE s, float4 t)', description: '带 mip 偏移的立方体贴图采样', category: 'texture' },
    { name: 'texCUBEgrad', signature: 'float4 texCUBEgrad(samplerCUBE s, float3 v, float3 ddx, float3 ddy)', description: '带梯度的立方体贴图采样', category: 'texture' },
    { name: 'texCUBElod', signature: 'float4 texCUBElod(samplerCUBE s, float4 t)', description: '指定 LOD 的立方体贴图采样', category: 'texture' },
    { name: 'texCUBEproj', signature: 'float4 texCUBEproj(samplerCUBE s, float4 t)', description: '投影立方体贴图采样', category: 'texture' },
];

export const HLSL_INTRINSIC_FUNCTIONS: HlslFunctionDef[] = [
    { name: 'asfloat', signature: 'float asfloat(T v)', description: '将位模式重新解释为浮点数', category: 'intrinsic' },
    { name: 'asint', signature: 'int asint(T v)', description: '将位模式重新解释为整数', category: 'intrinsic' },
    { name: 'asuint', signature: 'uint asuint(T v)', description: '将位模式重新解释为无符号整数', category: 'intrinsic' },
    { name: 'asdouble', signature: 'double asdouble(uint low, uint high)', description: '从两个 32 位值构造双精度浮点数', category: 'intrinsic' },
    { name: 'clip', signature: 'void clip(T v)', description: '裁剪函数，当参数小于 0 时丢弃当前像素', category: 'intrinsic' },
    { name: 'countbits', signature: 'uint countbits(uint v)', description: '计算设置为 1 的位数', category: 'intrinsic' },
    { name: 'ddx', signature: 'T ddx(T v)', description: '计算屏幕空间 x 方向的偏导数', category: 'intrinsic' },
    { name: 'ddx_coarse', signature: 'T ddx_coarse(T v)', description: '计算屏幕空间 x 方向的粗略偏导数', category: 'intrinsic' },
    { name: 'ddx_fine', signature: 'T ddx_fine(T v)', description: '计算屏幕空间 x 方向的精细偏导数', category: 'intrinsic' },
    { name: 'ddy', signature: 'T ddy(T v)', description: '计算屏幕空间 y 方向的偏导数', category: 'intrinsic' },
    { name: 'ddy_coarse', signature: 'T ddy_coarse(T v)', description: '计算屏幕空间 y 方向的粗略偏导数', category: 'intrinsic' },
    { name: 'ddy_fine', signature: 'T ddy_fine(T v)', description: '计算屏幕空间 y 方向的精细偏导数', category: 'intrinsic' },
    { name: 'dst', signature: 'float4 dst(float4 src0, float4 src1)', description: '计算距离向量', category: 'intrinsic' },
    { name: 'faceforward', signature: 'T faceforward(T n, T i, T ng)', description: '返回面向观察者的法线', category: 'intrinsic' },
    { name: 'firstbithigh', signature: 'int firstbithigh(T v)', description: '返回最高有效位的位置', category: 'intrinsic' },
    { name: 'firstbitlow', signature: 'int firstbitlow(T v)', description: '返回最低有效位的位置', category: 'intrinsic' },
    { name: 'lit', signature: 'float4 lit(float n_dot_l, float n_dot_h, float m)', description: '计算光照系数', category: 'intrinsic' },
    { name: 'noise', signature: 'float noise(T v)', description: '生成噪声值（已废弃）', category: 'intrinsic' },
    { name: 'reversebits', signature: 'T reversebits(T v)', description: '反转位顺序', category: 'intrinsic' },
    { name: 'f16tof32', signature: 'float f16tof32(uint v)', description: '将半精度浮点转换为单精度', category: 'intrinsic' },
    { name: 'f32tof16', signature: 'uint f32tof16(float v)', description: '将单精度浮点转换为半精度', category: 'intrinsic' },
];

// ============================================================================
// Compute Shader Specific
// ============================================================================

export const HLSL_COMPUTE_FUNCTIONS: HlslFunctionDef[] = [
    // Memory Barriers
    { name: 'AllMemoryBarrier', signature: 'void AllMemoryBarrier()', description: '阻塞线程直到所有内存访问完成', category: 'barrier' },
    { name: 'AllMemoryBarrierWithGroupSync', signature: 'void AllMemoryBarrierWithGroupSync()', description: '阻塞线程直到所有内存访问完成并同步组内所有线程', category: 'barrier' },
    { name: 'DeviceMemoryBarrier', signature: 'void DeviceMemoryBarrier()', description: '阻塞线程直到所有设备内存访问完成', category: 'barrier' },
    { name: 'DeviceMemoryBarrierWithGroupSync', signature: 'void DeviceMemoryBarrierWithGroupSync()', description: '阻塞线程直到所有设备内存访问完成并同步组内所有线程', category: 'barrier' },
    { name: 'GroupMemoryBarrier', signature: 'void GroupMemoryBarrier()', description: '阻塞线程直到所有组共享内存访问完成', category: 'barrier' },
    { name: 'GroupMemoryBarrierWithGroupSync', signature: 'void GroupMemoryBarrierWithGroupSync()', description: '阻塞线程直到所有组共享内存访问完成并同步组内所有线程', category: 'barrier' },
    
    // Atomic Operations
    { name: 'InterlockedAdd', signature: 'void InterlockedAdd(inout T dest, T value, out T original)', description: '原子加法操作', category: 'atomic' },
    { name: 'InterlockedAnd', signature: 'void InterlockedAnd(inout T dest, T value, out T original)', description: '原子按位与操作', category: 'atomic' },
    { name: 'InterlockedCompareExchange', signature: 'void InterlockedCompareExchange(inout T dest, T compare, T value, out T original)', description: '原子比较并交换操作', category: 'atomic' },
    { name: 'InterlockedCompareStore', signature: 'void InterlockedCompareStore(inout T dest, T compare, T value)', description: '原子比较并存储操作', category: 'atomic' },
    { name: 'InterlockedExchange', signature: 'void InterlockedExchange(inout T dest, T value, out T original)', description: '原子交换操作', category: 'atomic' },
    { name: 'InterlockedMax', signature: 'void InterlockedMax(inout T dest, T value, out T original)', description: '原子最大值操作', category: 'atomic' },
    { name: 'InterlockedMin', signature: 'void InterlockedMin(inout T dest, T value, out T original)', description: '原子最小值操作', category: 'atomic' },
    { name: 'InterlockedOr', signature: 'void InterlockedOr(inout T dest, T value, out T original)', description: '原子按位或操作', category: 'atomic' },
    { name: 'InterlockedXor', signature: 'void InterlockedXor(inout T dest, T value, out T original)', description: '原子按位异或操作', category: 'atomic' },
];

export const HLSL_UNITY_FUNCTIONS: HlslFunctionDef[] = [
    { name: 'UnityObjectToClipPos', signature: 'float4 UnityObjectToClipPos(float4 pos)', description: '对位置进行坐标系转换：对象空间 => 裁剪空间', category: 'unity' },
    { name: 'UnityObjectToWorldNormal', signature: 'float3 UnityObjectToWorldNormal(float3 normal)', description: '对法线进行坐标系转换：对象空间 => 世界空间', category: 'unity' },
    { name: 'UnityObjectToWorldDir', signature: 'float3 UnityObjectToWorldDir(float3 dir)', description: '对方向进行坐标系转换：对象空间 => 世界空间', category: 'unity' },
    { name: 'UnityWorldToObjectDir', signature: 'float3 UnityWorldToObjectDir(float3 dir)', description: '对方向进行坐标系转换：世界空间 => 对象空间', category: 'unity' },
    { name: 'UnityWorldSpaceLightDir', signature: 'float3 UnityWorldSpaceLightDir(float3 worldPos)', description: '计算世界空间中从该点到主光源的方向', category: 'unity' },
    { name: 'UnityWorldSpaceViewDir', signature: 'float3 UnityWorldSpaceViewDir(float3 worldPos)', description: '计算世界空间中从该点到主相机的方向', category: 'unity' },
    { name: 'TRANSFORM_TEX', signature: 'float2 TRANSFORM_TEX(float2 uv, sampler2D tex)', description: '对 UV 坐标进行缩放和平移', category: 'unity' },
    { name: 'UNITY_PROJ_COORD', signature: 'float4 UNITY_PROJ_COORD(float4 a)', description: '投影纹理坐标', category: 'unity' },
    { name: 'LinearEyeDepth', signature: 'float LinearEyeDepth(float depth)', description: '将深度缓冲值转换为线性眼空间深度', category: 'unity' },
    { name: 'Linear01Depth', signature: 'float Linear01Depth(float depth)', description: '将深度缓冲值转换为 0-1 范围的线性深度', category: 'unity' },
    { name: 'DecodeFloatRGBA', signature: 'float DecodeFloatRGBA(float4 enc)', description: '从 RGBA 解码浮点值', category: 'unity' },
    { name: 'EncodeFloatRGBA', signature: 'float4 EncodeFloatRGBA(float v)', description: '将浮点值编码为 RGBA', category: 'unity' },
];

export const HLSL_ALL_FUNCTIONS: HlslFunctionDef[] = [
    ...HLSL_MATH_FUNCTIONS,
    ...HLSL_TEXTURE_FUNCTIONS,
    ...HLSL_INTRINSIC_FUNCTIONS,
    ...HLSL_COMPUTE_FUNCTIONS,
    ...HLSL_UNITY_FUNCTIONS,
];

// ============================================================================
// HLSL Semantics
// ============================================================================

export const HLSL_VERTEX_SEMANTICS: HlslSemanticDef[] = [
    { name: 'POSITION', description: '顶点位置', stage: 'vertex' },
    { name: 'NORMAL', description: '法线向量', stage: 'vertex' },
    { name: 'TANGENT', description: '切线向量', stage: 'vertex' },
    { name: 'BINORMAL', description: '副法线向量', stage: 'vertex' },
    { name: 'TEXCOORD0', description: '纹理坐标 0', stage: 'vertex' },
    { name: 'TEXCOORD1', description: '纹理坐标 1', stage: 'vertex' },
    { name: 'TEXCOORD2', description: '纹理坐标 2', stage: 'vertex' },
    { name: 'TEXCOORD3', description: '纹理坐标 3', stage: 'vertex' },
    { name: 'TEXCOORD4', description: '纹理坐标 4', stage: 'vertex' },
    { name: 'TEXCOORD5', description: '纹理坐标 5', stage: 'vertex' },
    { name: 'TEXCOORD6', description: '纹理坐标 6', stage: 'vertex' },
    { name: 'TEXCOORD7', description: '纹理坐标 7', stage: 'vertex' },
    { name: 'COLOR', description: '顶点颜色', stage: 'vertex' },
    { name: 'COLOR0', description: '顶点颜色 0', stage: 'vertex' },
    { name: 'COLOR1', description: '顶点颜色 1', stage: 'vertex' },
    { name: 'BLENDWEIGHT', description: '混合权重', stage: 'vertex' },
    { name: 'BLENDINDICES', description: '混合索引', stage: 'vertex' },
];

export const HLSL_SYSTEM_SEMANTICS: HlslSemanticDef[] = [
    { name: 'SV_Position', description: '裁剪空间位置（顶点着色器输出/像素着色器输入）', stage: 'all' },
    { name: 'SV_Target', description: '渲染目标输出', stage: 'pixel' },
    { name: 'SV_Target0', description: '渲染目标 0', stage: 'pixel' },
    { name: 'SV_Target1', description: '渲染目标 1', stage: 'pixel' },
    { name: 'SV_Target2', description: '渲染目标 2', stage: 'pixel' },
    { name: 'SV_Target3', description: '渲染目标 3', stage: 'pixel' },
    { name: 'SV_Depth', description: '深度输出', stage: 'pixel' },
    { name: 'SV_VertexID', description: '顶点 ID', stage: 'vertex' },
    { name: 'SV_InstanceID', description: '实例 ID', stage: 'vertex' },
    { name: 'SV_PrimitiveID', description: '图元 ID', stage: 'all' },
    { name: 'SV_IsFrontFace', description: '是否为正面', stage: 'pixel' },
    { name: 'SV_SampleIndex', description: '采样索引', stage: 'pixel' },
    { name: 'SV_Coverage', description: '覆盖率掩码', stage: 'pixel' },
    { name: 'SV_ClipDistance', description: '裁剪距离', stage: 'all' },
    { name: 'SV_CullDistance', description: '剔除距离', stage: 'all' },
    { name: 'SV_RenderTargetArrayIndex', description: '渲染目标数组索引', stage: 'all' },
    { name: 'SV_ViewportArrayIndex', description: '视口数组索引', stage: 'all' },
];

export const HLSL_COMPUTE_SEMANTICS: HlslSemanticDef[] = [
    { name: 'SV_DispatchThreadID', description: '全局线程 ID（整个 Dispatch 范围）', stage: 'compute' },
    { name: 'SV_GroupID', description: '线程组 ID', stage: 'compute' },
    { name: 'SV_GroupThreadID', description: '组内线程 ID', stage: 'compute' },
    { name: 'SV_GroupIndex', description: '组内线程一维索引', stage: 'compute' },
];

export const HLSL_ALL_SEMANTICS: HlslSemanticDef[] = [
    ...HLSL_VERTEX_SEMANTICS,
    ...HLSL_SYSTEM_SEMANTICS,
    ...HLSL_COMPUTE_SEMANTICS,
];

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a completion item for an HLSL function
 */
export const createFunctionCompletionItem = (func: HlslFunctionDef): vscode.CompletionItem => {
    const item = new vscode.CompletionItem(func.name, vscode.CompletionItemKind.Function);
    item.detail = func.signature;
    item.documentation = new vscode.MarkdownString(func.description);
    
    // Extract parameters for snippet
    const paramsMatch = func.signature.match(/\(([^)]*)\)/);
    if (paramsMatch && paramsMatch[1].trim()) {
        const params = paramsMatch[1].split(',').map((p, i) => {
            const paramName = p.trim().split(/\s+/).pop()?.replace(/[\[\]]/g, '') || `param${i + 1}`;
            return `\${${i + 1}:${paramName}}`;
        });
        item.insertText = new vscode.SnippetString(`${func.name}(${params.join(', ')})`);
    } else {
        item.insertText = new vscode.SnippetString(`${func.name}()`);
    }
    
    return item;
};

/**
 * Create a completion item for an HLSL type
 */
export const createTypeCompletionItem = (typeName: string): vscode.CompletionItem => {
    const item = new vscode.CompletionItem(typeName, vscode.CompletionItemKind.TypeParameter);
    item.detail = 'HLSL Type';
    return item;
};

/**
 * Create a completion item for an HLSL keyword
 */
export const createKeywordCompletionItem = (keyword: string): vscode.CompletionItem => {
    const item = new vscode.CompletionItem(keyword, vscode.CompletionItemKind.Keyword);
    item.detail = 'HLSL Keyword';
    return item;
};

/**
 * Create a completion item for an HLSL semantic
 */
export const createSemanticCompletionItem = (semantic: HlslSemanticDef): vscode.CompletionItem => {
    const item = new vscode.CompletionItem(semantic.name, vscode.CompletionItemKind.EnumMember);
    item.detail = `Semantic (${semantic.stage})`;
    item.documentation = new vscode.MarkdownString(semantic.description);
    return item;
};

/**
 * Find a function definition by name
 */
export const findFunctionByName = (name: string): HlslFunctionDef | undefined => {
    return HLSL_ALL_FUNCTIONS.find(f => f.name === name);
};

/**
 * Create a hover for an HLSL built-in function
 */
export const createFunctionHover = (func: HlslFunctionDef): vscode.Hover => {
    const hoverMessage = new vscode.MarkdownString();
    hoverMessage.isTrusted = false;
    hoverMessage.supportHtml = false;
    hoverMessage.appendCodeblock(func.signature, 'hlsl');
    hoverMessage.appendMarkdown(func.description);
    return new vscode.Hover(hoverMessage);
};
