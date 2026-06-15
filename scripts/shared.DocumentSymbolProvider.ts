import * as vscode from 'vscode';
import { BracketInfo } from './shared.DocumentStructure.js';

interface SemanticTokenInfo {
    document: vscode.TextDocument;
    token: vscode.CancellationToken;
}

const createRangeFromOffsets = (
    tokenInfo: SemanticTokenInfo,
    startOffset: number,
    endOffset: number
): vscode.Range =>
    new vscode.Range(
        tokenInfo.document.positionAt(startOffset),
        tokenInfo.document.positionAt(endOffset));

const createSelectionRangeFromMatch = (
    tokenInfo: SemanticTokenInfo,
    baseOffset: number,
    matchIndex: number,
    matchLength: number
): vscode.Range => createRangeFromOffsets(tokenInfo, baseOffset + matchIndex, baseOffset + matchIndex + matchLength);

const isInsideChildRange = (position: vscode.Position, children: vscode.DocumentSymbol[]): boolean => {
    for (const child of children) {
        const isInside =
            position.isAfterOrEqual(child.range.start) &&
            position.isBeforeOrEqual(child.range.end);
        if (isInside)
            return true;
    }
    return false;
};

const createVariableSymbol = (
    parentSymbol: vscode.DocumentSymbol,
    typeName: string,
    varName: string,
    kind: vscode.SymbolKind,
    range: vscode.Range,
    selectionRange: vscode.Range
): vscode.DocumentSymbol | null => {
    // 防止 return x;
    if (typeName === 'return')
        return null;

    const name = /^\w+/.exec(varName)[0];
    let detail = typeName;

    const arrayMatch = /\[\d+\]/g.exec(varName);
    if (arrayMatch) {
        detail += arrayMatch[0];
    }

    const node = new vscode.DocumentSymbol(name, detail, kind, range, selectionRange);
    parentSymbol.children.push(node);
    return node;
};

const SemanticTokens_variable = (
    tokenInfo: SemanticTokenInfo,
    parentSymbol: vscode.DocumentSymbol,
    bracketInfo: BracketInfo
) => {
    if (tokenInfo.token.isCancellationRequested)
        return;
    const { document } = tokenInfo;
    const text = bracketInfo.text;
    let match: RegExpExecArray;

    let regex_para = /(?<!\/\/.*)(\w+)\s+(\w+(?:\[\d*\])?)(\s*[=;])/g;
    while ((match = regex_para.exec(text))) {
        if (tokenInfo.token.isCancellationRequested)
            return;
        const startPosition = document.positionAt(match.index + bracketInfo.start);
        if (isInsideChildRange(startPosition, parentSymbol.children))
            continue;

        const match_1_start = match[0].indexOf(match[1]);
        const match_2_start = match[0].indexOf(match[2], match_1_start + match[1].length);
        const selectionRange = createSelectionRangeFromMatch(tokenInfo, bracketInfo.start + match.index, match_2_start, match[2].length);

        const range = createRangeFromOffsets(
            tokenInfo,
            bracketInfo.start + match.index + match_1_start,
            bracketInfo.start + match.index + match_2_start + match[2].length
        );

        createVariableSymbol(parentSymbol, match[1], match[2], vscode.SymbolKind.Variable, range, selectionRange);
    }

    regex_para = /(?<!\/\/.*)(\w+)\s+(\w+(?:\[\d+\])?)\s*;/g;
    while ((match = regex_para.exec(text))) {
        if (tokenInfo.token.isCancellationRequested)
            return;
        const startPosition = document.positionAt(match.index + bracketInfo.start);
        if (isInsideChildRange(startPosition, parentSymbol.children))
            continue;

        const match_1_start = match[0].indexOf(match[1]);
        const match_2_start = match[0].indexOf(match[2], match_1_start + match[1].length);
        const selectionRange = createSelectionRangeFromMatch(tokenInfo, bracketInfo.start + match.index, match_2_start, match[2].length);

        const range = createRangeFromOffsets(
            tokenInfo,
            bracketInfo.start + match.index + match_1_start,
            bracketInfo.start + match.index + match_2_start + match[2].length
        );

        createVariableSymbol(parentSymbol, match[1], match[2], vscode.SymbolKind.Field, range, selectionRange);
    }
};

const SemanticTokens_params = (tokenInfo: SemanticTokenInfo, parentSymbol: vscode.DocumentSymbol, bracketInfo: BracketInfo) => {
    if (tokenInfo.token.isCancellationRequested)
        return;
    const text = bracketInfo.text;
    let match: RegExpExecArray;

    const regex_para = /(out\s+)?(\w+)\s+(\w+)/mg;
    while ((match = regex_para.exec(text))) {
        if (tokenInfo.token.isCancellationRequested)
            return;
        const match_2_start = match[0].indexOf(match[2]);
        const match_3_start = match[0].indexOf(match[3], match_2_start + match[2].length);
        const selectionRange = createSelectionRangeFromMatch(tokenInfo, bracketInfo.start + match.index, match_3_start, match[3].length);
        const range = createRangeFromOffsets(
            tokenInfo,
            bracketInfo.start + match.index + match_2_start,
            bracketInfo.start + match.index + match[0].length
        );
        createVariableSymbol(parentSymbol, match[1], match[2], vscode.SymbolKind.Variable, range, selectionRange);
    }
};

