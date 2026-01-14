
import * as vscode from 'vscode';
import { BracketInfo, documentStructureUtils } from './shaderlab.DocumentStructure';

interface SemanticTokenRangeInfo {
    document: vscode.TextDocument;
    rootSymbol: vscode.DocumentSymbol;
}

function SemanticTokens_variable(rangeInfo: SemanticTokenRangeInfo, parentSymbol: vscode.DocumentSymbol, bracketInfo: BracketInfo) {
    const { document, rootSymbol } = rangeInfo;
    const text = bracketInfo.text;
    let match: RegExpExecArray;

    let regex_para = /(?<!\/\/.*)(\w+)\s+(\w+(?:\[\d*\])?)(\s*[=;])/g;
    while ((match = regex_para.exec(text))) {
        const startPosition = document.positionAt(match.index + bracketInfo.start);
        let _exit = false;
        for (const child of parentSymbol.children) {
            if (startPosition.compareTo(child.range.start) >= 0 && startPosition.compareTo(child.range.end) <= 0) {
                _exit = true;
                break;
            }
        }
        if (_exit)
            continue;

        const match_1_start = match[0].indexOf(match[1]);
        const match_2_start = match[0].indexOf(match[2], match_1_start + match[1].length);
        const selectionRange = new vscode.Range(
            document.positionAt(bracketInfo.start + match.index + match_2_start),
            document.positionAt(bracketInfo.start + match.index + match_2_start + match[2].length));

        const range = new vscode.Range(
            document.positionAt(bracketInfo.start + match.index + match_1_start),
            document.positionAt(bracketInfo.start + match.index + match_2_start + match[2].length));
        // 防止 return x;
        if (documentStructureUtils.isType(rootSymbol, range.start, match[1])) {
            const name = /^\w+/.exec(match[2])[0];
            let detail = match[1];

            let arrayMatch: RegExpExecArray;
            if (arrayMatch = /\[\d+\]/g.exec(match[2]))
                detail += arrayMatch[0];

            const node = new vscode.DocumentSymbol(name, detail, vscode.SymbolKind.Variable, range, selectionRange);
            parentSymbol.children.push(node);
        }
    }

    regex_para = /(?<!\/\/.*)(\w+)\s+(\w+(?:\[\d+\])?)\s*;/g;
    while ((match = regex_para.exec(text))) {
        const startPosition = document.positionAt(match.index + bracketInfo.start);
        let _exit = false;
        for (const child of parentSymbol.children) {
            if (startPosition.compareTo(child.range.start) >= 0 && startPosition.compareTo(child.range.end) <= 0) {
                _exit = true;
                break;
            }
        }
        if (_exit)
            continue;

        const match_1_start = match[0].indexOf(match[1]);
        const match_2_start = match[0].indexOf(match[2], match_1_start + match[1].length);
        const endPosition = document.positionAt(match.index + bracketInfo.start + match_2_start + match[2].length);
        const selectionRange = new vscode.Range(
            document.positionAt(bracketInfo.start + match.index + match_2_start),
            endPosition);

        const range = new vscode.Range(
            document.positionAt(bracketInfo.start + match.index + match_1_start),
            endPosition);

        // 防止 return x;
        if (documentStructureUtils.isType(rootSymbol, range.start, match[1])) {
            const name = /^\w+/.exec(match[2])[0];
            let detail = match[1];

            let arrayMatch: RegExpExecArray;
            if (arrayMatch = /\[\d+\]/g.exec(match[2]))
                detail += arrayMatch[0];

            const node = new vscode.DocumentSymbol(name, detail, vscode.SymbolKind.Variable, range, selectionRange);
            parentSymbol.children.push(node);
        }
    }
}

