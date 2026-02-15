
import * as vscode from 'vscode';

// HLSL 基本类型列表
const HLSL_TYPES = new Set([
    // 标量类型
    'bool', 'int', 'uint', 'half', 'float', 'double', 'min16float', 'min10float', 'min16int', 'min12int', 'min16uint',
    // 向量类型
    'float2', 'float3', 'float4', 'half2', 'half3', 'half4', 'int2', 'int3', 'int4', 'uint2', 'uint3', 'uint4',
    'bool2', 'bool3', 'bool4', 'double2', 'double3', 'double4',
    // 矩阵类型
    'float2x2', 'float3x3', 'float4x4', 'float3x4', 'float4x3', 'half2x2', 'half3x3', 'half4x4',
    'matrix', 'row_major', 'column_major',
    // 纹理类型
    'sampler', 'sampler1D', 'sampler2D', 'sampler3D', 'samplerCUBE', 'sampler_state', 'SamplerState', 'SamplerComparisonState',
    'Texture1D', 'Texture2D', 'Texture3D', 'TextureCube', 'Texture2DArray', 'TextureCubeArray',
    'Texture2DMS', 'Texture2DMSArray', 'RWTexture1D', 'RWTexture2D', 'RWTexture3D',
    'RWTexture1DArray', 'RWTexture2DArray',
    // Buffer 类型
    'Buffer', 'StructuredBuffer', 'RWStructuredBuffer', 'ByteAddressBuffer', 'RWByteAddressBuffer',
    'AppendStructuredBuffer', 'ConsumeStructuredBuffer', 'RWBuffer',
    // 其他
    'void', 'string'
]);

/**
 * Compute Shader 入口函数的属性模式
 */
const COMPUTE_KERNEL_REGEX = /\[\s*numthreads\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)\s*\]\s*\n?\s*void\s+(\w+)\s*\(/g;

/**
 * 判断是否为 HLSL 类型
 */
const isHLSLType = (typeName: string): boolean => {
    return HLSL_TYPES.has(typeName);
};

/**
 * 创建 DocumentSymbol
 */
const createSymbol = (
    document: vscode.TextDocument,
    name: string,
    detail: string,
    kind: vscode.SymbolKind,
    matchIndex: number,
    matchLength: number,
    nameOffset: number = 0,
    nameLength: number = 0
): vscode.DocumentSymbol => {
    const range = new vscode.Range(
        document.positionAt(matchIndex),
        document.positionAt(matchIndex + matchLength)
    );
    const selectionRange = new vscode.Range(
        document.positionAt(matchIndex + nameOffset),
        document.positionAt(matchIndex + nameOffset + (nameLength || name.length))
    );
    return new vscode.DocumentSymbol(name, detail, kind, range, selectionRange);
};

/**
 * 解析 struct 定义
 */
const parseStructs = (document: vscode.TextDocument, text: string): vscode.DocumentSymbol[] => {
    const symbols: vscode.DocumentSymbol[] = [];
    const regex_struct = /\bstruct\s+(\w+)\s*\{([^}]*)\}/gs;
    let match: RegExpExecArray | null;

    while ((match = regex_struct.exec(text)) !== null) {
        const structName = match[1];
        const structBody = match[2];
        const nameOffset = match[0].indexOf(structName);

        const structSymbol = createSymbol(
            document, structName, 'struct', vscode.SymbolKind.Struct,
            match.index, match[0].length, nameOffset, structName.length
        );

        const fieldRegex = /(\w+)\s+(\w+)(?:\s*:\s*(\w+))?(?:\s*\[\s*(\d+)\s*\])?\s*;/g;
        let fieldMatch: RegExpExecArray | null;
        const bodyOffset = match.index + match[0].indexOf('{') + 1;

        while ((fieldMatch = fieldRegex.exec(structBody)) !== null) {
            const fieldType = fieldMatch[1];
            const fieldName = fieldMatch[2];
            const semantic = fieldMatch[3] || '';
            const arraySize = fieldMatch[4] || '';

            let detail = fieldType;
            if (arraySize) detail += `[${arraySize}]`;
            if (semantic) detail += ` : ${semantic}`;

            const fieldSymbol = createSymbol(
                document, fieldName, detail, vscode.SymbolKind.Field,
                bodyOffset + fieldMatch.index, fieldMatch[0].length,
                fieldMatch[0].indexOf(fieldName), fieldName.length
            );
            structSymbol.children.push(fieldSymbol);
        }

        symbols.push(structSymbol);
    }
    return symbols;
};

