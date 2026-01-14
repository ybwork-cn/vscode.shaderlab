import { describe, it, expect } from 'vitest';
import { isHlslKeyword } from '../scripts/hlsl.utils';

describe('isHlslKeyword', () => {
    it('recognizes base keywords and types', () => {
        expect(isHlslKeyword('float')).toBe(true);
        expect(isHlslKeyword('Float')).toBe(true); // case-insensitive
        expect(isHlslKeyword('float3')).toBe(true);
        expect(isHlslKeyword('float4x4')).toBe(true);
        expect(isHlslKeyword('struct')).toBe(true);
    });

    it('does not classify identifiers as keywords', () => {
        expect(isHlslKeyword('SV_Position')).toBe(false);
        expect(isHlslKeyword('MyCustomType')).toBe(false);
        expect(isHlslKeyword('_myVar')).toBe(false);
    });
});