const SemanticTokens_Fields = (tokenInfo: SemanticTokenInfo, bufferNode: vscode.DocumentSymbol, bufferText: string, bufferStartOffset: number) => {
    let fieldMatch: RegExpExecArray;
    const regex_field = /(?<!\/\/.*)(\w+)\s+(\w+(?:\s*\[\s*\d+\s*\])?)(?:\s*:\s*[^;]+)?\s*;/g;
    while ((fieldMatch = regex_field.exec(bufferText))) {
        if (tokenInfo.token.isCancellationRequested)
            return;

        const match_1_start = fieldMatch[0].indexOf(fieldMatch[1]);
        const match_2_start = fieldMatch[0].indexOf(fieldMatch[2], match_1_start + fieldMatch[1].length);

        const baseNameMatch = fieldMatch[2].match(/^\w+/);
        if (!baseNameMatch) continue;
        const baseNameLength = baseNameMatch[0].length;

        const selectionRange = createSelectionRangeFromMatch(tokenInfo, bufferStartOffset + fieldMatch.index, match_2_start, baseNameLength);
        const range = createRangeFromOffsets(
            tokenInfo,
            bufferStartOffset + fieldMatch.index + match_1_start,
            bufferStartOffset + fieldMatch.index + match_2_start + fieldMatch[2].length
        );

        createVariableSymbol(bufferNode, fieldMatch[1], fieldMatch[2], vscode.SymbolKind.Field, range, selectionRange);
    }
};

/**
 * 解析 `CBUFFER_START(name) ... CBUFFER_END`
 */
const SemanticTokens_CBuffer_Macro = (tokenInfo: SemanticTokenInfo, parentSymbol: vscode.DocumentSymbol, bracketInfo: BracketInfo): void => {
    if (tokenInfo.token.isCancellationRequested)
        return;
    const text = bracketInfo.text;
    let match: RegExpExecArray;

    const regex_buffer = /(?<!\/\/.*)CBUFFER_START\s*\(\s*(\w+)\s*\)/g;
    while ((match = regex_buffer.exec(text))) {
        if (tokenInfo.token.isCancellationRequested)
            return;

        const name = match[1];
        const startIndex = match.index + match[0].length;
        const endIndex = text.indexOf("CBUFFER_END", startIndex);

        if (endIndex === -1)
            continue;

        const bufferStartOffset = bracketInfo.start + startIndex;
        const bufferText = text.substring(startIndex, endIndex);

        const selectionRange = createSelectionRangeFromMatch(tokenInfo, bracketInfo.start + match.index, match[0].indexOf(name), name.length);
        const range = createRangeFromOffsets(tokenInfo, bracketInfo.start + match.index, bracketInfo.start + endIndex + "CBUFFER_END".length);

        const bufferNode = createVariableSymbol(parentSymbol, name, "cbuffer", vscode.SymbolKind.Struct, range, selectionRange);
        SemanticTokens_Fields(tokenInfo, bufferNode, bufferText, bufferStartOffset);
    }
};

/**
 * 解析`cbuffer/tbuffer`，注意：tbuffer不支持数组和默认值
 * 将cbuffer/tbuffer作为一个结构体来处理
 * - 字段的类型为cbuffer/tbuffer声明的类型
 * - 字段的名字为cbuffer/tbuffer内声明的变量名
 * - 字段的detail为变量声明的完整类型（包含数组部分）
 */