/**
 * 解析 cbuffer / tbuffer 定义
 */
const parseCBuffers = (document: vscode.TextDocument, text: string): vscode.DocumentSymbol[] => {
    const symbols: vscode.DocumentSymbol[] = [];
    const regex_cbuffer = /\b(cbuffer|tbuffer)\s+(\w+)(?:\s*:\s*register\s*\([^)]+\))?\s*\{([^}]*)\}/gs;
    let match: RegExpExecArray | null;

    while ((match = regex_cbuffer.exec(text)) !== null) {
        const bufferType = match[1];
        const bufferName = match[2];
        const bufferBody = match[3];
        const nameOffset = match[0].indexOf(bufferName);

        const cbufferSymbol = createSymbol(
            document, bufferName, bufferType, vscode.SymbolKind.Struct,
            match.index, match[0].length, nameOffset, bufferName.length
        );

        const varRegex = /(\w+)\s+(\w+)(?:\s*\[\s*(\d+)\s*\])?\s*;/g;
        let varMatch: RegExpExecArray | null;
        const bodyOffset = match.index + match[0].indexOf('{') + 1;

        while ((varMatch = varRegex.exec(bufferBody)) !== null) {
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

        symbols.push(cbufferSymbol);
    }
    return symbols;
};

/**
 * 解析函数参数
 */
const parseFunctionParams = (params: string, funcSymbol: vscode.DocumentSymbol): void => {
    if (!params.trim()) return;

    const paramParts = params.split(',');
    for (const paramPart of paramParts) {
        const paramMatch = /(?:(in|out|inout|uniform)\s+)?(\w+)\s+(\w+)(?:\s*:\s*(\w+))?/.exec(paramPart.trim());
        if (paramMatch) {
            const modifier = paramMatch[1] || '';
            const paramType = paramMatch[2];
            const paramName = paramMatch[3];
            const paramSemantic = paramMatch[4] || '';

            let paramDetail = paramType;
            if (modifier) paramDetail = `${modifier} ${paramDetail}`;
            if (paramSemantic) paramDetail += ` : ${paramSemantic}`;

            const paramSymbol = new vscode.DocumentSymbol(
                paramName, paramDetail, vscode.SymbolKind.Variable,
                funcSymbol.range, funcSymbol.selectionRange
            );
            funcSymbol.children.push(paramSymbol);
        }
    }
};

/**
 * 解析函数定义
 */
const parseFunctions = (document: vscode.TextDocument, text: string): vscode.DocumentSymbol[] => {
    const symbols: vscode.DocumentSymbol[] = [];
    const regex_function = /\b(\w+)\s+(\w+)\s*\(\s*([^)]*)\s*\)(?:\s*:\s*(\w+))?\s*\{/g;
    let match: RegExpExecArray | null;

    while ((match = regex_function.exec(text)) !== null) {
        const returnType = match[1];
        const funcName = match[2];
        const params = match[3];
        const semantic = match[4] || '';

        if (['if', 'for', 'while', 'switch', 'return'].includes(returnType)) continue;
        if (!isHLSLType(returnType) && !/^[A-Z]/.test(returnType) && returnType !== 'void') continue;

        let detail = returnType;
        if (semantic) detail += ` : ${semantic}`;

        const nameOffset = match[0].indexOf(funcName);
        const funcSymbol = createSymbol(
            document, funcName, detail, vscode.SymbolKind.Function,
            match.index, match[0].length - 1, nameOffset, funcName.length
        );

        parseFunctionParams(params, funcSymbol);
        symbols.push(funcSymbol);
    }
    return symbols;
};

/**
 * 解析 Compute Shader 入口函数（带 [numthreads] 属性）
 */
