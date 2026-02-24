import * as vscode from 'vscode';
import {
    BracketInfo,
    documentStructureUtils
} from './shared.DocumentStructure.js';

interface SemanticTokenRangeInfo {
    document: vscode.TextDocument;
    token: vscode.CancellationToken;
    rootSymbol: vscode.DocumentSymbol;
}

const createRangeFromOffsets = (
    document: vscode.TextDocument,
    startOffset: number,
    endOffset: number
): vscode.Range =>
    new vscode.Range(
        document.positionAt(startOffset),
        document.positionAt(endOffset));

const createSelectionRangeFromMatch = (
    document: vscode.TextDocument,
    baseOffset: number,
    matchIndex: number,
    matchLength: number
): vscode.Range => createRangeFromOffsets(document, baseOffset + matchIndex, baseOffset + matchIndex + matchLength);

const isInsideChildRange = (position: vscode.Position, children: vscode.DocumentSymbol[]): boolean => {
    for (const child of children) {
        if (position.compareTo(child.range.start) >= 0 && position.compareTo(child.range.end) <= 0) {
            return true;
        }
    }
    return false;
};

const createVariableSymbol = (
    rootSymbol: vscode.DocumentSymbol,
    rangeStart: vscode.Position,
    typeName: string,
    varName: string,
    range: vscode.Range,
    selectionRange: vscode.Range
): vscode.DocumentSymbol | null => {
    // 防止 return x;
    if (!documentStructureUtils.isType(rootSymbol, rangeStart, typeName)) {
        return null;
    }
    const name = /^\w+/.exec(varName)[0];
    let detail = typeName;

    const arrayMatch = /\[\d+\]/g.exec(varName);
    if (arrayMatch) {
        detail += arrayMatch[0];
    }

    return new vscode.DocumentSymbol(name, detail, vscode.SymbolKind.Variable, range, selectionRange);
};

const SemanticTokens_variable = (rangeInfo: SemanticTokenRangeInfo, parentSymbol: vscode.DocumentSymbol, bracketInfo: BracketInfo) => {
    if (rangeInfo.token.isCancellationRequested)
        return;
    const { document, rootSymbol } = rangeInfo;
    const text = bracketInfo.text;
    let match: RegExpExecArray;

    let regex_para = /(?<!\/\/.*)(\w+)\s+(\w+(?:\[\d*\])?)(\s*[=;])/g;
    while ((match = regex_para.exec(text))) {
        if (rangeInfo.token.isCancellationRequested)
            return;
        const startPosition = document.positionAt(match.index + bracketInfo.start);
        if (isInsideChildRange(startPosition, parentSymbol.children))
            continue;

        const match_1_start = match[0].indexOf(match[1]);
        const match_2_start = match[0].indexOf(match[2], match_1_start + match[1].length);
        const selectionRange = createSelectionRangeFromMatch(document, bracketInfo.start + match.index, match_2_start, match[2].length);

        const range = createRangeFromOffsets(
            document,
            bracketInfo.start + match.index + match_1_start,
            bracketInfo.start + match.index + match_2_start + match[2].length
        );

        const node = createVariableSymbol(rootSymbol, range.start, match[1], match[2], range, selectionRange);
        if (node) {
            parentSymbol.children.push(node);
        }
    }

    regex_para = /(?<!\/\/.*)(\w+)\s+(\w+(?:\[\d+\])?)\s*;/g;
    while ((match = regex_para.exec(text))) {
        if (rangeInfo.token.isCancellationRequested)
            return;
        const startPosition = document.positionAt(match.index + bracketInfo.start);
        if (isInsideChildRange(startPosition, parentSymbol.children))
            continue;

        const match_1_start = match[0].indexOf(match[1]);
        const match_2_start = match[0].indexOf(match[2], match_1_start + match[1].length);
        const selectionRange = createSelectionRangeFromMatch(document, bracketInfo.start + match.index, match_2_start, match[2].length);

        const range = createRangeFromOffsets(
            document,
            bracketInfo.start + match.index + match_1_start,
            match.index + bracketInfo.start + match_2_start + match[2].length
        );

        const node = createVariableSymbol(rootSymbol, range.start, match[1], match[2], range, selectionRange);
        if (node) {
            parentSymbol.children.push(node);
        }
    }
};

const SemanticTokens_params = (rangeInfo: SemanticTokenRangeInfo, parentSymbol: vscode.DocumentSymbol, bracketInfo: BracketInfo) => {
    if (rangeInfo.token.isCancellationRequested)
        return;
    const { document } = rangeInfo;
    const text = bracketInfo.text;
    let match: RegExpExecArray;

    const regex_para = /(out\s+)?(\w+)\s+(\w+)/mg;
    while ((match = regex_para.exec(text))) {
        if (rangeInfo.token.isCancellationRequested)
            return;
        const match_2_start = match[0].indexOf(match[2]);
        const match_3_start = match[0].indexOf(match[3], match_2_start + match[2].length);
        const selectionRange = createSelectionRangeFromMatch(document, bracketInfo.start + match.index, match_3_start, match[3].length);
        const range = createRangeFromOffsets(
            document,
            bracketInfo.start + match.index + match_2_start,
            bracketInfo.start + match.index + match[0].length
        );
        const node = new vscode.DocumentSymbol(match[3], match[2], vscode.SymbolKind.Variable, range, selectionRange);
        parentSymbol.children.push(node);
    }
};

