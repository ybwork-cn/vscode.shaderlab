import * as vscode from 'vscode';
import { symbolCache } from './shared.SymbolCache.js';
import { parseIncludes } from './hlsl.DefinitionProvider.js';
import { resolveIncludePath } from './hlsl.DocumentLinkProvider.js';
import {
    HLSL_ALL_TYPES,
    HLSL_SCALAR_TYPES,
    HLSL_VECTOR_TYPES,
    HLSL_MATRIX_TYPES,
    HLSL_SAMPLER_TYPES,
    HLSL_TEXTURE_TYPES,
    HLSL_RW_TEXTURE_TYPES,
    HLSL_BUFFER_TYPES,
    HLSL_ALL_KEYWORDS,
    HLSL_ALL_FUNCTIONS,
    HLSL_ALL_SEMANTICS,
    HLSL_COMPUTE_FUNCTIONS,
    HLSL_COMPUTE_SEMANTICS,
    createFunctionCompletionItem,
    createTypeCompletionItem,
    createKeywordCompletionItem,
    createSemanticCompletionItem,
    HlslFunctionDef,
} from './hlsl.Builtins.js';

/**
 * 缓存的自动完成项
 */
let cachedTypeItems: vscode.CompletionItem[] | null = null;
let cachedKeywordItems: vscode.CompletionItem[] | null = null;
let cachedFunctionItems: vscode.CompletionItem[] | null = null;
let cachedSemanticItems: vscode.CompletionItem[] | null = null;

/**
 * 获取所有类型的自动完成项
 */
const getTypeCompletionItems = (): vscode.CompletionItem[] => {
    if (cachedTypeItems) {
        return cachedTypeItems;
    }

    cachedTypeItems = [];

    // 标量类型
    for (const type of HLSL_SCALAR_TYPES) {
        const item = createTypeCompletionItem(type);
        item.sortText = '0_' + type; // 优先显示
        cachedTypeItems.push(item);
    }

    // 向量类型
    for (const type of HLSL_VECTOR_TYPES) {
        const item = createTypeCompletionItem(type);
        item.sortText = '1_' + type;
        cachedTypeItems.push(item);
    }

    // 矩阵类型
    for (const type of HLSL_MATRIX_TYPES) {
        const item = createTypeCompletionItem(type);
        item.sortText = '2_' + type;
        cachedTypeItems.push(item);
    }

    // 采样器类型
    for (const type of HLSL_SAMPLER_TYPES) {
        const item = createTypeCompletionItem(type);
        item.sortText = '3_' + type;
        cachedTypeItems.push(item);
    }

    // 纹理类型
    for (const type of HLSL_TEXTURE_TYPES) {
        const item = createTypeCompletionItem(type);
        item.sortText = '4_' + type;
        cachedTypeItems.push(item);
    }

    // RW 纹理类型
    for (const type of HLSL_RW_TEXTURE_TYPES) {
        const item = createTypeCompletionItem(type);
        item.detail = 'HLSL RW Texture (Compute Shader)';
        item.sortText = '5_' + type;
        cachedTypeItems.push(item);
    }

    // Buffer 类型
    for (const type of HLSL_BUFFER_TYPES) {
        const item = createTypeCompletionItem(type);
        item.sortText = '6_' + type;
        cachedTypeItems.push(item);
    }

    return cachedTypeItems;
}

/**
 * 获取所有关键字的自动完成项
 */
const getKeywordCompletionItems = (): vscode.CompletionItem[] => {
    if (cachedKeywordItems) {
        return cachedKeywordItems;
    }

    cachedKeywordItems = HLSL_ALL_KEYWORDS.map(keyword => {
        const item = createKeywordCompletionItem(keyword);
        item.sortText = '7_' + keyword;
        return item;
    });

    // 添加 compute shader 特有的关键字
    const computeKeywords = ['numthreads', 'groupshared'];
    for (const keyword of computeKeywords) {
        const item = new vscode.CompletionItem(keyword, vscode.CompletionItemKind.Keyword);
        item.detail = 'Compute Shader Keyword';
        item.sortText = '7_' + keyword;
        cachedKeywordItems.push(item);
    }

    return cachedKeywordItems;
}

