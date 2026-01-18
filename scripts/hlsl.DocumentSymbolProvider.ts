
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
}

/**
 * 找到匹配的右大括号位置
 * @param text 文本内容
 * @param startPos 起始位置（左大括号的位置）
 * @returns 匹配的右大括号位置，如果未找到返回 -1
 */
function findMatchingBrace(text: string, startPos: number): number {
    let depth = 1;
    let inString = false;
    let inChar = false;
    let inLineComment = false;
    let inBlockComment = false;

    for (let i = startPos + 1; i < text.length; i++) {
        const char = text[i];
        const prevChar = i > 0 ? text[i - 1] : '';

        // 处理行注释
        if (!inString && !inChar && !inBlockComment && char === '/' && text[i + 1] === '/') {
            inLineComment = true;
            continue;
        }
        if (inLineComment && char === '\n') {
            inLineComment = false;
            continue;
        }

        // 处理块注释
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

        // 跳过注释内的字符
        if (inLineComment || inBlockComment) continue;

        // 处理字符串
        if (char === '"' && prevChar !== '\\') {
            inString = !inString;
            continue;
        }
        if (char === "'" && prevChar !== '\\') {
            inChar = !inChar;
            continue;
        }

        // 跳过字符串内的字符
        if (inString || inChar) continue;

        // 统计大括号深度
        if (char === '{') {
            depth++;
        } else if (char === '}') {
            depth--;
            if (depth === 0) {
                return i;
            }
        }
    }

    return -1; // 未找到匹配的大括号
}

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
}

/**
 * 解析 HLSL 文档符号
 */
