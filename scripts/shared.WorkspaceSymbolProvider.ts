import * as vscode from 'vscode';
import { symbolCache } from './shared.SymbolCache.js';

/**
 * 提供工作区符号搜索
 */
const provideWorkspaceSymbols = async (
    query: string,
    token: vscode.CancellationToken
): Promise<vscode.SymbolInformation[]> => {
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
        if (token.isCancellationRequested) 
            break;

        try {
            const cached = await symbolCache.getCachedSymbolsByUri(file);
            const symbolInfos = cached
                .querySymbols(lowerQuery)
                .map(symbol => new vscode.SymbolInformation(
                    symbol.name,
                    symbol.kind,
                    symbol.name,
                    new vscode.Location(file, symbol.selectionRange)
                ));
            results.push(...symbolInfos);
        } catch (e) {
            console.error(`Failed to get symbols from: ${file.fsPath}`, e);
        }
    }

    return results;
};

/**
 * 解析符号（可选，用于延迟加载详细信息）
 */
const resolveWorkspaceSymbol = async (
    symbol: vscode.SymbolInformation,
    token: vscode.CancellationToken
): Promise<vscode.SymbolInformation> => {
    // 目前直接返回，如果需要可以在这里加载更多信息
    return symbol;
};

// 注册 WorkspaceSymbolProvider
const workspaceSymbolProvider = vscode.languages.registerWorkspaceSymbolProvider({
    provideWorkspaceSymbols,
    resolveWorkspaceSymbol
});

export { workspaceSymbolProvider };