function SemanticTokens_params(rangeInfo: SemanticTokenRangeInfo, parentSymbol: vscode.DocumentSymbol, bracketInfo: BracketInfo) {
    const { document } = rangeInfo;
    const text = bracketInfo.text;
    let match: RegExpExecArray;

    const regex_para = /(out\s+)?(\w+)\s+(\w+)/mg;
    while ((match = regex_para.exec(text))) {
        const match_2_start = match[0].indexOf(match[2]);
        const match_3_start = match[0].indexOf(match[3], match_2_start + match[2].length);
        const selectionRange = new vscode.Range(
            document.positionAt(bracketInfo.start + match.index + match_3_start),
            document.positionAt(bracketInfo.start + match.index + match_3_start + match[3].length));
        const range = new vscode.Range(
            document.positionAt(bracketInfo.start + match.index + match_2_start),
            document.positionAt(bracketInfo.start + match.index + match[0].length));
        const node = new vscode.DocumentSymbol(match[3], match[2], vscode.SymbolKind.Variable, range, selectionRange);
        parentSymbol.children.push(node);
    }
}

function SemanticTokens_Struct(rangeInfo: SemanticTokenRangeInfo, parentSymbol: vscode.DocumentSymbol, bracketInfo: BracketInfo) {
    const { document } = rangeInfo;
    const text = bracketInfo.text;
    let match: RegExpExecArray;

    const regex_field = /(\w+)\s+(\S+)\s*:\s*(\w+).*?$/mg;
    while ((match = regex_field.exec(text))) {
        const match_1_start = match[0].indexOf(match[1]);
        const match_2_start = match[0].indexOf(match[2], match_1_start + match[1].length);
        const match_3_start = match[0].indexOf(match[3], match_2_start + match[2].length);
        const selectionRange = new vscode.Range(
            document.positionAt(bracketInfo.start + match.index + match_2_start),
            document.positionAt(bracketInfo.start + match.index + match_2_start + match[2].match(/\w+/)[0].length));

        const range = new vscode.Range(
            document.positionAt(match.index + bracketInfo.start),
            document.positionAt(match.index + bracketInfo.start + match[0].length));

        const name = /^\w+/.exec(match[2])[0];
        let detail = match[1];

        let arrayMatch: RegExpExecArray;
        if (arrayMatch = /\[\d+\]/g.exec(match[2]))
            detail += arrayMatch[0];

        const node = new vscode.DocumentSymbol(name, detail, vscode.SymbolKind.Field, range, selectionRange);
        parentSymbol.children.push(node);
    }
}

