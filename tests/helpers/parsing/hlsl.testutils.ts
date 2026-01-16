/**
 * Test utilities for HLSL parsing that avoid depending on `vscode` runtime.
 * Moved from scripts/ to tests/utils/ to avoid polluting production code.
 */

export function extractLocalVariablesFromFunctionText(text: string, functionName: string): Array<{ type: string; name: string }> {
    const regex = new RegExp("\\b(\\w+)\\s+" + functionName + "\\s*\\(", 'g');
    const match = regex.exec(text);
    if (!match) return [];

    const funcHeaderIndex = match.index;
    const braceIndex = text.indexOf('{', funcHeaderIndex);
    if (braceIndex === -1) return [];

    // 找到匹配的右大括号（简单方式：同样实现一个小匹配器）
    let depth = 1;
    let inString = false;
    let inChar = false;
    let inLineComment = false;
    let inBlockComment = false;

    let bodyEnd = -1;
    for (let i = braceIndex + 1; i < text.length; i++) {
        const char = text[i];
        const prevChar = i > 0 ? text[i - 1] : '';

        if (!inString && !inChar && !inBlockComment && char === '/' && text[i + 1] === '/') {
            inLineComment = true;
            continue;
        }
        if (inLineComment && char === '\n') {
            inLineComment = false;
            continue;
        }

        if (!inString && !inChar && !inLineComment && char === '/' && text[i + 1] === '*') {
            inBlockComment = true;
            i++;
            continue;
        }
        if (inBlockComment && char === '*' && text[i + 1] === '/') {
            inBlockComment = false;
            i++;
            continue;
        }

        if (inLineComment || inBlockComment) continue;

        if (char === '"' && prevChar !== '\\') {
            inString = !inString;
            continue;
        }
        if (char === "'" && prevChar !== '\\') {
            inChar = !inChar;
            continue;
        }

        if (inString || inChar) continue;

        if (char === '{') depth++;
        else if (char === '}') {
            depth--;
            if (depth === 0) {
                bodyEnd = i;
                break;
            }
        }
    }

    if (bodyEnd === -1) return [];

    let funcBody = text.substring(braceIndex + 1, bodyEnd);

    // Remove block comments and line comments
    funcBody = funcBody.replace(/\/\*[\s\S]*?\*\//g, '');
    funcBody = funcBody.replace(/\/\/.*$/gm, '');

    // Remove string and char literals
    funcBody = funcBody.replace(/"(?:\\.|[^"\\])*"/g, '""');
    funcBody = funcBody.replace(/'(?:\\.|[^'\\])+'/g, "''");

    const localVarRegex = /\b(\w+)\s+(\w+)(?:\s*=\s*[^;]+)?\s*;/g;
    const results: Array<{ type: string; name: string }> = [];
    let m: RegExpExecArray | null;
    while ((m = localVarRegex.exec(funcBody)) !== null) {
        const varType = m[1];
        const varName = m[2];
        if (['if', 'for', 'while', 'switch', 'return', 'break', 'continue', 'discard'].includes(varType)) continue;
        results.push({ type: varType, name: varName });
    }
    return results;
}
