import { HLSL_ALL_KEYWORDS, HLSL_TYPE_PREFIXES } from './shared.HlslData';

/**
 * 判断是否是 HLSL 关键字或类型（大小写不敏感，支持类型后缀如 float3/float4x4）
 */
export function isHlslKeyword(word: string): boolean {
    if (!word) return false;
    const w = word.toLowerCase();

    // 精确匹配关键字
    if (HLSL_ALL_KEYWORDS.some(k => k.toLowerCase() === w)) return true;

    // 类型前缀匹配（例如 float3, float4x4, int2 等）
    if (HLSL_TYPE_PREFIXES.some(bt => w.startsWith(bt.toLowerCase()))) return true;

    return false;
}