const parseComputeKernels = (document: vscode.TextDocument, text: string, symbols: vscode.DocumentSymbol[]): void => {
    COMPUTE_KERNEL_REGEX.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = COMPUTE_KERNEL_REGEX.exec(text)) !== null) {
        const threadX = match[1];
        const threadY = match[2];
        const threadZ = match[3];
        const kernelName = match[4];
        const detail = `kernel [${threadX}, ${threadY}, ${threadZ}]`;

        const alreadyParsed = symbols.some(s =>
            s.name === kernelName && s.kind === vscode.SymbolKind.Function
        );

        if (!alreadyParsed) {
            const nameOffset = match[0].indexOf(kernelName);
            const kernelSymbol = createSymbol(
                document, kernelName, detail, vscode.SymbolKind.Function,
                match.index, match[0].length, nameOffset, kernelName.length
            );
            symbols.push(kernelSymbol);
        } else {
            const existingSymbol = symbols.find(s =>
                s.name === kernelName && s.kind === vscode.SymbolKind.Function
            );
            if (existingSymbol) {
                existingSymbol.detail = detail;
            }
        }
    }
};

/**
 * 解析 #define 宏定义
 */
const parseDefines = (document: vscode.TextDocument, text: string): vscode.DocumentSymbol[] => {
    const symbols: vscode.DocumentSymbol[] = [];
    const regex_define = /^\s*#define\s+(\w+)(?:\(([^)]*)\))?\s*(.*)$/gm;
    let match: RegExpExecArray | null;

    while ((match = regex_define.exec(text)) !== null) {
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
            match.index, match[0].length, nameOffset, macroName.length
        );
        symbols.push(macroSymbol);
    }
    return symbols;
};

/**
 * 解析 #include
 */
const parseIncludes = (document: vscode.TextDocument, text: string): vscode.DocumentSymbol[] => {
    const symbols: vscode.DocumentSymbol[] = [];
    const regex_include = /^\s*#include\s+["<]([^">]+)[">]/gm;
    let match: RegExpExecArray | null;

    while ((match = regex_include.exec(text)) !== null) {
        const includePath = match[1];
        const nameOffset = match[0].indexOf(includePath);

        const includeSymbol = createSymbol(
            document, includePath, '#include', vscode.SymbolKind.Module,
            match.index, match[0].length, nameOffset, includePath.length
        );
        symbols.push(includeSymbol);
    }
    return symbols;
};

/**
 * 解析全局变量（在函数和结构体外部的变量声明）
 */
const parseGlobalVariables = (document: vscode.TextDocument, text: string): vscode.DocumentSymbol[] => {
    const symbols: vscode.DocumentSymbol[] = [];
    const regex_global = /^(?!\s*(?:\/\/|\/\*|#|struct|cbuffer|tbuffer|if|for|while|return))(\s*)(?:(uniform|static|extern|const|volatile)\s+)*(\w+)\s+(\w+)(?:\s*\[\s*(\d+)\s*\])?(?:\s*:\s*register\s*\([^)]+\))?\s*;/gm;
    let match: RegExpExecArray | null;

    while ((match = regex_global.exec(text)) !== null) {
        const modifiers = match[2] || '';
        const varType = match[3];
        const varName = match[4];
        const arraySize = match[5] || '';

        if (!isHLSLType(varType) && !/^[A-Z]/.test(varType)) continue;

        let detail = varType;
        if (modifiers) detail = `${modifiers} ${detail}`;
        if (arraySize) detail += `[${arraySize}]`;

        const nameOffset = match[0].indexOf(varName);
        const varSymbol = createSymbol(
            document, varName, detail, vscode.SymbolKind.Variable,
            match.index, match[0].length, nameOffset, varName.length
        );
        symbols.push(varSymbol);
    }
    return symbols;
};

/**
 * 解析 Texture/Sampler 声明
 */
const parseTextures = (document: vscode.TextDocument, text: string): vscode.DocumentSymbol[] => {
    const symbols: vscode.DocumentSymbol[] = [];
    const regex_texture = /\b(Texture2D|Texture3D|TextureCube|Texture2DArray|SamplerState|SamplerComparisonState)\s*(?:<\s*\w+\s*>)?\s+(\w+)\s*(?::\s*register\s*\([^)]+\))?\s*;/g;
    let match: RegExpExecArray | null;

    while ((match = regex_texture.exec(text)) !== null) {
        const texType = match[1];
        const texName = match[2];
        const nameOffset = match[0].indexOf(texName);

        const texSymbol = createSymbol(
            document, texName, texType, vscode.SymbolKind.Variable,
            match.index, match[0].length, nameOffset, texName.length
        );
        symbols.push(texSymbol);
    }
    return symbols;
};

/**
 * 解析 StructuredBuffer 等
 */
const parseBuffers = (document: vscode.TextDocument, text: string): vscode.DocumentSymbol[] => {
    const symbols: vscode.DocumentSymbol[] = [];
    const regex_buffer = /\b(StructuredBuffer|RWStructuredBuffer|Buffer|RWBuffer|ByteAddressBuffer|RWByteAddressBuffer)\s*<\s*(\w+)\s*>\s+(\w+)\s*(?::\s*register\s*\([^)]+\))?\s*;/g;
    let match: RegExpExecArray | null;

    while ((match = regex_buffer.exec(text)) !== null) {
        const bufferType = match[1];
        const elementType = match[2];
        const bufferName = match[3];
        const nameOffset = match[0].indexOf(bufferName);

        const bufferSymbol = createSymbol(
            document, bufferName, `${bufferType}<${elementType}>`, vscode.SymbolKind.Variable,
            match.index, match[0].length, nameOffset, bufferName.length
        );
        symbols.push(bufferSymbol);
    }
    return symbols;
};

