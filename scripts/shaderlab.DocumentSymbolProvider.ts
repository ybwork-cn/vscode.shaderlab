
import * as vscode from 'vscode';
import { BracketInfo, getBrackets, getDocumentText, isType } from './shaderlab.DocumentStructure.js';

function SemanticTokens_variable(document: vscode.TextDocument, root: vscode.DocumentSymbol, rangeIndex: BracketInfo) {
    const text = getDocumentText(document, rangeIndex);
    let match: RegExpExecArray;

    let regex_para = /(?<!\/\/.*)(\w+)\s+(\w+(?:\[\d*\])?)\s*=/g;
    while ((match = regex_para.exec(text))) {
        const startPosition = document.positionAt(match.index + rangeIndex.start);
        let _exit = false;
        for (const child of root.children) {
            if (startPosition.compareTo(child.range.start) >= 0 && startPosition.compareTo(child.range.end) <= 0) {
                _exit = true;
                break;
            }
        }
        if (_exit)
            continue;

        const selectionRange = new vscode.Range(
            document.positionAt(match.index + match[0].indexOf(match[2]) + rangeIndex.start),
            document.positionAt(match.index + match[0].indexOf(match[2]) + match[2].length + rangeIndex.start));

        const range = new vscode.Range(
            document.positionAt(match.index + rangeIndex.start),
            document.positionAt(match.index + rangeIndex.start + match[0].indexOf(match[2]) + match[2].length));

        // 防止 return x;
        if (isType(rootShaderSymbol, range.start, match[1])) {
            const name = /^\w+/.exec(match[2])[0];
            let detail = match[1];

            let arrayMatch: RegExpExecArray;
            if (arrayMatch = /\[\d+\]/g.exec(match[2]))
                detail += arrayMatch[0];

            const node = new vscode.DocumentSymbol(name, detail, vscode.SymbolKind.Variable, range, selectionRange);
            root.children.push(node);
        }
    }

    regex_para = /(?<!\/\/.*)(\w+)\s+(\w+(?:\[\d+\])?)\s*;/g;
    while ((match = regex_para.exec(text))) {
        const startPosition = document.positionAt(match.index + rangeIndex.start);
        let _exit = false;
        for (const child of root.children) {
            if (startPosition.compareTo(child.range.start) >= 0 && startPosition.compareTo(child.range.end) <= 0) {
                _exit = true;
                break;
            }
        }
        if (_exit)
            continue;

        const endPosition = document.positionAt(match.index + rangeIndex.start + match[0].indexOf(match[2]) + match[2].length);
        const selectionRange = new vscode.Range(
            document.positionAt(match.index + rangeIndex.start + match[0].indexOf(match[2])),
            endPosition);

        const range = new vscode.Range(
            document.positionAt(match.index + rangeIndex.start),
            endPosition);

        // 防止 return x;
        if (isType(rootShaderSymbol, range.start, match[1])) {
            const name = /^\w+/.exec(match[2])[0];
            let detail = match[1];

            let arrayMatch: RegExpExecArray;
            if (arrayMatch = /\[\d+\]/g.exec(match[2]))
                detail += arrayMatch[0];

            const node = new vscode.DocumentSymbol(name, detail, vscode.SymbolKind.Variable, range, selectionRange);
            root.children.push(node);
        }
    }
}

function SemanticTokens_params(document: vscode.TextDocument, root: vscode.DocumentSymbol, rangeIndex: BracketInfo) {
    const text = getDocumentText(document, rangeIndex);
    let match: RegExpExecArray;

    const regex_para = /(\w+)\s+(\w+)/mg;
    while ((match = regex_para.exec(text))) {
        const selectionRange = new vscode.Range(
            document.positionAt(rangeIndex.start + match.index + match[0].indexOf(match[2], match[1].length)),
            document.positionAt(rangeIndex.start + match.index + match[0].indexOf(match[2], match[1].length) + match[2].length));

        const range = new vscode.Range(
            document.positionAt(match.index + rangeIndex.start),
            document.positionAt(match.index + rangeIndex.start + match[0].length));

        const node = new vscode.DocumentSymbol(match[2], match[1], vscode.SymbolKind.Variable, range, selectionRange);
        root.children.push(node);
    }
}

function SemanticTokens_Struct(document: vscode.TextDocument, root: vscode.DocumentSymbol, rangeIndex: BracketInfo) {
    const text = getDocumentText(document, rangeIndex);
    let match: RegExpExecArray;

    const regex_field = /(\w+)\s+(\S+)\s*:\s*(\w+).*?$/mg;
    while ((match = regex_field.exec(text))) {
        const selectionRange = new vscode.Range(
            document.positionAt(rangeIndex.start + match.index + match[0].indexOf(match[2])),
            document.positionAt(rangeIndex.start + match.index + match[0].indexOf(match[2]) + match[2].match(/\w+/)[0].length));

        const range = new vscode.Range(
            document.positionAt(match.index + rangeIndex.start),
            document.positionAt(match.index + rangeIndex.start + match[0].length));

        const name = /^\w+/.exec(match[2])[0];
        let detail = match[1];

        let arrayMatch: RegExpExecArray;
        if (arrayMatch = /\[\d+\]/g.exec(match[2]))
            detail += arrayMatch[0];

        const node = new vscode.DocumentSymbol(name, detail, vscode.SymbolKind.Field, range, selectionRange);
        root.children.push(node);
    }
}