const SemanticTokens_CBuffer_TBuffer = (tokenInfo: SemanticTokenInfo, parentSymbol: vscode.DocumentSymbol, bracketInfo: BracketInfo): void => {
    if (tokenInfo.token.isCancellationRequested)
        return;
    const text = bracketInfo.text;
    let match: RegExpExecArray;

    const regex_buffer = /(?<!\/\/.*)\b(cbuffer|tbuffer)\s+(\w+)\s*\{/g;
    while ((match = regex_buffer.exec(text))) {
        if (tokenInfo.token.isCancellationRequested)
            return;

        const type = match[1];
        const name = match[2];

        const end = match[0].length - 1 + match.index + bracketInfo.start;
        const bracket = bracketInfo.children.find(item => item.start == end);
        if (!bracket)
            continue;

        const bufferStartOffset = bracket.start;
        const bufferText = bracket.text;

        const selectionRange = createSelectionRangeFromMatch(tokenInfo, bracketInfo.start + match.index, match[0].indexOf(name), name.length);
        const range = createRangeFromOffsets(tokenInfo, bracketInfo.start + match.index, bracket.end);

        const bufferNode = createVariableSymbol(parentSymbol, name, type, vscode.SymbolKind.Struct, range, selectionRange);
        SemanticTokens_Fields(tokenInfo, bufferNode, bufferText, bufferStartOffset);
    }
};

const SemanticTokens_Struct = (tokenInfo: SemanticTokenInfo, parentSymbol: vscode.DocumentSymbol, bracketInfo: BracketInfo) => {
    if (tokenInfo.token.isCancellationRequested)
        return;
    const text = bracketInfo.text;
    let match: RegExpExecArray;

    const regex_field = /(\w+)\s+(\S+)\s*:\s*(\w+).*?$/mg;
    while ((match = regex_field.exec(text))) {
        if (tokenInfo.token.isCancellationRequested)
            return;
        const match_1_start = match[0].indexOf(match[1]);
        const match_2_start = match[0].indexOf(match[2], match_1_start + match[1].length);
        const selectionRange = createSelectionRangeFromMatch(
            tokenInfo,
            bracketInfo.start + match.index,
            match_2_start,
            match[2].match(/\w+/)[0].length
        );

        const range = createRangeFromOffsets(
            tokenInfo,
            bracketInfo.start + match.index,
            bracketInfo.start + match.index + match[0].length
        );

        const name = /^\w+/.exec(match[2])[0];
        let detail = match[1];

        const arrayMatch = /\[\d+\]/g.exec(match[2]);
        if (arrayMatch)
            detail += arrayMatch[0];

        createVariableSymbol(parentSymbol, name, detail, vscode.SymbolKind.Field, range, selectionRange);
    }
};

const SemanticTokens_Script = (tokenInfo: SemanticTokenInfo, parentSymbol: vscode.DocumentSymbol, bracketInfo: BracketInfo) => {
    if (tokenInfo.token.isCancellationRequested)
        return;
    const { document } = tokenInfo;
    const text = bracketInfo.text;
    let match: RegExpExecArray;

    const regex_struct = /(?<!\/\/.*)(struct)\s*(\w+)\s*{/g;
    while ((match = regex_struct.exec(text))) {
        if (tokenInfo.token.isCancellationRequested)
            return;
        const match_1_start = match[0].indexOf(match[1]);
        const match_2_start = match[0].indexOf(match[2], match_1_start + match[1].length);
        const selectionRange = createSelectionRangeFromMatch(tokenInfo, bracketInfo.start + match.index, match_2_start, match[2].length);

        const end = match[0].length - 1 + match.index + bracketInfo.start;
        const bracket = bracketInfo.children.find(item => item.start == end);
        const range = createRangeFromOffsets(tokenInfo, bracketInfo.start + match.index, bracket.end);

        const node = createVariableSymbol(parentSymbol, match[2], '', vscode.SymbolKind.Struct, range, selectionRange);

        SemanticTokens_Struct(tokenInfo, node, bracket);
    }

    const regex_function = /(?<!\/\/.*)(\w+)\s+(\w+)\s*\((.*?)\)(?:\s*:\s*(\w+))?\s*{/g;
    while ((match = regex_function.exec(text))) {
        if (tokenInfo.token.isCancellationRequested)
            return;
        const match_1_start = match[0].indexOf(match[1]);
        const match_2_start = match[0].indexOf(match[2], match_1_start + match[1].length);
        const match_3_start = match[0].indexOf(match[3], match_2_start + match[2].length);
        const selectionRange = createSelectionRangeFromMatch(tokenInfo, bracketInfo.start + match.index, match_2_start, match[2].length);

        const end = bracketInfo.start + match.index + match[0].length - 1;
        const bracket = bracketInfo.children.find(item => item.start == end);
        const range = createRangeFromOffsets(tokenInfo, bracketInfo.start + match.index, bracket.end);

        const node = createVariableSymbol(parentSymbol, match[1], match[2], vscode.SymbolKind.Method, range, selectionRange);

        if (match[3].length > 0) {
            const start = bracketInfo.start + match.index + match_3_start;
            const bracket = new BracketInfo(document, start, null);
            const end = start + match[3].length;
            bracket.set_end(end);
            SemanticTokens_params(tokenInfo, node, bracket);
        }

        SemanticTokens_variable(tokenInfo, node, bracket);
    }

    SemanticTokens_CBuffer_TBuffer(tokenInfo, parentSymbol, bracketInfo);
    SemanticTokens_CBuffer_Macro(tokenInfo, parentSymbol, bracketInfo);
    SemanticTokens_variable(tokenInfo, parentSymbol, bracketInfo);
};

export {
    SemanticTokenInfo,
    SemanticTokens_Script,
    createRangeFromOffsets,
    createSelectionRangeFromMatch,
};
