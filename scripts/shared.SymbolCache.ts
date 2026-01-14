import * as vscode from 'vscode';

interface CachedSymbols {
    version: number;
    symbols: vscode.DocumentSymbol[];
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

        // 监听文档编辑事件
        this.disposables.push(
            vscode.workspace.onDidChangeTextDocument(e => {
                if (this.isShaderFile(e.document.uri)) {
                    this.invalidate(e.document.uri);
                }
            })
        );

        this.disposables.push(this.watcher);
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
     * 获取文档符号（优先从缓存读取）
     */
    async getSymbols(document: vscode.TextDocument): Promise<vscode.DocumentSymbol[]> {
        const key = document.uri.fsPath;
        const cached = this.cache.get(key);

        // 如果缓存有效，直接返回
        if (cached && cached.version === document.version) {
            return cached.symbols;
        }

        // 调用 VS Code 内置命令获取符号
        const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
            'vscode.executeDocumentSymbolProvider',
            document.uri
        );

        const result = symbols || [];
        this.cache.set(key, { version: document.version, symbols: result });
        return result;
    }

    /**
     * 根据 URI 获取符号（会打开文档）
     */
    async getSymbolsByUri(uri: vscode.Uri): Promise<vscode.DocumentSymbol[]> {
        try {
            const document = await vscode.workspace.openTextDocument(uri);
            return this.getSymbols(document);
        } catch (e) {
            console.error(`Failed to open document: ${uri.fsPath}`, e);
            return [];
        }
    }

    /**
     * 在符号树中递归查找指定名称的符号（返回第一个匹配）
     */
    findSymbolByName(symbols: vscode.DocumentSymbol[], name: string): vscode.DocumentSymbol | null {
        for (const symbol of symbols) {
            if (symbol.name === name) {
                return symbol;
            }
            const found = this.findSymbolByName(symbol.children, name);
            if (found) {
                return found;
            }
        }
        return null;
    }

    /**
     * 在符号树中递归查找所有同名符号（支持重载）
     */
    findAllSymbolsByName(symbols: vscode.DocumentSymbol[], name: string): vscode.DocumentSymbol[] {
        const results: vscode.DocumentSymbol[] = [];
        
        const search = (syms: vscode.DocumentSymbol[]) => {
            for (const sym of syms) {
                if (sym.name === name) {
                    results.push(sym);
                }
                search(sym.children);
            }
        };
        
        search(symbols);
        return results;
    }

    /**
     * 在符号树中递归查找指定类型的符号
     */
    findSymbolsByKind(symbols: vscode.DocumentSymbol[], kinds: vscode.SymbolKind[]): vscode.DocumentSymbol[] {
        const result: vscode.DocumentSymbol[] = [];
        for (const symbol of symbols) {
            if (kinds.includes(symbol.kind)) {
                result.push(symbol);
            }
            result.push(...this.findSymbolsByKind(symbol.children, kinds));
        }
        return result;
    }

    /**
     * 扁平化符号树
     */
    flattenSymbols(symbols: vscode.DocumentSymbol[]): vscode.DocumentSymbol[] {
        const result: vscode.DocumentSymbol[] = [];
        for (const symbol of symbols) {
            result.push(symbol);
            result.push(...this.flattenSymbols(symbol.children));
        }
        return result;
    }

    /**
     * 在工作区中搜索符号
     */
    async searchWorkspaceSymbols(query: string): Promise<SymbolLocation[]> {
        const results: SymbolLocation[] = [];
        const files = await vscode.workspace.findFiles('**/*.{shader,cginc,hlsl,hlsli,compute}', '**/node_modules/**');

        for (const file of files) {
            try {
                const symbols = await this.getSymbolsByUri(file);
                const flatSymbols = this.flattenSymbols(symbols);

                for (const symbol of flatSymbols) {
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
                const symbols = await this.getSymbolsByUri(file);
                const found = this.findSymbolByName(symbols, name);
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
    invalidate(uri: vscode.Uri): void {
        this.cache.delete(uri.fsPath);
    }

    /**
     * 清空所有缓存
     */
    clear(): void {
        this.cache.clear();
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

// 全局单例
const symbolCache = new SymbolCache();

export { symbolCache, SymbolCache, SymbolLocation };
