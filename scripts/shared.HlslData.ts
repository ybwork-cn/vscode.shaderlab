// Shared HLSL data (pure data module; no `vscode` dependency)
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

// Keywords
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

// For prefix matching in utils (e.g., float3, float4x4)
export const HLSL_TYPE_PREFIXES = [
    ...HLSL_SCALAR_TYPES,
    'sampler', 'texture', 'rwtexture', 'buffer', 'structuredbuffer', 'appendstructuredbuffer', 'consumestructuredbuffer',
];
