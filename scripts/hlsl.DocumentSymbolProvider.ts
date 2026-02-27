
import * as vscode from 'vscode';
import {
    BracketInfo,
    documentStructureUtils
} from './shared.DocumentStructure.js';
import {
    SemanticTokenInfo,
    SemanticTokens_Script,
    createRangeFromOffsets,
} from './shared.DocumentSymbolProvider.js';

// TODO: 增加hlsl测试用例
// TODO: 整理HLSL相关定义，统一到变量定义和结构体定义

const createSymbol = (
    tokenInfo: SemanticTokenInfo,
    name: string,
    detail: string,
    kind: vscode.SymbolKind,
    startOffset: number,
    totalLength: number,
    nameOffset: number,
    nameLength: number
): vscode.DocumentSymbol => {
    const range = createRangeFromOffsets(tokenInfo, startOffset, startOffset + totalLength);
    const selectionRange = createRangeFromOffsets(tokenInfo, startOffset + nameOffset, startOffset + nameOffset + nameLength);
    const symbol = new vscode.DocumentSymbol(name, detail, kind, range, selectionRange);
    symbol.children = [];
    return symbol;
};

/**
 * 解析 #define 宏定义
 */
const SemanticTokens_Defines = (
    tokenInfo: SemanticTokenInfo,
    parentSymbol: vscode.DocumentSymbol,
    bracketInfo: BracketInfo
) => {
    if (tokenInfo.token.isCancellationRequested)
        return;
    const text = bracketInfo.text;
    const regex_define = /^\s*#define\s+(\w+)(?:\(([^)]*)\))?\s*(.*)$/gm;
    let match: RegExpExecArray | null;

    while ((match = regex_define.exec(text)) !== null) {
        if (tokenInfo.token.isCancellationRequested)
            return;
        const macroName = match[1];
        const macroParams = match[2] || '';
        const macroValue = match[3] || '';

        let detail = macroParams ? `(${macroParams})` : '';
        if (macroValue.length > 30) {
            detail += ' = ' + macroValue.substring(0, 30) + '...';
        } else if (macroValue) {
            detail += ' = ' + macroValue;
        }

        const nameOffset = match[0].indexOf(macroName);
        const macroSymbol = createSymbol(
            tokenInfo, macroName, detail.trim(), vscode.SymbolKind.Constant,
            bracketInfo.start + match.index, match[0].length, nameOffset, macroName.length
        );
        parentSymbol.children.push(macroSymbol);
    }
};

/**
 * 解析 Texture/Sampler 声明
 */
const SemanticTokens_Textures = (
    tokenInfo: SemanticTokenInfo,
    parentSymbol: vscode.DocumentSymbol,
    bracketInfo: BracketInfo
) => {
    if (tokenInfo.token.isCancellationRequested)
        return;
    const text = bracketInfo.text;
    const regex_texture = /\b(Texture2D|Texture3D|TextureCube|Texture2DArray|SamplerState|SamplerComparisonState)\s*(?:<\s*\w+\s*>)?\s+(\w+)\s*(?::\s*register\s*\([^)]+\))?\s*;/g;
    let match: RegExpExecArray | null;

    while ((match = regex_texture.exec(text)) !== null) {
        if (tokenInfo.token.isCancellationRequested)
            return;
        const texType = match[1];
        const texName = match[2];
        const nameOffset = match[0].indexOf(texName);

        const texSymbol = createSymbol(
            tokenInfo, texName, texType, vscode.SymbolKind.Variable,
            bracketInfo.start + match.index, match[0].length, nameOffset, texName.length
        );
        parentSymbol.children.push(texSymbol);
    }
};

/**
 * 解析 StructuredBuffer 等
 */
const SemanticTokens_Buffers = (
    tokenInfo: SemanticTokenInfo,
    parentSymbol: vscode.DocumentSymbol,
    bracketInfo: BracketInfo
) => {
    if (tokenInfo.token.isCancellationRequested)
        return;
    const text = bracketInfo.text;
    const regex_buffer = /\b(StructuredBuffer|RWStructuredBuffer|Buffer|RWBuffer|ByteAddressBuffer|RWByteAddressBuffer)\s*<\s*(\w+)\s*>\s+(\w+)\s*(?::\s*register\s*\([^)]+\))?\s*;/g;
    let match: RegExpExecArray | null;

    while ((match = regex_buffer.exec(text)) !== null) {
        if (tokenInfo.token.isCancellationRequested)
            return;
        const bufferType = match[1];
        const elementType = match[2];
        const bufferName = match[3];
        const nameOffset = match[0].indexOf(bufferName);

        const bufferSymbol = createSymbol(
            tokenInfo, bufferName, `${bufferType}<${elementType}>`, vscode.SymbolKind.Variable,
            bracketInfo.start + match.index, match[0].length, nameOffset, bufferName.length
        );
        parentSymbol.children.push(bufferSymbol);
    }
};

/**
 * 解析 HLSL 文档符号
 */
const SemanticTokens_HLSL = (
    tokenInfo: SemanticTokenInfo,
    parentSymbol: vscode.DocumentSymbol,
    bracketInfo: BracketInfo
) => {
    if (tokenInfo.token.isCancellationRequested)
        return;
    SemanticTokens_Script(tokenInfo, parentSymbol, bracketInfo);

    SemanticTokens_Defines(tokenInfo, parentSymbol, bracketInfo);
    SemanticTokens_Textures(tokenInfo, parentSymbol, bracketInfo);
    SemanticTokens_Buffers(tokenInfo, parentSymbol, bracketInfo);
};

const SemanticTokens_Root = (document: vscode.TextDocument, token: vscode.CancellationToken): vscode.DocumentSymbol[] => {
    if (token.isCancellationRequested)
        return [];
    const rootBracket = documentStructureUtils.getRootBracket(document, token);
    const tokenInfo: SemanticTokenInfo = { document, token };
    const range = createRangeFromOffsets(tokenInfo, 0, document.getText().length);
    const rootSymbol = new vscode.DocumentSymbol('HLSL', '', vscode.SymbolKind.File, range, range);
    SemanticTokens_HLSL(tokenInfo, rootSymbol, rootBracket);
    return rootSymbol.children;
};

/**
 * 定义文档符号
 * Provide symbol information for the given document.
 * @param document The document in which the command was invoked.
 * @param token A cancellation token.
 * @return An array of document highlights or a thenable that resolves to such. The lack of a result can be
 * signaled by returning `undefined`, `null`, or an empty array.
 */
const provideDocumentSymbols = (document: vscode.TextDocument, token: vscode.CancellationToken): vscode.DocumentSymbol[] => {
    return SemanticTokens_Root(document, token);
};

/**
 * 注册功能：文档符号提供
 * @param context
 */
const registerDocumentSymbolProvider = (context: vscode.ExtensionContext) => {
    const documentSymbolProvider = vscode.languages.registerDocumentSymbolProvider('hlsl', {
        provideDocumentSymbols
    });
    context.subscriptions.push(documentSymbolProvider);
};

export { registerDocumentSymbolProvider };
