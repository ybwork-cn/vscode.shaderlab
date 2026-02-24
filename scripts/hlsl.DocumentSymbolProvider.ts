
import * as vscode from 'vscode';
import {
    BracketInfo,
    documentStructureUtils
} from './shared.DocumentStructure.js';
import {
    SemanticTokenRangeInfo,
    SemanticTokens_Script,
    createRangeFromOffsets,
} from './shared.DocumentSymbolProvider.js';

// TODO: 增加hlsl测试用例
// TODO: 整理HLSL相关定义，统一到变量定义和结构体定义

const createSymbol = (
    document: vscode.TextDocument,
    name: string,
    detail: string,
    kind: vscode.SymbolKind,
    startOffset: number,
    totalLength: number,
    nameOffset: number,
    nameLength: number
): vscode.DocumentSymbol => {
    const range = createRangeFromOffsets(document, startOffset, startOffset + totalLength);
    const selectionRange = createRangeFromOffsets(document, startOffset + nameOffset, startOffset + nameOffset + nameLength);
    const symbol = new vscode.DocumentSymbol(name, detail, kind, range, selectionRange);
    symbol.children = [];
    return symbol;
};

/**
 * Compute Shader 入口函数的属性模式
 */
const COMPUTE_KERNEL_REGEX = /\[\s*numthreads\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)\s*\]\s*\n?\s*void\s+(\w+)\s*\(/g;

/**
 * 解析 cbuffer / tbuffer 定义
 */
const SemanticTokens_CBuffers = (
    rangeInfo: SemanticTokenRangeInfo,
    parentSymbol: vscode.DocumentSymbol,
    bracketInfo: BracketInfo
) => {
    if (rangeInfo.token.isCancellationRequested)
        return;
    const { document } = rangeInfo;
    const text = bracketInfo.text;
    const regex_cbuffer = /\b(cbuffer|tbuffer)\s+(\w+)(?:\s*:\s*register\s*\([^)]+\))?\s*\{([^}]*)\}/gs;
    let match: RegExpExecArray | null;

    while ((match = regex_cbuffer.exec(text)) !== null) {
        if (rangeInfo.token.isCancellationRequested)
            return;
        const bufferType = match[1];
        const bufferName = match[2];
        const bufferBody = match[3];
        const nameOffset = match[0].indexOf(bufferName);

        const cbufferSymbol = createSymbol(
            document, bufferName, bufferType, vscode.SymbolKind.Struct,
            bracketInfo.start + match.index, match[0].length, nameOffset, bufferName.length
        );

        const varRegex = /(\w+)\s+(\w+)(?:\s*\[\s*(\d+)\s*\])?\s*;/g;
        let varMatch: RegExpExecArray | null;
        const bodyOffset = bracketInfo.start + match.index + match[0].indexOf('{') + 1;

        while ((varMatch = varRegex.exec(bufferBody)) !== null) {
            if (rangeInfo.token.isCancellationRequested)
                return;
            const varType = varMatch[1];
            const varName = varMatch[2];
            const arraySize = varMatch[3] || '';

            let detail = varType;
            if (arraySize) detail += `[${arraySize}]`;

            const varSymbol = createSymbol(
                document, varName, detail, vscode.SymbolKind.Field,
                bodyOffset + varMatch.index, varMatch[0].length,
                varMatch[0].indexOf(varName), varName.length
            );
            cbufferSymbol.children.push(varSymbol);
        }

        parentSymbol.children.push(cbufferSymbol);
    }
};

/**
 * 解析 Compute Shader 入口函数（带 [numthreads] 属性）
 */
const SemanticTokens_ComputeKernels = (
    rangeInfo: SemanticTokenRangeInfo,
    parentSymbol: vscode.DocumentSymbol,
    bracketInfo: BracketInfo
) => {
    if (rangeInfo.token.isCancellationRequested)
        return;
    const { document } = rangeInfo;
    const text = bracketInfo.text;
    COMPUTE_KERNEL_REGEX.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = COMPUTE_KERNEL_REGEX.exec(text)) !== null) {
        if (rangeInfo.token.isCancellationRequested)
            return;
        const threadX = match[1];
        const threadY = match[2];
        const threadZ = match[3];
        const kernelName = match[4];
        const detail = `kernel [${threadX}, ${threadY}, ${threadZ}]`;

        const existingSymbol = parentSymbol.children.find(s =>
            s.name === kernelName && s.kind === vscode.SymbolKind.Function
        );

        if (existingSymbol) {
            existingSymbol.detail = detail;
            continue;
        }

        const nameOffset = match[0].indexOf(kernelName);
        const kernelSymbol = createSymbol(
            document, kernelName, detail, vscode.SymbolKind.Function,
            bracketInfo.start + match.index, match[0].length, nameOffset, kernelName.length
        );
        parentSymbol.children.push(kernelSymbol);
    }
};

