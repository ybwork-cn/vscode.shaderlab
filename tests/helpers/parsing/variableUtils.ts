/**
 * Shared test utilities for extracting local variables from code snippets.
 * Keep these utilities in tests/helpers to avoid touching production code.
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

    // Fallback: if we didn't find a clean block via backward scan, use last '{' as block start
    if (blockStart === -1) {
        blockStart = textBefore.lastIndexOf('{');
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