/**
 * 获取所有函数的自动完成项
 */
const getFunctionCompletionItems = (): vscode.CompletionItem[] => {
    if (cachedFunctionItems) {
        return cachedFunctionItems;
    }

    cachedFunctionItems = HLSL_ALL_FUNCTIONS.map(func => {
        const item = createFunctionCompletionItem(func);
        // 根据类别设置排序
        const categoryOrder = {
            'math': '8_0_',
            'texture': '8_1_',
            'intrinsic': '8_2_',
            'compute': '8_3_',
            'barrier': '8_4_',
            'atomic': '8_5_',
            'unity': '8_6_',
        };
        item.sortText = (categoryOrder[func.category] || '8_9_') + func.name;
        return item;
    });

    return cachedFunctionItems;
}

/**
 * 获取所有语义的自动完成项
 */
const getSemanticCompletionItems = (): vscode.CompletionItem[] => {
    if (cachedSemanticItems) {
        return cachedSemanticItems;
    }

    cachedSemanticItems = HLSL_ALL_SEMANTICS.map(semantic => {
        const item = createSemanticCompletionItem(semantic);
        item.sortText = '9_' + semantic.name;
        return item;
    });

    return cachedSemanticItems;
}

/**
 * 查找变量的类型名
 */
const findVariableType = (
    document: vscode.TextDocument,
    variableName: string,
    position: vscode.Position
): string | null => {
    const textBefore = document.getText(new vscode.Range(new vscode.Position(0, 0), position));
    
    // 匹配变量声明：Type variableName
    const patterns = [
        // 普通变量声明
        new RegExp(`(\\w+)\\s+${variableName}\\s*[=;,\\)]`, 'g'),
        // 函数参数
        new RegExp(`(?:in|out|inout|uniform)?\\s*(\\w+)\\s+${variableName}\\s*[,\\):]`, 'g'),
        // for 循环变量
        new RegExp(`for\\s*\\(\\s*(\\w+)\\s+${variableName}\\s*[=;]`, 'g'),
    ];

    let lastMatch: string | null = null;
    for (const pattern of patterns) {
        let match: RegExpExecArray | null;
        while ((match = pattern.exec(textBefore)) !== null) {
            lastMatch = match[1];
        }
    }

    return lastMatch;
}

/**
 * 递归在文件链中查找结构体
 */
const findStructInFileChain = async (
    document: vscode.TextDocument,
    structName: string,
    visited: Set<string> = new Set()
): Promise<vscode.DocumentSymbol | null> => {
    const filePath = document.uri.fsPath;
    if (visited.has(filePath)) {
        return null;
    }
    visited.add(filePath);

    // 在当前文件中查找
    const cached = await symbolCache.getCachedSymbols(document);
    const found = cached.flattenedSymbols.find(sym => sym.kind === vscode.SymbolKind.Struct && sym.name === structName);
    if (found) {
        return found;
    }

    // 在 #include 文件中查找
    const includes = parseIncludes(document);
    for (const includePath of includes) {
        const resolvedUri = resolveIncludePath(document, includePath);
        if (resolvedUri) {
            try {
                const includeDoc = await vscode.workspace.openTextDocument(resolvedUri);
                const result = await findStructInFileChain(includeDoc, structName, visited);
                if (result) {
                    return result;
                }
            } catch (e) {
                // 忽略无法打开的文件
            }
        }
    }

    return null;
}

/**
 * 提供结构体字段的自动完成
 */