function SemanticTokens_CGPROGRAM(rangeInfo: SemanticTokenRangeInfo, parentSymbol: vscode.DocumentSymbol, bracketInfo: BracketInfo) {
    const { document } = rangeInfo;
    const text = bracketInfo.text;
    let match: RegExpExecArray;

    const regex_struct = /(?<!\/\/.*)(struct)\s*(\w+)\s*{/g;
    while (match = regex_struct.exec(text)) {
        const match_1_start = match[0].indexOf(match[1]);
        const match_2_start = match[0].indexOf(match[2], match_1_start + match[1].length);
        const selectionRange = new vscode.Range(
            document.positionAt(bracketInfo.start + match.index + match_2_start),
            document.positionAt(bracketInfo.start + match.index + match_2_start + match[2].length));

        const end = match[0].length - 1 + match.index + bracketInfo.start;
        const bracket = bracketInfo.children.find(item => item.start == end);
        const range = new vscode.Range(
            document.positionAt(match.index + bracketInfo.start),
            document.positionAt(bracket.end));

        const node = new vscode.DocumentSymbol(match[2], '', vscode.SymbolKind.Struct, range, selectionRange);
        parentSymbol.children.push(node);

        SemanticTokens_Struct(rangeInfo, node, bracket);
    }

    const regex_function = /(?<!\/\/.*)(\w+)\s+(\w+)\s*\((.*?)\)(?:\s*:\s*(\w+))?\s*{/g;
    while (match = regex_function.exec(text)) {
        const match_1_start = match[0].indexOf(match[1]);
        const match_2_start = match[0].indexOf(match[2], match_1_start + match[1].length);
        const match_3_start = match[0].indexOf(match[3], match_2_start + match[2].length);
        const selectionRange = new vscode.Range(
            document.positionAt(bracketInfo.start + match.index + match_2_start),
            document.positionAt(bracketInfo.start + match.index + match_2_start + match[2].length));

        const end = bracketInfo.start + match.index + match[0].length - 1;
        const bracket = bracketInfo.children.find(item => item.start == end);
        const range = new vscode.Range(
            document.positionAt(bracketInfo.start + match.index),
            document.positionAt(bracket.end));

        const node = new vscode.DocumentSymbol(match[2], match[1], vscode.SymbolKind.Method, range, selectionRange);
        parentSymbol.children.push(node);

        if (match[3].length > 0) {
            const start = bracketInfo.start + match.index + match_3_start;
            const bracket = new BracketInfo(document, start, null);
            SemanticTokens_params(rangeInfo, node, bracket);
        }

        SemanticTokens_variable(rangeInfo, node, bracket);
    }

    SemanticTokens_variable(rangeInfo, parentSymbol, bracketInfo);
}

function SemanticTokens_CG(rangeInfo: SemanticTokenRangeInfo, parentSymbol: vscode.DocumentSymbol, bracketInfo: BracketInfo) {
    const { document } = rangeInfo;
    const text = bracketInfo.text;

    let matchStart = /CGPROGRAM|CGINCLUDE/ig.exec(text);
    let matchEnd = /ENDCG/ig.exec(text);
    if (matchStart == null || matchEnd == null) {
        matchStart = /HLSLPROGRAM|HLSLINCLUDE/ig.exec(text);
        matchEnd = /ENDHLSL/ig.exec(text);
    }
    if (matchStart == null || matchEnd == null)
        return;

    const startPosition = document.positionAt(matchStart.index + bracketInfo.start);
    for (const child of parentSymbol.children) {
        if (startPosition.compareTo(child.range.start) >= 0 && startPosition.compareTo(child.range.end) <= 0)
            return;
    }

    if (matchStart.length > 0 && matchEnd.length > 0) {
        const selectionRange = new vscode.Range(
            document.positionAt(matchStart.index + bracketInfo.start),
            document.positionAt(matchStart.index + matchStart[0].length + bracketInfo.start));

        const range = new vscode.Range(
            document.positionAt(matchStart.index + bracketInfo.start),
            document.positionAt(matchEnd.index + matchEnd[0].length + bracketInfo.start));

        const node = new vscode.DocumentSymbol(matchStart[0].toUpperCase(), '', vscode.SymbolKind.Package, range, selectionRange);
        parentSymbol.children.push(node);

        const start = matchStart[0].length + matchStart.index + bracketInfo.start;
        const end = matchEnd.index + bracketInfo.start;
        const bracket = new BracketInfo(document, start, null);
        bracket.set_end(end);
        bracket.children.push(...bracketInfo.children);
        SemanticTokens_CGPROGRAM(rangeInfo, node, bracket);
    }
}

function SemanticTokens_SubShader(rangeInfo: SemanticTokenRangeInfo, parentSymbol: vscode.DocumentSymbol, bracketInfo: BracketInfo) {
    const { document } = rangeInfo;
    const text = bracketInfo.text;
    let match: RegExpExecArray;
    const regex = /(Pass)\s*{/ig;
    while (match = regex.exec(text)) {
        const selectionRange = new vscode.Range(
            document.positionAt(match.index + bracketInfo.start),
            document.positionAt(match.index + match[1].length + bracketInfo.start));

        const end = match[0].length - 1 + match.index + bracketInfo.start;
        const bracket = bracketInfo.children.find(item => item.start == end);
        const range = new vscode.Range(
            document.positionAt(match.index + bracketInfo.start),
            document.positionAt(bracket.end));

        const node = new vscode.DocumentSymbol(match[1], '', vscode.SymbolKind.Package, range, selectionRange);
        parentSymbol.children.push(node);

        SemanticTokens_CG(rangeInfo, node, bracket);
    }
    SemanticTokens_CG(rangeInfo, parentSymbol, bracketInfo);
}

function SemanticTokens_Properties(rangeInfo: SemanticTokenRangeInfo, parentSymbol: vscode.DocumentSymbol, bracketInfo: BracketInfo) {
    const { document } = rangeInfo;
    const text = bracketInfo.text;
    let match: RegExpExecArray;
    // _MainTex ("Texture", 2D) = "white" {}
    // _Radius ("Radius", Range(0,10)) = 1.0
    const regex = /(\w+)\s*\(".*?"\s*,\s*(.+?)\)\s*(?:=\s*.*)$/mg;
    while (match = regex.exec(text)) {
        const selectionRange = new vscode.Range(
            document.positionAt(match.index + bracketInfo.start),
            document.positionAt(match.index + match[1].length + bracketInfo.start));

        const range = new vscode.Range(
            document.positionAt(match.index + bracketInfo.start),
            document.positionAt(match.index + bracketInfo.start + match[0].length));

        const node = new vscode.DocumentSymbol(match[1], match[2], vscode.SymbolKind.Property, range, selectionRange);
        parentSymbol.children.push(node);
    }
}

function SemanticTokens_Shader(rangeInfo: SemanticTokenRangeInfo, parentSymbol: vscode.DocumentSymbol, bracketInfo: BracketInfo) {
    const { document } = rangeInfo;
    const text = bracketInfo.text;
    let match: RegExpExecArray;
    if (match = /(Properties)\s*{/ig.exec(text)) {
        const selectionRange = new vscode.Range(
            document.positionAt(match.index + bracketInfo.start),
            document.positionAt(match.index + match[1].length + bracketInfo.start));

        const end = match[0].length - 1 + match.index + bracketInfo.start;
        const bracket = bracketInfo.children.find(item => item.start == end);
        const range = new vscode.Range(
            document.positionAt(match.index + bracketInfo.start),
            document.positionAt(bracket.end));

        const node = new vscode.DocumentSymbol('Properties', '', vscode.SymbolKind.Package, range, selectionRange);
        parentSymbol.children.push(node);

        SemanticTokens_Properties(rangeInfo, node, bracket);
    }
    const regex = /(SubShader)\s*{/ig;
    while (match = regex.exec(text)) {
        const selectionRange = new vscode.Range(
            document.positionAt(match.index + bracketInfo.start),
            document.positionAt(match.index + match[1].length + bracketInfo.start));

        const end = match[0].length - 1 + match.index + bracketInfo.start;
        const bracket = bracketInfo.children.find(item => item.start == end);
        const range = new vscode.Range(
            document.positionAt(match.index + bracketInfo.start),
            document.positionAt(bracket.end));

        const node = new vscode.DocumentSymbol('SubShader', '', vscode.SymbolKind.Package, range, selectionRange);
        parentSymbol.children.push(node);

        SemanticTokens_SubShader(rangeInfo, node, bracket);
    }
}

function SemanticTokens_Root(document: vscode.TextDocument, bracketInfo: BracketInfo): vscode.DocumentSymbol {
    const text = bracketInfo.text;
    let match: RegExpExecArray;
    if (match = /(Shader)\s*(".*?")\s*{/ig.exec(text)) {
        const selectionRange = new vscode.Range(
            document.positionAt(match.index + bracketInfo.start),
            document.positionAt(match.index + match[1].length + bracketInfo.start));

        const end = match[0].length - 1 + match.index + bracketInfo.start;
        const bracket = bracketInfo.children.find(item => item.start == end);
        const range = new vscode.Range(
            document.positionAt(match.index + bracketInfo.start),
            document.positionAt(bracket.end));

        const rootSymbol = new vscode.DocumentSymbol('Shader', match[2], vscode.SymbolKind.File, range, selectionRange);
        SemanticTokens_Shader({ document, rootSymbol }, rootSymbol, bracket);
        return rootSymbol;
    }
    return null;
}

// 定义文档符号工具
const documentSymbolProvider = vscode.languages.registerDocumentSymbolProvider('shaderlab', {
    /**
     * 提供文档中所有符号信息
     * Provide symbol information for the given document.
     * @param document The document in which the command was invoked.
     * @param token A cancellation token.
     * @return An array of document highlights or a thenable that resolves to such. The lack of a result can be
     * signaled by returning `undefined`, `null`, or an empty array.
     */
    // TODO: 链式传递CancellationToken
    provideDocumentSymbols(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.SymbolInformation[] | vscode.DocumentSymbol[]> {
        const rootBracket = documentStructureUtils.getRootBracket(document);
        const documentStructure = SemanticTokens_Root(document, rootBracket);
        return [documentStructure];
    }
});

export { documentSymbolProvider };
