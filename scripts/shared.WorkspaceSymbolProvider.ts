import * as vscode from 'vscode';
import { symbolCache } from './shared.SymbolCache.js';

/**
 * 将 DocumentSymbol 转换为 SymbolInformation
 */
function toSymbolInformation(
    uri: vscode.Uri,
    symbol: vscode.DocumentSymbol,
    containerName: string = ''
): vscode.SymbolInformation {
    return new vscode.SymbolInformation(
        symbol.name,
        symbol.kind,
        containerName,
        new vscode.Location(uri, symbol.selectionRange)
    );
}

/**
 * 递归收集所有符号信息
 */
function collectSymbolInformation(
    uri: vscode.Uri,
    symbols: vscode.DocumentSymbol[],
    containerName: string = ''
): vscode.SymbolInformation[] {
    const results: vscode.SymbolInformation[] = [];

    for (const symbol of symbols) {
        results.push(toSymbolInformation(uri, symbol, containerName));

        // 递归处理子符号
        if (symbol.children && symbol.children.length > 0) {
            results.push(...collectSymbolInformation(uri, symbol.children, symbol.name));
        }
    }

    return results;
}

/**
 * 提供工作区符号搜索
 */
async function provideWorkspaceSymbols(
    query: string,
    token: vscode.CancellationToken
): Promise<vscode.SymbolInformation[]> {
    if (!query || query.length < 2) {
        // 查询太短时不搜索，避免返回过多结果
        return [];
    }

    const results: vscode.SymbolInformation[] = [];
    const lowerQuery = query.toLowerCase();

    // 搜索所有 shader 相关文件
    const files = await vscode.workspace.findFiles(
        '**/*.{shader,cginc,hlsl,hlsli}',
        '**/node_modules/**',
        500 // 限制文件数量
    );

    for (const file of files) {
        if (token.isCancellationRequested) {
            break;
        }

        try {
            const symbols = await symbolCache.getSymbolsByUri(file);
            const allSymbolInfos = collectSymbolInformation(file, symbols);

            // 过滤匹配的符号
            for (const info of allSymbolInfos) {
                if (info.name.toLowerCase().includes(lowerQuery)) {
                    results.push(info);
                }
            }
        } catch (e) {
            console.error(`Failed to get symbols from: ${file.fsPath}`, e);
        }
    }

    return results;
}

/**
 * 解析符号（可选，用于延迟加载详细信息）
 */
async function resolveWorkspaceSymbol(
    symbol: vscode.SymbolInformation,
    token: vscode.CancellationToken
): Promise<vscode.SymbolInformation> {
    // 目前直接返回，如果需要可以在这里加载更多信息
    return symbol;
}

// 注册 WorkspaceSymbolProvider
const workspaceSymbolProvider = vscode.languages.registerWorkspaceSymbolProvider({
    provideWorkspaceSymbols,
    resolveWorkspaceSymbol
});

export { workspaceSymbolProvider };