function SemanticTokens_CGPROGRAM(document: vscode.TextDocument, root: vscode.DocumentSymbol, rangeIndex: BracketInfo) {
    const text = getDocumentText(document, rangeIndex);
    let match: RegExpExecArray;

    const regex_struct = /(?<!\/\/.*)(struct)\s*(\w+)\s*{/g;
    while (match = regex_struct.exec(text)) {
        const selectionRange = new vscode.Range(
            document.positionAt(rangeIndex.start + match.index + match[0].indexOf(match[2])),
            document.positionAt(rangeIndex.start + match.index + match[0].indexOf(match[2]) + match[2].length));

        const end = match[0].length - 1 + match.index + rangeIndex.start;
        const bracket = rangeIndex.children.find(item => item.start == end);
        const range = new vscode.Range(
            document.positionAt(match.index + rangeIndex.start),
            document.positionAt(bracket.end));

        const node = new vscode.DocumentSymbol(match[2], '', vscode.SymbolKind.Struct, range, selectionRange);
        root.children.push(node);

        SemanticTokens_Struct(document, node, bracket);
    }

    const regex_function = /(?<!\/\/.*)(\w+)\s+(\w+)\s*\((.*?)\)(?:\s*:\s*(\w+))?\s*{/g;
    while (match = regex_function.exec(text)) {
        const selectionRange = new vscode.Range(
            document.positionAt(rangeIndex.start + match.index + match[0].indexOf(match[2])),
            document.positionAt(rangeIndex.start + match.index + match[0].indexOf(match[2]) + match[2].length));

        const end = match[0].length - 1 + match.index + rangeIndex.start;
        const bracket = rangeIndex.children.find(item => item.start == end);
        const range = new vscode.Range(
            document.positionAt(match.index + rangeIndex.start),
            document.positionAt(bracket.end));

        const node = new vscode.DocumentSymbol(match[2], match[1], vscode.SymbolKind.Method, range, selectionRange);
        root.children.push(node);

        if (match[3].length > 0) {
            const start = match.index + match[0].indexOf(match[3], match[0].indexOf(match[2]) + match[2].length) + rangeIndex.start;
            SemanticTokens_params(document, node, { start, end: start + match[3].length, children: rangeIndex.children });
        }

        SemanticTokens_variable(document, node, bracket);
    }

    SemanticTokens_variable(document, root, rangeIndex);
}

function SemanticTokens_CG(document: vscode.TextDocument, root: vscode.DocumentSymbol, rangeIndex: BracketInfo) {
    const text = getDocumentText(document, rangeIndex);

    let matchStart = /CGPROGRAM|CGINCLUDE/ig.exec(text);
    let matchEnd = /ENDCG/ig.exec(text);
    if (matchStart == null || matchEnd == null) {
        matchStart = /HLSLPROGRAM|HLSLINCLUDE/ig.exec(text);
        matchEnd = /ENDHLSL/ig.exec(text);
    }
    if (matchStart == null || matchEnd == null)
        return;

    const startPosition = document.positionAt(matchStart.index + rangeIndex.start);
    for (const child of root.children) {
        if (startPosition.compareTo(child.range.start) >= 0 && startPosition.compareTo(child.range.end) <= 0)
            return;
    }

    if (matchStart.length > 0 && matchEnd.length > 0) {
        const selectionRange = new vscode.Range(
            document.positionAt(matchStart.index + rangeIndex.start),
            document.positionAt(matchStart.index + matchStart[0].length + rangeIndex.start));

        const range = new vscode.Range(
            document.positionAt(matchStart.index + rangeIndex.start),
            document.positionAt(matchEnd.index + matchEnd[0].length + rangeIndex.start));

        const node = new vscode.DocumentSymbol(matchStart[0].toUpperCase(), '', vscode.SymbolKind.Package, range, selectionRange);
        root.children.push(node);

        const start = matchStart[0].length + matchStart.index + rangeIndex.start;
        const end = matchEnd.index + rangeIndex.start;
        SemanticTokens_CGPROGRAM(document, node, { start, end, children: rangeIndex.children });
    }
}

function SemanticTokens_SubShader(document: vscode.TextDocument, root: vscode.DocumentSymbol, rangeIndex: BracketInfo) {
    const text = getDocumentText(document, rangeIndex);
    let match: RegExpExecArray;
    const regex = /(Pass)\s*{/ig;
    while (match = regex.exec(text)) {
        const selectionRange = new vscode.Range(
            document.positionAt(match.index + rangeIndex.start),
            document.positionAt(match.index + match[1].length + rangeIndex.start));

        const end = match[0].length - 1 + match.index + rangeIndex.start;
        const bracket = rangeIndex.children.find(item => item.start == end);
        const range = new vscode.Range(
            document.positionAt(match.index + rangeIndex.start),
            document.positionAt(bracket.end));

        const node = new vscode.DocumentSymbol(match[1], '', vscode.SymbolKind.Package, range, selectionRange);
        root.children.push(node);

        SemanticTokens_CG(document, node, bracket);
    }
    SemanticTokens_CG(document, root, rangeIndex);
}

function SemanticTokens_Properties(document: vscode.TextDocument, root: vscode.DocumentSymbol, rangeIndex: BracketInfo) {
    const text = getDocumentText(document, rangeIndex);
    let match: RegExpExecArray;
    const regex = /(\w+)\s*\(".*?"\s*,\s*(\w+)\).*?$/mg;
    while (match = regex.exec(text)) {
        const selectionRange = new vscode.Range(
            document.positionAt(match.index + rangeIndex.start),
            document.positionAt(match.index + match[1].length + rangeIndex.start));

        const range = new vscode.Range(
            document.positionAt(match.index + rangeIndex.start),
            document.positionAt(match.index + rangeIndex.start + match[0].length));

        const node = new vscode.DocumentSymbol(match[1], match[2], vscode.SymbolKind.Property, range, selectionRange);
        root.children.push(node);
    }
}

function SemanticTokens_Shader(document: vscode.TextDocument, root: vscode.DocumentSymbol, rangeIndex: BracketInfo) {
    const text = getDocumentText(document, rangeIndex);
    let match: RegExpExecArray;
    if (match = /(Properties)\s*{/ig.exec(text)) {
        const selectionRange = new vscode.Range(
            document.positionAt(match.index + rangeIndex.start),
            document.positionAt(match.index + match[1].length + rangeIndex.start));

        const end = match[0].length - 1 + match.index + rangeIndex.start;
        const bracket = rangeIndex.children.find(item => item.start == end);
        const range = new vscode.Range(
            document.positionAt(match.index + rangeIndex.start),
            document.positionAt(bracket.end));

        const node = new vscode.DocumentSymbol('Properties', '', vscode.SymbolKind.Package, range, selectionRange);
        root.children.push(node);

        SemanticTokens_Properties(document, node, bracket);
    }
    const regex = /(SubShader)\s*{/ig;
    while (match = regex.exec(text)) {
        const selectionRange = new vscode.Range(
            document.positionAt(match.index + rangeIndex.start),
            document.positionAt(match.index + match[1].length + rangeIndex.start));

        const end = match[0].length - 1 + match.index + rangeIndex.start;
        const bracket = rangeIndex.children.find(item => item.start == end);
        const range = new vscode.Range(
            document.positionAt(match.index + rangeIndex.start),
            document.positionAt(bracket.end));

        const node = new vscode.DocumentSymbol('SubShader', '', vscode.SymbolKind.Package, range, selectionRange);
        root.children.push(node);

        SemanticTokens_SubShader(document, node, bracket);
    }
}

let rootShaderSymbol: vscode.DocumentSymbol;
function SemanticTokens_Root(document: vscode.TextDocument, rangeIndex: BracketInfo): vscode.DocumentSymbol {
    const text = getDocumentText(document, rangeIndex);
    let match: RegExpExecArray;
    if (match = /(Shader)\s*(".*?")\s*{/ig.exec(text)) {
        const selectionRange = new vscode.Range(
            document.positionAt(match.index + rangeIndex.start),
            document.positionAt(match.index + match[1].length + rangeIndex.start));

        const end = match[0].length - 1 + match.index + rangeIndex.start;
        const bracket = rangeIndex.children.find(item => item.start == end);
        const range = new vscode.Range(
            document.positionAt(match.index + rangeIndex.start),
            document.positionAt(bracket.end));

        rootShaderSymbol = new vscode.DocumentSymbol('Shader', match[2], vscode.SymbolKind.File, range, selectionRange);
        SemanticTokens_Shader(document, rootShaderSymbol, bracket);
    }
    return rootShaderSymbol;
}

function getDocumentStructure(document: vscode.TextDocument): vscode.DocumentSymbol {
    const text = document.getText();
    const brackets: BracketInfo = { start: 0, end: text.length, children: [] };
    getBrackets(text, 0, brackets, []);
    return SemanticTokens_Root(document, brackets);
}

/**
 * 定义文档符号
 * Provide symbol information for the given document.
 * @param document The document in which the command was invoked.
 * @param token A cancellation token.
 * @return An array of document highlights or a thenable that resolves to such. The lack of a result can be
 * signaled by returning `undefined`, `null`, or an empty array.
 */
function provideDocumentSymbols(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.SymbolInformation[] | vscode.DocumentSymbol[]> {
    let documentStructure: vscode.DocumentSymbol = getDocumentStructure(document);
    return [documentStructure];
}

export { provideDocumentSymbols };
