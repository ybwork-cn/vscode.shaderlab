import * as assert from 'assert';

/**
 * Extract local variable declarations inside the current block (simple heuristic used by completion provider)
 */
export function getLocalVariables(textBefore: string): Array<{ type: string; name: string }> {
    // limit to last block (naive)
    let depth = 0;
    let blockStart = -1;

    for (let i = textBefore.length - 1; i >= 0; i--) {
        const char = textBefore[i];
        if (char === '}') {
            depth++;
        } else if (char === '{') {
            if (depth > 0) {
                depth--;
            } else {
                blockStart = i;
                break;
            }
        }
    }

    const results: Array<{ type: string; name: string }> = [];

    if (blockStart !== -1) {
        const blockText = textBefore.substring(blockStart + 1);
        const varRegex = /\b([a-zA-Z_]\w*)\s+([a-zA-Z_]\w*)(?:\s*\[[^\]]+\])?\s*(?:=|;|,|\))/g;
        let match: RegExpExecArray | null;
        while ((match = varRegex.exec(blockText)) !== null) {
            const [, type, name] = match;
            results.push({ type, name });
        }
    }

    return results;
}

// --- Simple self-test ---
if (require.main === module) {
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
    console.log('Found local vars:', vars);
    // Expect at least these names to be found
    assert(vars.some(v => v.name === 'output'));
    assert(vars.some(v => v.name === 'vertexInput'));
    assert(vars.some(v => v.name === 'normalInput'));
    console.log('variable_extraction test passed');
}
