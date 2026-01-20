import * as vscode from 'vscode';
import { symbolCache } from './shared.SymbolCache.js';

/**
 * 递归在文件链中查找定义
 * @param document 当前文档
 * @param word 要查找的符号名称
 * @param visited 已访问的文件集合（防止循环引用）
 */
const findDefinitionInFileChain = async (
    document: vscode.TextDocument,
    word: string,
    token: vscode.CancellationToken
): Promise<vscode.DefinitionLink | null> => {
    const cached = await symbolCache.getCachedSymbols(document);
    const found = await cached.findSymbolRecursionAsync(word, token);
    if (found) {
        return {
            targetUri: found.document.uri,
            targetRange: found.symbol.range,
            targetSelectionRange: found.symbol.selectionRange,
        };
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
            targetUri: location.document.uri,
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
    const chainResult = await findDefinitionInFileChain(document, word, token);
    if (chainResult) {
        return [chainResult];
    }

    // 2. 在工作区中查找
    const workspaceResult = await findDefinitionInWorkspace(word);
    if (workspaceResult) {
        return [workspaceResult];
    }

    return null;
}

/**
 * 注册 HLSL Definition Provider
 * @param context
 */
const registerDefinitionProvider = (context: vscode.ExtensionContext) => {
    const hlslDefinitionProvider = vscode.languages.registerDefinitionProvider('hlsl',
        { provideDefinition }
    );

    context.subscriptions.push(hlslDefinitionProvider);
}

export { registerDefinitionProvider };
