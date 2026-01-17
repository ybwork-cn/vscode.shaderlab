import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { symbolCache } from './shared.SymbolCache.js';
import { resolveIncludePath } from './hlsl.DocumentLinkProvider.js';

/**
 * 解析文档中的所有 #include 路径
 */
const parseIncludes = (document: vscode.TextDocument): string[] => {
    const text = document.getText();
    const includes: string[] = [];
    const regex = /#include\s+["<]([^">]+)[">]/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
        includes.push(match[1]);
    }

    return includes;
}

/**
 * 递归在文件链中查找定义
 * @param document 当前文档
 * @param word 要查找的符号名称
 * @param visited 已访问的文件集合（防止循环引用）
 */
const findDefinitionInFileChain = async (
    document: vscode.TextDocument,
    word: string,
    visited: Set<string> = new Set()
): Promise<vscode.DefinitionLink | null> => {
    const filePath = document.uri.fsPath;

    // 防止循环引用
    if (visited.has(filePath)) {
        return null;
    }
    visited.add(filePath);

    // 1. 在当前文件中查找
    const cached = await symbolCache.getCachedSymbols(document);
    const found = cached.findSymbol(word);
    if (found) {
        return {
            targetUri: document.uri,
            targetRange: found.range,
            targetSelectionRange: found.selectionRange,
        };
    }

    // 2. 解析所有 #include，递归查找
    const includes = parseIncludes(document);
    for (const includePath of includes) {
        const resolvedUri = resolveIncludePath(document, includePath);
        if (resolvedUri) {
            try {
                const includeDoc = await vscode.workspace.openTextDocument(resolvedUri);
                const result = await findDefinitionInFileChain(includeDoc, word, visited);
                if (result) {
                    return result;
                }
            } catch (e) {
                console.error(`Failed to open include file: ${includePath}`, e);
            }
        }
    }

    return null;
}

/**
 * 在 Unity CGIncludes 路径中查找定义
 */
const findDefinitionInUnityIncludes = async (word: string): Promise<vscode.DefinitionLink | null> => {
    // 优先使用新配置，兼容旧配置
    const config = vscode.workspace.getConfiguration('ybwork-shaderlab');
    const cgIncludesPath = config.get<string>('cgIncludesPath') 
        || vscode.workspace.getConfiguration().get<string>('Unity CGIncludes Path');
    
    if (!cgIncludesPath || !fs.existsSync(cgIncludesPath)) {
        return null;
    }

    // 常用的 Unity HLSL 文件
    const commonFiles = [
        'UnityCG.cginc',
        'UnityShaderVariables.cginc',
        'UnityShaderUtilities.cginc',
        'UnityStandardUtils.cginc',
        'Lighting.cginc',
        'AutoLight.cginc',
        'UnityPBSLighting.cginc',
        'UnityStandardCore.cginc',
        'UnityStandardBRDF.cginc',
        'UnityGlobalIllumination.cginc',
    ];

    for (const file of commonFiles) {
        const filePath = path.join(cgIncludesPath, file);
        if (fs.existsSync(filePath)) {
            try {
                const cached = await symbolCache.getCachedSymbolsByUri(vscode.Uri.file(filePath));
                const found = cached.findSymbol(word);
                if (found) {
                    return {
                        targetUri: cached.uri,
                        targetRange: found.range,
                        targetSelectionRange: found.selectionRange,
                    };
                }
            } catch (e) {
                console.error(`Failed to search in Unity include: ${file}`, e);
            }
        }
    }

    return null;
}

/**
 * 在工作区中查找定义
 */
const findDefinitionInWorkspace = async (word: string): Promise<vscode.DefinitionLink | null> => {
    const location = await symbolCache.findSymbolInWorkspace(word);
    if (location) {
        return {
            targetUri: location.uri,
            targetRange: location.symbol.range,
            targetSelectionRange: location.symbol.selectionRange,
        };
    }
    return null;
}

/**
 * 检查位置是否在 #include 指令上
 */
const isOnIncludePath = (document: vscode.TextDocument, position: vscode.Position): boolean => {
    const line = document.lineAt(position.line).text;
    // 检查该行是否是 #include 指令
    const includeMatch = line.match(/^\s*#include\s+["<]([^"'>]+)["'>]/);
    if (!includeMatch) {
        return false;
    }
    // 检查光标是否在引号内的路径部分
    const pathStart = line.indexOf(includeMatch[1]);
    const pathEnd = pathStart + includeMatch[1].length;
    return position.character >= pathStart && position.character <= pathEnd;
}

/**
 * 提供定义跳转
 */
const provideDefinition = async (
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
): Promise<vscode.DefinitionLink[] | null> => {
    // 如果光标在 #include 路径上，不处理（由 DocumentLinkProvider 处理跳转）
    if (isOnIncludePath(document, position)) {
        return null;
    }

    // 获取光标下的单词
    const wordRange = document.getWordRangeAtPosition(position);
    if (!wordRange) {
        return null;
    }
    const word = document.getText(wordRange);
    if (!word) {
        return null;
    }

    // 排除一些不应该查找定义的情况
    // 1. 纯数字
    if (/^\d+$/.test(word)) {
        return null;
    }
    // 2. 文件扩展名（如 hlsl, cginc 等）
    if (/^(hlsl|hlsli|cginc|compute|shader)$/i.test(word)) {
        return null;
    }

    // 1. 在当前文件及其 #include 链中查找
    const chainResult = await findDefinitionInFileChain(document, word);
    if (chainResult) {
        return [chainResult];
    }

    // 2. 在工作区中查找
    const workspaceResult = await findDefinitionInWorkspace(word);
    if (workspaceResult) {
        return [workspaceResult];
    }

    // 3. 在 Unity CGIncludes 中查找
    const unityResult = await findDefinitionInUnityIncludes(word);
    if (unityResult) {
        return [unityResult];
    }

    return null;
}

// 注册 HLSL Definition Provider
const hlslDefinitionProvider = vscode.languages.registerDefinitionProvider('hlsl',
    { provideDefinition }
);

export { hlslDefinitionProvider, findDefinitionInFileChain, parseIncludes };