/**
 * 解析 #define 宏定义
 */
const SemanticTokens_Defines = (
    rangeInfo: SemanticTokenRangeInfo,
    parentSymbol: vscode.DocumentSymbol,
    bracketInfo: BracketInfo
) => {
    if (rangeInfo.token.isCancellationRequested)
        return;
    const { document } = rangeInfo;
    const text = bracketInfo.text;
    const regex_define = /^\s*#define\s+(\w+)(?:\(([^)]*)\))?\s*(.*)$/gm;
    let match: RegExpExecArray | null;

    while ((match = regex_define.exec(text)) !== null) {
        if (rangeInfo.token.isCancellationRequested)
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
            document, macroName, detail.trim(), vscode.SymbolKind.Constant,
            bracketInfo.start + match.index, match[0].length, nameOffset, macroName.length
        );
        parentSymbol.children.push(macroSymbol);
    }
};

/**
 * 解析全局变量（在函数和结构体外部的变量声明）
 */
const SemanticTokens_GlobalVariables = (
    rangeInfo: SemanticTokenRangeInfo,
    parentSymbol: vscode.DocumentSymbol,
    bracketInfo: BracketInfo
) => {
    if (rangeInfo.token.isCancellationRequested)
        return;
    const { document } = rangeInfo;
    const text = bracketInfo.text;
    const regex_global = /^(?!\s*(?:\/\/|\/\*|#|struct|cbuffer|tbuffer|if|for|while|return))(\s*)(?:(uniform|static|extern|const|volatile)\s+)*(\w+)\s+(\w+)(?:\s*\[\s*(\d+)\s*\])?(?:\s*:\s*register\s*\([^)]+\))?\s*;/gm;
    let match: RegExpExecArray | null;

    while ((match = regex_global.exec(text)) !== null) {
        if (rangeInfo.token.isCancellationRequested)
            return;
        const modifiers = match[2] || '';
        const varType = match[3];
        const varName = match[4];
        const arraySize = match[5] || '';


        let detail = varType;
        if (modifiers) detail = `${modifiers} ${detail}`;
        if (arraySize) detail += `[${arraySize}]`;

        const nameOffset = match[0].indexOf(varName);
        const varSymbol = createSymbol(
            document, varName, detail, vscode.SymbolKind.Variable,
            bracketInfo.start + match.index, match[0].length, nameOffset, varName.length
        );
        parentSymbol.children.push(varSymbol);
    }
};

/**
 * 解析 Texture/Sampler 声明
 */
const SemanticTokens_Textures = (
    rangeInfo: SemanticTokenRangeInfo,
    parentSymbol: vscode.DocumentSymbol,
    bracketInfo: BracketInfo
) => {
    if (rangeInfo.token.isCancellationRequested)
        return;
    const { document } = rangeInfo;
    const text = bracketInfo.text;
    const regex_texture = /\b(Texture2D|Texture3D|TextureCube|Texture2DArray|SamplerState|SamplerComparisonState)\s*(?:<\s*\w+\s*>)?\s+(\w+)\s*(?::\s*register\s*\([^)]+\))?\s*;/g;
    let match: RegExpExecArray | null;

    while ((match = regex_texture.exec(text)) !== null) {
        if (rangeInfo.token.isCancellationRequested)
            return;
        const texType = match[1];
        const texName = match[2];
        const nameOffset = match[0].indexOf(texName);

        const texSymbol = createSymbol(
            document, texName, texType, vscode.SymbolKind.Variable,
            bracketInfo.start + match.index, match[0].length, nameOffset, texName.length
        );
        parentSymbol.children.push(texSymbol);
    }
};

/**
 * 解析 StructuredBuffer 等
 */
const SemanticTokens_Buffers = (
    rangeInfo: SemanticTokenRangeInfo,
    parentSymbol: vscode.DocumentSymbol,
    bracketInfo: BracketInfo
) => {
    if (rangeInfo.token.isCancellationRequested)
        return;
    const { document } = rangeInfo;
    const text = bracketInfo.text;
    const regex_buffer = /\b(StructuredBuffer|RWStructuredBuffer|Buffer|RWBuffer|ByteAddressBuffer|RWByteAddressBuffer)\s*<\s*(\w+)\s*>\s+(\w+)\s*(?::\s*register\s*\([^)]+\))?\s*;/g;
    let match: RegExpExecArray | null;

    while ((match = regex_buffer.exec(text)) !== null) {
        if (rangeInfo.token.isCancellationRequested)
            return;
        const bufferType = match[1];
        const elementType = match[2];
        const bufferName = match[3];
        const nameOffset = match[0].indexOf(bufferName);

        const bufferSymbol = createSymbol(
            document, bufferName, `${bufferType}<${elementType}>`, vscode.SymbolKind.Variable,
            bracketInfo.start + match.index, match[0].length, nameOffset, bufferName.length
        );
        parentSymbol.children.push(bufferSymbol);
    }
};