const provideStructFieldCompletion = async (
    document: vscode.TextDocument,
    position: vscode.Position,
    variableName: string
): Promise<vscode.CompletionItem[]> => {
    // 查找变量的类型
    const typeName = findVariableType(document, variableName, position);
    if (!typeName) {
        return [];
    }

    // 查找结构体定义
    const structSymbol = await findStructInFileChain(document, typeName);
    if (!structSymbol) {
        return [];
    }

    // 返回结构体字段作为自动完成项
    return structSymbol.children.map(field => {
        const item = new vscode.CompletionItem(
            { label: field.name, description: field.detail },
            vscode.CompletionItemKind.Field
        );
        item.detail = field.detail;
        item.sortText = '0_' + field.name; // 字段优先显示
        return item;
    });
}

/**
 * 提供 Swizzle 自动完成 (如 .xyz, .rgb)
 */
const provideSwizzleCompletion = (typeName: string): vscode.CompletionItem[] => {
    const items: vscode.CompletionItem[] = [];

    // 检查是否为向量类型
    const vectorMatch = typeName.match(/^(float|half|int|uint|bool|double|min16float|min16int|min16uint)([2-4])$/);
    if (!vectorMatch) {
        return items;
    }

    const componentCount = parseInt(vectorMatch[2]);
    const xyzwComponents = ['x', 'y', 'z', 'w'].slice(0, componentCount);
    const rgbaComponents = ['r', 'g', 'b', 'a'].slice(0, componentCount);

    // 单分量
    for (const c of xyzwComponents) {
        items.push(new vscode.CompletionItem(c, vscode.CompletionItemKind.Property));
    }
    for (const c of rgbaComponents) {
        items.push(new vscode.CompletionItem(c, vscode.CompletionItemKind.Property));
    }

    // 常用的多分量 swizzle
    if (componentCount >= 2) {
        items.push(new vscode.CompletionItem('xy', vscode.CompletionItemKind.Property));
        items.push(new vscode.CompletionItem('rg', vscode.CompletionItemKind.Property));
    }
    if (componentCount >= 3) {
        items.push(new vscode.CompletionItem('xyz', vscode.CompletionItemKind.Property));
        items.push(new vscode.CompletionItem('rgb', vscode.CompletionItemKind.Property));
    }
    if (componentCount >= 4) {
        items.push(new vscode.CompletionItem('xyzw', vscode.CompletionItemKind.Property));
        items.push(new vscode.CompletionItem('rgba', vscode.CompletionItemKind.Property));
    }

    return items;
}

/**
 * 检查是否在语义位置（: 后面）
 */
const isInSemanticPosition = (document: vscode.TextDocument, position: vscode.Position): boolean => {
    const line = document.lineAt(position.line).text;
    const textBefore = line.substring(0, position.character);
    
    // 检查是否在 : 后面，但不在 :: 后面（命名空间）
    const colonMatch = textBefore.match(/:\s*(\w*)$/);
    if (colonMatch && !textBefore.endsWith('::')) {
        return true;
    }
    
    return false;
}

/**
 * 检查是否是 Compute Shader 文件
 */
