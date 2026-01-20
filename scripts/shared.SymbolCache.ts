import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * 解析 #include 路径，返回实际文件 URI
 * 搜索顺序：
 * 1. 相对于当前文件
 * 2. 工作区根目录
 */
const resolveIncludePath = (document: vscode.TextDocument, includePath: string): vscode.Uri | null => {
    // 1. 相对于当前文件目录
    const docDir = path.dirname(document.uri.fsPath);
    const relativePath = path.join(docDir, includePath);
    if (fs.existsSync(relativePath)) {
        return vscode.Uri.file(relativePath);
    }

    // 2. 工作区根目录
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders) {
        for (const folder of workspaceFolders) {
            const workspacePath = path.join(folder.uri.fsPath, includePath);
            if (fs.existsSync(workspacePath)) {
                return vscode.Uri.file(workspacePath);
            }
        }
    }

    return null;
}

/**
 * 解析文档中的所有 #include 路径
 */
const parseIncludes = (document: vscode.TextDocument): vscode.DocumentLink[] => {
    const links: vscode.DocumentLink[] = [];
    const text = document.getText();

    // 匹配 #include "xxx"
    // 不匹配 "//" 注释中的 include
    const regex = /(?<!\/\/.*)#include\s+"([^"]+)"/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
        const includePath = match[1];
        const fullMatch = match[0];
        const matchStart = match.index;

        // 计算 includePath 在匹配中的位置
        const pathStart = matchStart + fullMatch.indexOf(includePath);
        const pathEnd = pathStart + includePath.length;

        const startPos = document.positionAt(pathStart);
        const endPos = document.positionAt(pathEnd);
        const range = new vscode.Range(startPos, endPos);

        // 解析路径
        const resolvedUri = resolveIncludePath(document, includePath);
        if (resolvedUri) {
            links.push(new vscode.DocumentLink(range, resolvedUri));
        }
        else {
            // 创建带提示的链接
            const link = new vscode.DocumentLink(range);
            link.tooltip = `无法找到文件: ${includePath}`;
            links.push(link);
        }
    }

    return links;
}


/**
 * 扁平化符号树
 */
const flattenSymbols = (symbols: vscode.DocumentSymbol[]): vscode.DocumentSymbol[] => {
    const result: vscode.DocumentSymbol[] = [];
    for (const symbol of symbols) {
        result.push(symbol);
        result.push(...flattenSymbols(symbol.children));
    }
    return result;
}

class CachedSymbols {
    readonly version: number;
    readonly document: vscode.TextDocument;
    readonly symbols: readonly vscode.DocumentSymbol[];
    readonly flattenedSymbols: readonly vscode.DocumentSymbol[];
    readonly includes: readonly vscode.DocumentLink[];

    private symbolMap: Map<string, vscode.DocumentSymbol | null> = new Map();

    constructor(document: vscode.TextDocument, symbols: vscode.DocumentSymbol[]) {
        this.version = document.version;
        this.document = document;
        this.symbols = symbols;
        this.flattenedSymbols = flattenSymbols(symbols);
        this.includes = parseIncludes(document);
    }

    // TODO: 各个方法不应遍历，应改为根据树形结构查找，自动剪枝
    public findSymbol(name: string): vscode.DocumentSymbol | null {
        if (this.symbolMap.has(name))
            return this.symbolMap.get(name);

        const symbol = this.flattenedSymbols.find(sym => sym.name === name);
        this.symbolMap.set(name, symbol);
        return symbol;
    }

    // TODO: 各个方法不应遍历，应改为根据树形结构查找，自动剪枝
    public async findSymbolRecursionAsync(name: string, token: vscode.CancellationToken): Promise<SymbolLocation> {
        if (token.isCancellationRequested)
            return null;
        const cached = this.findSymbol(name);
        if (cached)
            return {
                document: this.document,
                symbol: cached
            };
        for (const include of this.includes) {
            const targetCache = await symbolCache.getCachedSymbolsByUri(include.target);
            const targetCachedSymbol = await targetCache.findSymbolRecursionAsync(name, token);
            if (targetCachedSymbol)
                return targetCachedSymbol;
        }

        return null;
    }

