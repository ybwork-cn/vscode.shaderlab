import * as assert from 'assert';
import { getLocalVariables } from './helpers';

import { describe, it, expect } from 'vitest';

// --- Tests ---
describe('getLocalVariables', () => {
    it('extracts local variables in a block', () => {
        const sample = `
Varyings LitGBufferPassVertex(Attributes input)
{
    Varyings output = (Varyings)0;

    UNITY_SETUP_INSTANCE_ID(input);

    VertexPositionInputs vertexInput = GetVertexPositionInputs(input.positionOS.xyz);

    VertexNormalInputs normalInput = GetVertexNormalInputs(input.normalOS, input.tangentOS);

    output.uv = TRANSFORM_TEX(input.texcoord, _BaseMap);

    // already normalized from normal transform to WS.
    output.normalWS = normalInput.normalWS;
`;
        const vars = getLocalVariables(sample);
        const names = vars.map(v => v.name);
        expect(names).toContain('output');
        expect(names).toContain('vertexInput');
        expect(names).toContain('normalInput');
    });

    it('returns empty array when no block is present', () => {
        const sample = 'function foo() {}';
        const vars = getLocalVariables(sample);
        expect(vars).toEqual([]);
    });
});