/**
 * 解析 groupshared 变量（Compute Shader 特有）
 */
const parseGroupShared = (document: vscode.TextDocument, text: string): vscode.DocumentSymbol[] => {
    const symbols: vscode.DocumentSymbol[] = [];
    const regex_groupshared = /\bgroupshared\s+(\w+)\s+(\w+)(?:\s*\[\s*(\d+)\s*\])?(?:\s*\[\s*(\d+)\s*\])?\s*;/g;
    let match: RegExpExecArray | null;

    while ((match = regex_groupshared.exec(text)) !== null) {
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
            match.index, match[0].length, nameOffset, varName.length
        );
        symbols.push(varSymbol);
    }
    return symbols;
};

/**
 * 解析 RWTexture 声明（Compute Shader 输出）
 */
const parseRWTextures = (document: vscode.TextDocument, text: string): vscode.DocumentSymbol[] => {
    const symbols: vscode.DocumentSymbol[] = [];
    const regex_rwTexture = /\b(RWTexture1D|RWTexture2D|RWTexture3D|RWTexture1DArray|RWTexture2DArray)\s*<\s*(\w+)\s*>\s+(\w+)\s*(?::\s*register\s*\([^)]+\))?\s*;/g;
    let match: RegExpExecArray | null;

    while ((match = regex_rwTexture.exec(text)) !== null) {
        const texType = match[1];
        const elementType = match[2];
        const texName = match[3];
        const nameOffset = match[0].indexOf(texName);

        const texSymbol = createSymbol(
            document, texName, `${texType}<${elementType}>`, vscode.SymbolKind.Variable,
            match.index, match[0].length, nameOffset, texName.length
        );
        symbols.push(texSymbol);
    }
    return symbols;
};

/**
 * 解析 HLSL 文档符号
 */
const parseHLSLSymbols = (document: vscode.TextDocument): vscode.DocumentSymbol[] => {
    const text = document.getText();
    const symbols: vscode.DocumentSymbol[] = [
        ...parseStructs(document, text),
        ...parseCBuffers(document, text),
        ...parseFunctions(document, text),
    ];

    // Compute kernels 需要访问已有 symbols 来更新 detail
    parseComputeKernels(document, text, symbols);

    symbols.push(
        ...parseDefines(document, text),
        ...parseIncludes(document, text),
        ...parseGlobalVariables(document, text),
        ...parseTextures(document, text),
        ...parseBuffers(document, text),
        ...parseGroupShared(document, text),
        ...parseRWTextures(document, text),
    );

    return symbols;
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
    return parseHLSLSymbols(document);
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