const isComputeShader = (document: vscode.TextDocument): boolean => {
    const ext = document.uri.fsPath.toLowerCase();
    if (ext.endsWith('.compute')) {
        return true;
    }
    
    // 检查文件内容是否包含 compute shader 特征
    const text = document.getText();
    return /\[numthreads\s*\(/.test(text) || /RWTexture|RWStructuredBuffer/.test(text);
}

/**
 * HLSL 自动完成提供器
 */
class HlslCompletionItemProvider implements vscode.CompletionItemProvider {
    async provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): Promise<vscode.CompletionItem[] | vscode.CompletionList | null> {
        const line = document.lineAt(position);
        const linePrefix = line.text.substring(0, position.character);

        // 1. 检查是否是 . 触发的成员访问
        if (context.triggerCharacter === '.' || linePrefix.match(/\.\s*\w*$/)) {
            const dotMatch = linePrefix.match(/(\w+)\.\s*\w*$/);
            if (dotMatch) {
                const variableName = dotMatch[1];
                
                // 尝试获取结构体字段
                const fieldItems = await provideStructFieldCompletion(document, position, variableName);
                if (fieldItems.length > 0) {
                    return fieldItems;
                }

                // 尝试获取 swizzle
                const typeName = findVariableType(document, variableName, position);
                if (typeName) {
                    const swizzleItems = provideSwizzleCompletion(typeName);
                    if (swizzleItems.length > 0) {
                        return swizzleItems;
                    }
                }
            }
            return null;
        }

        // 2. 检查是否在语义位置
        if (isInSemanticPosition(document, position)) {
            const semanticItems = getSemanticCompletionItems();
            
            // 如果是 compute shader，优先显示 compute 语义
            if (isComputeShader(document)) {
                const computeSemantics = HLSL_COMPUTE_SEMANTICS.map(s => {
                    const item = createSemanticCompletionItem(s);
                    item.sortText = '0_' + s.name;
                    return item;
                });
                return [...computeSemantics, ...semanticItems];
            }
            
            return semanticItems;
        }

        // 3. 检查是否在 #include 后
        if (linePrefix.match(/#include\s+["<]/)) {
            return null; // 让其他提供器处理
        }

        // 4. 检查是否在注释中
        if (linePrefix.match(/\/\//) || linePrefix.match(/\/\*/)) {
            return null;
        }

        // 5. 提供通用的自动完成
        const items: vscode.CompletionItem[] = [];

        // 添加类型
        items.push(...getTypeCompletionItems());

        // 添加关键字
        items.push(...getKeywordCompletionItems());

        // 添加函数
        items.push(...getFunctionCompletionItems());

        // 如果是 compute shader，添加 numthreads 代码片段
        if (isComputeShader(document)) {
            const numthreadsSnippet = new vscode.CompletionItem('numthreads', vscode.CompletionItemKind.Snippet);
            numthreadsSnippet.insertText = new vscode.SnippetString('[numthreads(${1:8}, ${2:8}, ${3:1})]');
            numthreadsSnippet.detail = 'Compute Shader Thread Group Size';
            numthreadsSnippet.documentation = new vscode.MarkdownString('定义计算着色器的线程组大小');
            numthreadsSnippet.sortText = '0_numthreads';
            items.push(numthreadsSnippet);

            // 添加 kernel 函数代码片段
            const kernelSnippet = new vscode.CompletionItem('kernel', vscode.CompletionItemKind.Snippet);
            kernelSnippet.insertText = new vscode.SnippetString(
                '[numthreads(${1:8}, ${2:8}, ${3:1})]\n' +
                'void ${4:CSMain}(uint3 id : SV_DispatchThreadID)\n' +
                '{\n\t$0\n}'
            );
            kernelSnippet.detail = 'Compute Shader Kernel Function';
            kernelSnippet.documentation = new vscode.MarkdownString('创建一个计算着色器入口函数');
            kernelSnippet.sortText = '0_kernel';
            items.push(kernelSnippet);
        }

        // 添加当前文档中的符号
        const cached = await symbolCache.getCachedSymbols(document);
        for (const symbol of cached.flattenedSymbols) {
            let kind = vscode.CompletionItemKind.Variable;
            if (symbol.kind === vscode.SymbolKind.Function || symbol.kind === vscode.SymbolKind.Method) {
                kind = vscode.CompletionItemKind.Function;
            } else if (symbol.kind === vscode.SymbolKind.Struct) {
                kind = vscode.CompletionItemKind.Struct;
            } else if (symbol.kind === vscode.SymbolKind.Constant) {
                kind = vscode.CompletionItemKind.Constant;
            }

            const item = new vscode.CompletionItem(symbol.name, kind);
            item.detail = symbol.detail;
            item.sortText = 'a_' + symbol.name; // 用户定义的符号稍后显示
            items.push(item);
        }

        return items;
    }

    resolveCompletionItem(
        item: vscode.CompletionItem,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.CompletionItem> {
        return item;
    }
}

// 注册 HLSL 自动完成提供器
const hlslCompletionItemProvider = vscode.languages.registerCompletionItemProvider(
    'hlsl',
    new HlslCompletionItemProvider(),
    '.', ':' // 触发字符
);

export { hlslCompletionItemProvider };
