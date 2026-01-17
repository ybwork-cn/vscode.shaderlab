import * as vscode from 'vscode';

class CachedSymbols {
    readonly version: number;
    readonly uri: vscode.Uri;
    readonly symbols: readonly vscode.DocumentSymbol[];
    readonly flattenedSymbols: readonly vscode.DocumentSymbol[];

    private symbolMap: Map<string, vscode.DocumentSymbol> = new Map();

    constructor(document: vscode.TextDocument, symbols: vscode.DocumentSymbol[]) {
        this.version = document.version;
        this.uri = document.uri;
        this.symbols = symbols;
        this.flattenedSymbols = CachedSymbols.flattenSymbols(symbols);
    }

    // TODO: 各个方法不应遍历，应改为根据树形结构查找，自动剪枝
    public findSymbol(name: string): vscode.DocumentSymbol | undefined {
        const symbol = this.symbolMap.get(name);
        if (symbol)
            return symbol;

        const newSymbol = this.flattenedSymbols.find(sym => sym.name === name);
        this.symbolMap.set(name, newSymbol);
        return newSymbol;
    }

    /**
     * 扁平化符号树
     */
    private static flattenSymbols(symbols: vscode.DocumentSymbol[]): vscode.DocumentSymbol[] {
        const result: vscode.DocumentSymbol[] = [];
        for (const symbol of symbols) {
            result.push(symbol);
            result.push(...this.flattenSymbols(symbol.children));
        }
        return result;
    }
}

interface SymbolLocation {
    uri: vscode.Uri;
    symbol: vscode.DocumentSymbol;
}

/**
 * 符号缓存管理器
 * 用于缓存文档符号，避免重复解析，支持跨文件查找
 */
class SymbolCache {
    private cache = new Map<string, CachedSymbols>();
    private watcher: vscode.FileSystemWatcher;
    private disposables: vscode.Disposable[] = [];

    constructor() {
        // 监听 shader 相关文件变化
        this.watcher = vscode.workspace.createFileSystemWatcher('**/*.{shader,cginc,hlsl,hlsli,compute}');
        this.watcher.onDidChange(uri => this.invalidate(uri));
        this.watcher.onDidDelete(uri => this.cache.delete(uri.fsPath));
        this.watcher.onDidCreate(uri => this.invalidate(uri));
        this.disposables.push(this.watcher);

        // 监听文档编辑事件
        this.disposables.push(
            vscode.workspace.onDidChangeTextDocument(e => {
                if (this.isShaderFile(e.document.uri)) {
                    this.invalidate(e.document.uri);
                }
            })
        );
    }

    /**
     * 判断是否为 shader 相关文件
     */
    private isShaderFile(uri: vscode.Uri): boolean {
        const ext = uri.fsPath.toLowerCase();
        return ext.endsWith('.shader') || 
               ext.endsWith('.cginc') || 
               ext.endsWith('.hlsl') || 
               ext.endsWith('.hlsli') ||
               ext.endsWith('.compute');
    }

    /**
     * 获取文档符号缓存，如果缓存不存在或过期则重新获取
     */
    async getCachedSymbols(document: vscode.TextDocument): Promise<CachedSymbols> {
        const key = document.uri.fsPath;
        const cached = this.cache.get(key);

        // 如果缓存有效，直接返回
        if (cached && cached.version === document.version) {
            return cached;
        }

        // 调用 VS Code 内置命令获取符号
        const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
            'vscode.executeDocumentSymbolProvider',
            document.uri
        );

        const result = new CachedSymbols(document, symbols || []);
        this.cache.set(key, result);
        return result;
    }

    async getCachedSymbolsByUri(uri: vscode.Uri): Promise<CachedSymbols> {
        const document = await vscode.workspace.openTextDocument(uri);
        return this.getCachedSymbols(document);
    }

    /**
     * 在工作区中搜索符号
     */
    // TODO: 生成文档依赖图(include链)，提升搜索性能
    async searchWorkspaceSymbols(query: string): Promise<SymbolLocation[]> {
        const results: SymbolLocation[] = [];
        const files = await vscode.workspace.findFiles('**/*.{shader,cginc,hlsl,hlsli,compute}', '**/node_modules/**');

        for (const file of files) {
            try {
                const cached = await this.getCachedSymbolsByUri(file);
                for (const symbol of cached.flattenedSymbols) {
                    if (symbol.name.toLowerCase().includes(query.toLowerCase())) {
                        results.push({ uri: file, symbol });
                    }
                }
            } catch (e) {
                console.error(`Failed to search symbols in: ${file.fsPath}`, e);
            }
        }

        return results;
    }

    /**
     * 在工作区中按名称精确查找符号
     */
    async findSymbolInWorkspace(name: string): Promise<SymbolLocation | null> {
        const files = await vscode.workspace.findFiles('**/*.{shader,cginc,hlsl,hlsli,compute}', '**/node_modules/**');

        for (const file of files) {
            try {
                const cached = await this.getCachedSymbolsByUri(file);
                const found = cached.findSymbol(name);
                if (found) {
                    return { uri: file, symbol: found };
                }
            } catch (e) {
                console.error(`Failed to find symbol in: ${file.fsPath}`, e);
            }
        }

        return null;
    }

    /**
     * 使指定文件的缓存失效
     */
    private invalidate(uri: vscode.Uri): void {
        this.cache.delete(uri.fsPath);
    }

    /**
     * 释放资源
     */
    dispose(): void {
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
        this.cache.clear();
    }
}

const symbolCache = new SymbolCache();

export { symbolCache };