    /**
     * 模糊查询
     * @param lowerQueryName 包含的字符串
     */
    // TODO: 增加递归查找机制
    public querySymbols(predicate: (symbol: vscode.DocumentSymbol) => boolean): vscode.DocumentSymbol[] {
        const symbols = this.flattenedSymbols.filter(predicate);
        return symbols;
    }

    public async querySymbolRecursion(predicate: (symbol: vscode.DocumentSymbol) => boolean, token: vscode.CancellationToken): Promise<vscode.DocumentSymbol> {
        // 查找当前文件的符号
        const found = this.flattenedSymbols.find(predicate);
        if (found)
            return found;

        // 递归查找包含的文件
        for (const include of this.includes) {
            if (token.isCancellationRequested)
                break;
            const targetCache = await symbolCache.getCachedSymbolsByUri(include.target);
            const targetSymbol = await targetCache.querySymbolRecursion(predicate, token);
            if (targetSymbol)
                return targetSymbol;
        }

        return null;
    }
}

interface SymbolLocation {
    document: vscode.TextDocument;
    symbol: vscode.DocumentSymbol;
}

/**
 * 符号缓存管理器
 * 用于缓存文档符号，避免重复解析，支持跨文件查找
 */
class SymbolCache {
    private cache = new Map<string, CachedSymbols>();
    private _actived: boolean = false;
    public get actived(): boolean { return this._actived; }

    public active(): void {
        this._actived = true;
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
        // 已激活缓存才存储
        if (this._actived)
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
                        results.push({
                            document: cached.document,
                            symbol
                        });
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
    // TODO: 生成文档依赖图(include链)，提升搜索性能
    async findSymbolInWorkspace(name: string): Promise<SymbolLocation | null> {
        const files = await vscode.workspace.findFiles('**/*.{shader,cginc,hlsl,hlsli,compute}', '**/node_modules/**');

        for (const file of files) {
            try {
                const cached = await this.getCachedSymbolsByUri(file);
                const found = cached.findSymbol(name);
                if (found) {
                    return {
                        document: cached.document,
                        symbol: found
                    };
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
    public invalidate(uri: vscode.Uri): void {
        this.cache.delete(uri.fsPath);
    }

    /**
     * 释放资源
     */
    dispose(): void {
        this.cache.clear();
    }
}

/**
 * 判断是否为 shader 相关文件
 */
const isShaderFile = (uri: vscode.Uri): boolean => {
    const ext = uri.fsPath.toLowerCase();
    return ext.endsWith('.shader') ||
        ext.endsWith('.cginc') ||
        ext.endsWith('.hlsl') ||
        ext.endsWith('.hlsli') ||
        ext.endsWith('.compute');
}

const symbolCache = new SymbolCache();

const registerSymbolCache = (context: vscode.ExtensionContext) => {
    if (symbolCache.actived)
        return;

    // 激活符号缓存
    symbolCache.active();

    // 监听 shader 相关文件变化
    const watcher = vscode.workspace.createFileSystemWatcher('**/*.{shader,cginc,hlsl,hlsli,compute}');
    watcher.onDidChange(uri => symbolCache.invalidate(uri));
    watcher.onDidDelete(uri => symbolCache.invalidate(uri));
    watcher.onDidCreate(uri => symbolCache.invalidate(uri));

    // 监听文档编辑事件
    const onDidChangeTextDocument = vscode.workspace.onDidChangeTextDocument(e => {
        if (isShaderFile(e.document.uri)) {
            symbolCache.invalidate(e.document.uri);
        }
    })

    context.subscriptions.push(symbolCache);
    context.subscriptions.push(watcher);
    context.subscriptions.push(onDidChangeTextDocument);
}

export { symbolCache, registerSymbolCache };
