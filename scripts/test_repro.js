
const text = `
Varyings LitGBufferPassVertex(Attributes input)
{
    Varyings output = (Varyings)0;

    UNITY_SETUP_INSTANCE_ID(input);
    UNITY_TRANSFER_INSTANCE_ID(input, output);
    UNITY_INITIALIZE_VERTEX_OUTPUT_STEREO(output);

    VertexPositionInputs vertexInput = GetVertexPositionInputs(input.positionOS.xyz);

    // normalWS and tangentWS already normalize.
    // this is required to avoid skewing the direction during interpolation
    // also required for per-vertex lighting and SH evaluation
    VertexNormalInputs normalInput = GetVertexNormalInputs(input.normalOS, input.tangentOS);

    output.uv = TRANSFORM_TEX(input.texcoord, _BaseMap);

    // already normalized from normal transform to WS.
    output.normalWS = normalInput.normalWS;
`;

function getLocalVariables(textBefore) {
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

    if (blockStart !== -1) {
        const blockText = textBefore.substring(blockStart + 1);
        const varRegex = /\b([a-zA-Z_]\w*)\s+([a-zA-Z_]\w*)(?:\s*\[[^\]]+\])?\s*(?:=|;|,|\))/g;
        
        let match;
        while ((match = varRegex.exec(blockText)) !== null) {
            console.log(`Matched: Type=${match[1]}, Name=${match[2]}`);
        }
    } else {
        console.log("No block start found");
    }
}

// Simulate cursor at end of text
getLocalVariables(text);