const parseHLSLSymbols = (document: vscode.TextDocument): vscode.DocumentSymbol[] => {
    const text = document.getText();
    let match: RegExpExecArray | null;
    const symbols: vscode.DocumentSymbol[] = [];

    // 1. 解析 struct 定义
    const regex_struct = /\bstruct\s+(\w+)\s*\{([^}]*)\}/gs;
    while ((match = regex_struct.exec(text)) !== null) {
        const structName = match[1];
        const structBody = match[2];
        const nameOffset = match[0].indexOf(structName);

        const structSymbol = createSymbol(
            document, structName, 'struct', vscode.SymbolKind.Struct,
            match.index, match[0].length, nameOffset, structName.length
        );

        // 解析结构体字段
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

    // 2. 解析 cbuffer / ConstantBuffer 定义
    const regex_cbuffer = /\b(cbuffer|tbuffer)\s+(\w+)(?:\s*:\s*register\s*\([^)]+\))?\s*\{([^}]*)\}/gs;
    while ((match = regex_cbuffer.exec(text)) !== null) {
        const bufferType = match[1];
        const bufferName = match[2];
        const bufferBody = match[3];
        const nameOffset = match[0].indexOf(bufferName);

        const cbufferSymbol = createSymbol(
            document, bufferName, bufferType, vscode.SymbolKind.Struct,
            match.index, match[0].length, nameOffset, bufferName.length
        );

        // 解析 cbuffer 内的变量
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

    // 3. 解析函数定义（改进版：支持更多参数修饰符，并解析函数体内的局部变量）
    const regex_function = /\b(\w+)\s+(\w+)\s*\(\s*([^)]*)\s*\)(?:\s*:\s*(\w+))?\s*\{/g;
    while ((match = regex_function.exec(text)) !== null) {
        const returnType = match[1];
        const funcName = match[2];
        const params = match[3];
        const semantic = match[4] || '';

        // 排除控制流语句
        if (['if', 'for', 'while', 'switch', 'return'].includes(returnType)) continue;
        // 排除非类型
        if (!isHLSLType(returnType) && !/^[A-Z]/.test(returnType) && returnType !== 'void') continue;

        let detail = returnType;
        if (semantic) detail += ` : ${semantic}`;

        // 找到函数体的范围（匹配大括号）
        const funcBodyStart = match.index + match[0].length - 1; // '{' 的位置
        const funcBodyEnd = findMatchingBrace(text, funcBodyStart);
        const funcBody = funcBodyEnd > funcBodyStart ? text.substring(funcBodyStart + 1, funcBodyEnd) : '';

        const nameOffset = match[0].indexOf(funcName);
        const funcSymbol = createSymbol(
            document, funcName, detail, vscode.SymbolKind.Function,
            match.index, funcBodyEnd > funcBodyStart ? funcBodyEnd - match.index + 1 : match[0].length,
            nameOffset, funcName.length
        );

        // 解析函数参数
        if (params.trim()) {
            const paramParts = params.split(',');
            let paramOffset = match[0].indexOf('(') + 1;

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

                    // 简化参数的位置计算
                    const paramSymbol = new vscode.DocumentSymbol(
                        paramName, paramDetail, vscode.SymbolKind.Variable,
                        funcSymbol.range, funcSymbol.selectionRange
                    );
                    funcSymbol.children.push(paramSymbol);
                }
                paramOffset += paramPart.length + 1;
            }
        }

        // 解析函数体内的局部变量声明
        if (funcBody) {
            const localVarRegex = /\b(\w+)\s+(\w+)(?:\s*=\s*[^;]+)?\s*;/g;
            let localVarMatch: RegExpExecArray | null;

            while ((localVarMatch = localVarRegex.exec(funcBody)) !== null) {
                const varType = localVarMatch[1];
                const varName = localVarMatch[2];

                // 排除控制流关键字
                if (['if', 'for', 'while', 'switch', 'return', 'break', 'continue', 'discard'].includes(varType)) continue;
                
                // 只保留已知的 HLSL 类型或自定义类型（首字母大写）
                if (!isHLSLType(varType) && !/^[A-Z]/.test(varType)) continue;

                const varSymbol = createSymbol(
                    document, varName, varType, vscode.SymbolKind.Variable,
                    funcBodyStart + 1 + localVarMatch.index, localVarMatch[0].length,
                    localVarMatch[0].indexOf(varName), varName.length
                );
                funcSymbol.children.push(varSymbol);
            }
        }

        symbols.push(funcSymbol);
    }

    // 3.5 解析 Compute Shader 入口函数（带 [numthreads] 属性）
    COMPUTE_KERNEL_REGEX.lastIndex = 0;
    while ((match = COMPUTE_KERNEL_REGEX.exec(text)) !== null) {
        const threadX = match[1];
        const threadY = match[2];
        const threadZ = match[3];
        const kernelName = match[4];

        // 检查是否已经被普通函数解析器解析过
        const alreadyParsed = symbols.some(s =>
            s.name === kernelName && s.kind === vscode.SymbolKind.Function
        );

        if (!alreadyParsed) {
            const detail = `kernel [${threadX}, ${threadY}, ${threadZ}]`;
            const nameOffset = match[0].indexOf(kernelName);

            const kernelSymbol = createSymbol(
                document, kernelName, detail, vscode.SymbolKind.Function,
                match.index, match[0].length, nameOffset, kernelName.length
            );
            symbols.push(kernelSymbol);
        } else {
            // 更新已解析函数的 detail 以标记为 kernel
            const existingSymbol = symbols.find(s =>
                s.name === kernelName && s.kind === vscode.SymbolKind.Function
            );
            if (existingSymbol) {
                existingSymbol.detail = `kernel [${threadX}, ${threadY}, ${threadZ}]`;
            }
        }
    }

    // 4. 解析 #define 宏定义
    const regex_define = /^\s*#define\s+(\w+)(?:\(([^)]*)\))?\s*(.*)$/gm;
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

    // 5. 解析 #include
    const regex_include = /^\s*#include\s+["<]([^">]+)[">]/gm;
    while ((match = regex_include.exec(text)) !== null) {
        const includePath = match[1];
        const nameOffset = match[0].indexOf(includePath);

        const includeSymbol = createSymbol(
            document, includePath, '#include', vscode.SymbolKind.Module,
            match.index, match[0].length, nameOffset, includePath.length
        );
        symbols.push(includeSymbol);
    }

    // 6. 解析全局变量（在函数和结构体外部的变量声明）
    const regex_global = /^(?!\s*(?:\/\/|\/\*|#|struct|cbuffer|tbuffer|if|for|while|return))(\s*)(?:(uniform|static|extern|const|volatile)\s+)*(\w+)\s+(\w+)(?:\s*\[\s*(\d+)\s*\])?(?:\s*:\s*register\s*\([^)]+\))?\s*;/gm;
    while ((match = regex_global.exec(text)) !== null) {
        const modifiers = match[2] || '';
        const varType = match[3];
        const varName = match[4];
        const arraySize = match[5] || '';

        // 排除非类型名
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

    // 7. 解析 Texture/Sampler 声明
    const regex_texture = /\b(Texture2D|Texture3D|TextureCube|Texture2DArray|SamplerState|SamplerComparisonState)\s*(?:<\s*\w+\s*>)?\s+(\w+)\s*(?::\s*register\s*\([^)]+\))?\s*;/g;
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

    // 8. 解析 StructuredBuffer 等
    const regex_buffer = /\b(StructuredBuffer|RWStructuredBuffer|Buffer|RWBuffer|ByteAddressBuffer|RWByteAddressBuffer)\s*<\s*(\w+)\s*>\s+(\w+)\s*(?::\s*register\s*\([^)]+\))?\s*;/g;
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

    // 9. 解析 groupshared 变量（Compute Shader 特有）
    const regex_groupshared = /\bgroupshared\s+(\w+)\s+(\w+)(?:\s*\[\s*(\d+)\s*\])?(?:\s*\[\s*(\d+)\s*\])?\s*;/g;
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

    // 10. 解析 RWTexture 声明（Compute Shader 输出）
    const regex_rwTexture = /\b(RWTexture1D|RWTexture2D|RWTexture3D|RWTexture1DArray|RWTexture2DArray)\s*<\s*(\w+)\s*>\s+(\w+)\s*(?::\s*register\s*\([^)]+\))?\s*;/g;
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
}

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
}

/**
 * 注册功能：文档符号提供
 * @param context 
 */
const registerDocumentSymbolProvider = (context: vscode.ExtensionContext) => {
    const documentSymbolProvider = vscode.languages.registerDocumentSymbolProvider('hlsl', {
        provideDocumentSymbols
    });
    context.subscriptions.push(documentSymbolProvider);
}


export { registerDocumentSymbolProvider };