const SemanticTokens_Struct = (rangeInfo: SemanticTokenRangeInfo, parentSymbol: vscode.DocumentSymbol, bracketInfo: BracketInfo) => {
    if (rangeInfo.token.isCancellationRequested)
        return;
    const { document } = rangeInfo;
    const text = bracketInfo.text;
    let match: RegExpExecArray;

    const regex_field = /(\w+)\s+(\S+)\s*:\s*(\w+).*?$/mg;
    while ((match = regex_field.exec(text))) {
        if (rangeInfo.token.isCancellationRequested)
            return;
        const match_1_start = match[0].indexOf(match[1]);
        const match_2_start = match[0].indexOf(match[2], match_1_start + match[1].length);
        const selectionRange = createSelectionRangeFromMatch(
            document,
            bracketInfo.start + match.index,
            match_2_start,
            match[2].match(/\w+/)[0].length
        );

        const range = createRangeFromOffsets(
            document,
            match.index + bracketInfo.start,
            match.index + bracketInfo.start + match[0].length
        );

        const name = /^\w+/.exec(match[2])[0];
        let detail = match[1];

        const arrayMatch = /\[\d+\]/g.exec(match[2]);
        if (arrayMatch)
            detail += arrayMatch[0];

        const node = new vscode.DocumentSymbol(name, detail, vscode.SymbolKind.Field, range, selectionRange);
        parentSymbol.children.push(node);
    }
};

const SemanticTokens_Script = (rangeInfo: SemanticTokenRangeInfo, parentSymbol: vscode.DocumentSymbol, bracketInfo: BracketInfo) => {
    if (rangeInfo.token.isCancellationRequested)
        return;
    const { document } = rangeInfo;
    const text = bracketInfo.text;
    let match: RegExpExecArray;

    const regex_struct = /(?<!\/\/.*)(struct)\s*(\w+)\s*{/g;
    while ((match = regex_struct.exec(text))) {
        if (rangeInfo.token.isCancellationRequested)
            return;
        const match_1_start = match[0].indexOf(match[1]);
        const match_2_start = match[0].indexOf(match[2], match_1_start + match[1].length);
        const selectionRange = createSelectionRangeFromMatch(document, bracketInfo.start + match.index, match_2_start, match[2].length);

        const end = match[0].length - 1 + match.index + bracketInfo.start;
        const bracket = bracketInfo.children.find(item => item.start == end);
        const range = createRangeFromOffsets(document, match.index + bracketInfo.start, bracket.end);

        const node = new vscode.DocumentSymbol(match[2], '', vscode.SymbolKind.Struct, range, selectionRange);
        parentSymbol.children.push(node);

        SemanticTokens_Struct(rangeInfo, node, bracket);
    }

    const regex_function = /(?<!\/\/.*)(\w+)\s+(\w+)\s*\((.*?)\)(?:\s*:\s*(\w+))?\s*{/g;
    while ((match = regex_function.exec(text))) {
        if (rangeInfo.token.isCancellationRequested)
            return;
        const match_1_start = match[0].indexOf(match[1]);
        const match_2_start = match[0].indexOf(match[2], match_1_start + match[1].length);
        const match_3_start = match[0].indexOf(match[3], match_2_start + match[2].length);
        const selectionRange = createSelectionRangeFromMatch(document, bracketInfo.start + match.index, match_2_start, match[2].length);

        const end = bracketInfo.start + match.index + match[0].length - 1;
        const bracket = bracketInfo.children.find(item => item.start == end);
        const range = createRangeFromOffsets(document, bracketInfo.start + match.index, bracket.end);

        const node = new vscode.DocumentSymbol(match[2], match[1], vscode.SymbolKind.Method, range, selectionRange);
        parentSymbol.children.push(node);

        if (match[3].length > 0) {
            const start = bracketInfo.start + match.index + match_3_start;
            const bracket = new BracketInfo(document, start, null);
            const end = start + match[3].length;
            bracket.set_end(end);
            SemanticTokens_params(rangeInfo, node, bracket);
        }

        SemanticTokens_variable(rangeInfo, node, bracket);
    }

    SemanticTokens_variable(rangeInfo, parentSymbol, bracketInfo);
};

export {
    SemanticTokenRangeInfo,
    SemanticTokens_Script,
    createRangeFromOffsets,
    createSelectionRangeFromMatch,
};