/**
 * 解析 groupshared 变量（Compute Shader 特有）
 */
const SemanticTokens_GroupShared = (
    rangeInfo: SemanticTokenRangeInfo,
    parentSymbol: vscode.DocumentSymbol,
    bracketInfo: BracketInfo
) => {
    if (rangeInfo.token.isCancellationRequested)
        return;
    const { document } = rangeInfo;
    const text = bracketInfo.text;
    const regex_groupshared = /\bgroupshared\s+(\w+)\s+(\w+)(?:\s*\[\s*(\d+)\s*\])?(?:\s*\[\s*(\d+)\s*\])?\s*;/g;
    let match: RegExpExecArray | null;

    while ((match = regex_groupshared.exec(text)) !== null) {
        if (rangeInfo.token.isCancellationRequested)
            return;
        const varType = match[1];
        const varName = match[2];
        const arraySize1 = match[3] || '';
        const arraySize2 = match[4] || '';

        let detail = `groupshared ${varType}`;
        if (arraySize1) detail += `[${arraySize1}]`;
        if (arraySize2) detail += `[${arraySize2}]`;

        const nameOffset = match[0].indexOf(varName);
        const varSymbol = createSymbol(
            document, varName, detail, vscode.SymbolKind.Variable,
            bracketInfo.start + match.index, match[0].length, nameOffset, varName.length
        );
        parentSymbol.children.push(varSymbol);
    }
};

/**
 * 解析 RWTexture 声明（Compute Shader 输出）
 */
const SemanticTokens_RWTextures = (
    rangeInfo: SemanticTokenRangeInfo,
    parentSymbol: vscode.DocumentSymbol,
    bracketInfo: BracketInfo
) => {
    if (rangeInfo.token.isCancellationRequested)
        return;
    const { document } = rangeInfo;
    const text = bracketInfo.text;
    const regex_rwTexture = /\b(RWTexture1D|RWTexture2D|RWTexture3D|RWTexture1DArray|RWTexture2DArray)\s*<\s*(\w+)\s*>\s+(\w+)\s*(?::\s*register\s*\([^)]+\))?\s*;/g;
    let match: RegExpExecArray | null;

    while ((match = regex_rwTexture.exec(text)) !== null) {
        if (rangeInfo.token.isCancellationRequested)
            return;
        const texType = match[1];
        const elementType = match[2];
        const texName = match[3];
        const nameOffset = match[0].indexOf(texName);

        const texSymbol = createSymbol(
            document, texName, `${texType}<${elementType}>`, vscode.SymbolKind.Variable,
            bracketInfo.start + match.index, match[0].length, nameOffset, texName.length
        );
        parentSymbol.children.push(texSymbol);
    }
};

/**
 * 解析 HLSL 文档符号
 */
const SemanticTokens_HLSL = (
    rangeInfo: SemanticTokenRangeInfo,
    parentSymbol: vscode.DocumentSymbol,
    bracketInfo: BracketInfo
) => {
    if (rangeInfo.token.isCancellationRequested)
        return;
    SemanticTokens_Script(rangeInfo, parentSymbol, bracketInfo);
    SemanticTokens_CBuffers(rangeInfo, parentSymbol, bracketInfo);

    // Compute kernels 需要访问已有 symbols 来更新 detail
    SemanticTokens_ComputeKernels(rangeInfo, parentSymbol, bracketInfo);

    SemanticTokens_Defines(rangeInfo, parentSymbol, bracketInfo);
    SemanticTokens_GlobalVariables(rangeInfo, parentSymbol, bracketInfo);
    SemanticTokens_Textures(rangeInfo, parentSymbol, bracketInfo);
    SemanticTokens_Buffers(rangeInfo, parentSymbol, bracketInfo);
    SemanticTokens_GroupShared(rangeInfo, parentSymbol, bracketInfo);
    SemanticTokens_RWTextures(rangeInfo, parentSymbol, bracketInfo);
};

const SemanticTokens_Root = (document: vscode.TextDocument, token: vscode.CancellationToken): vscode.DocumentSymbol[] => {
    if (token.isCancellationRequested)
        return [];
    const rootBracket = documentStructureUtils.getRootBracket(document, token);
    const range = createRangeFromOffsets(document, 0, document.getText().length);
    const rootSymbol = new vscode.DocumentSymbol('HLSL', '', vscode.SymbolKind.File, range, range);
    const rangeInfo: SemanticTokenRangeInfo = { document, token, rootSymbol };
    SemanticTokens_HLSL(rangeInfo, rootSymbol, rootBracket);
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
