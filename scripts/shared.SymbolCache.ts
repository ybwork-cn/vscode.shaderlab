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
};

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
};


/**
 * 获取导出的符号
 * - shaderlab 出现在['CGPROGRAM', 'CGINCLUDE', 'HLSLPROGRAM', 'HLSLINCLUDE']中的一级子符号
 * - 其他文件直接使用所有顶级符号
 */
// TODO: 如果是cbuffer/tbuffer定义，应该导出内部一级子符号而不是cbuffer/tbuffer符号
const getExportedSymbols = (languageId: string, symbols: vscode.DocumentSymbol[]): vscode.DocumentSymbol[] => {
    // 非 shaderlab 文件，直接返回所有顶级符号
    if (languageId !== 'shaderlab') {
        return symbols;
    }

    // shaderlab 文件，展开特定组的一级子符号
    const groups = ['CGPROGRAM', 'CGINCLUDE', 'HLSLPROGRAM', 'HLSLINCLUDE'];
    const result: vscode.DocumentSymbol[] = [];

    for (const symbol of symbols) {
        // 如果是包含组，则展开其子符号
        if (groups.includes(symbol.name)) {
            result.push(...symbol.children);
        }
        // 如果不是组，则继续递归查找
        else {
            result.push(...getExportedSymbols(languageId, symbol.children));
        }
    }

    return result;
};

// 判断symbol是否包含position
const symbolContainsPosition = (symbol: vscode.DocumentSymbol, position: vscode.Position): boolean => {
    return symbol.range.start.compareTo(position) <= 0 && symbol.range.end.compareTo(position) >= 0;
};

/**
 * 递归获取包含position的最小范围符号
 * @param symbol 
 * @param position 
 * @returns 
 */
const getMinRangeSymbol = (symbol: vscode.DocumentSymbol, position: vscode.Position): vscode.DocumentSymbol | null => {
    if (!symbolContainsPosition(symbol, position))
        return null;

    for (const child of symbol.children) {
        const found = getMinRangeSymbol(child, position);
        if (found)
            return found;
    }
    return symbol;
};

/**
 * 从一个符号递归查找，找到包含position的符号路径
 */
const getSymbolStack = (symbol: vscode.DocumentSymbol, position: vscode.Position, stack: vscode.DocumentSymbol[]): boolean => {
    if (!symbolContainsPosition(symbol, position))
        return false;

    stack.push(symbol);

    for (const child of symbol.children) {
        const found = getSymbolStack(child, position, stack);
        if (found)
            return true;
    }

    return true;
};

class CachedDocument {
    readonly version: number;
    readonly document: vscode.TextDocument;
    readonly exportedSymbols: readonly vscode.DocumentSymbol[];
    readonly includes: readonly vscode.DocumentLink[];

    private exportedSymbolMap: Map<string, vscode.DocumentSymbol | null> = new Map();
    private symbolStackMap: Map<vscode.Position, readonly vscode.DocumentSymbol[]> = new Map();

    constructor(document: vscode.TextDocument, symbols: vscode.DocumentSymbol[]) {
        this.version = document.version;
        this.document = document;
        this.exportedSymbols = getExportedSymbols(document.languageId, symbols);
        this.includes = parseIncludes(document);
    }

    /**
     * 递归获取所有包含的文件，包括子包含文件，且层序遍历，且不重复
     * @param token 
     * @param action 
     * @returns 
     */
    public async foreachIncludeRecursion(token: vscode.CancellationToken, func: (uri: CachedDocument) => boolean): Promise<void> {
        const visited = new Set<string>();

        const traverse = async (cachedDocument: CachedDocument) => {
            // 先处理当前文件的包含，并记录已访问的文件
            const includes = cachedDocument.includes;
            const includeDocuments: CachedDocument[] = [];
            for (const include of includes) {
                if (token.isCancellationRequested)
                    return;
                if (include.target && !visited.has(include.target.fsPath)) {
                    visited.add(include.target.fsPath);
                    const targetCache = await symbolCache.getCachedDocumentByUri(include.target);
                    const shouldContinue = func(targetCache);
                    if (!shouldContinue)
                        return;
                    includeDocuments.push(targetCache);
                }
            }
            // 然后遍历下一层
            for (const targetCache of includeDocuments) {
                if (token.isCancellationRequested)
                    return;
                await traverse(targetCache);
            }
        };

        await traverse(this);
    }

    /**
     * 查找导出的符号
     * @param name 
     * @returns 
     */
    public findExportedSymbol(name: string): vscode.DocumentSymbol | null {
        if (this.exportedSymbolMap.has(name))
            return this.exportedSymbolMap.get(name);

        // 查找导出的符号
        const symbol = this.exportedSymbols.find(sym => sym.name === name);
        this.exportedSymbolMap.set(name, symbol);
        return symbol;
    }

    public async findSymbolRecursionAsync(name: string, token: vscode.CancellationToken): Promise<SymbolLocation> {
        if (token.isCancellationRequested)
            return null;
        const cached = this.findExportedSymbol(name);
        if (cached)
            return {
                document: this.document,
                symbol: cached
            };
        for (const include of this.includes) {
            const targetCache = await symbolCache.getCachedDocumentByUri(include.target);
            const targetCachedSymbol = await targetCache.findSymbolRecursionAsync(name, token);
            if (targetCachedSymbol)
                return targetCachedSymbol;
        }

        return null;
    }

    /**
     * 模糊查询查找导出的符号
     * @param predicate 
     * @returns 
     */
    public queryExportedSymbols(predicate: (symbol: vscode.DocumentSymbol) => boolean): vscode.DocumentSymbol[] {
        return this.exportedSymbols.filter(predicate);
    }

    /**
     * 查找导出的符号，并在include中递归查找
     * @param predicate 
     * @param token 
     * @returns 
     */
    public async queryExportedSymbolRecursion(predicate: (symbol: vscode.DocumentSymbol) => boolean, token: vscode.CancellationToken): Promise<vscode.DocumentSymbol> {
        // 查找当前文件的符号
        const found = this.exportedSymbols.find(predicate);
        if (found)
            return found;

        // 递归查找包含的文件
        for (const include of this.includes) {
            if (token.isCancellationRequested)
                break;
            const targetCache = await symbolCache.getCachedDocumentByUri(include.target);
            const targetSymbol = await targetCache.queryExportedSymbolRecursion(predicate, token);
            if (targetSymbol)
                return targetSymbol;
        }

        return null;
    }

    public getMinRangeSymbol(position: vscode.Position): vscode.DocumentSymbol {
        for (const symbol of this.exportedSymbols) {
            const found = getMinRangeSymbol(symbol, position);
            if (found) {
                return found;
            }
        }
        return null;
    }

    /**
     * 获取指定位置的符号堆栈
     * @param position 
     * @returns 
     */
    public getSymbolStack(position: vscode.Position): readonly vscode.DocumentSymbol[] {
        const cached = this.symbolStackMap.get(position);
        if (cached)
            return cached;
        for (const symbol of this.exportedSymbols) {
            const stack: vscode.DocumentSymbol[] = [];
            const found = getSymbolStack(symbol, position, stack);
            if (found) {
                this.symbolStackMap.set(position, stack);
                return stack;
            }
        }
        return [];
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
    private cache = new Map<string, CachedDocument>();
    private _actived: boolean = false;
    public get actived(): boolean { return this._actived; }

    public active(): void {
        this._actived = true;
    }

    /**
     * 获取文档符号缓存，如果缓存不存在或过期则重新获取
     */
    async getCachedDocument(document: vscode.TextDocument): Promise<CachedDocument> {
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

        const result = new CachedDocument(document, symbols || []);
        // 已激活缓存才存储
        if (this._actived)
            this.cache.set(key, result);
        return result;
    }

    async getCachedDocumentByUri(uri: vscode.Uri): Promise<CachedDocument> {
        const document = await vscode.workspace.openTextDocument(uri);
        return this.getCachedDocument(document);
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
};

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
    });

    context.subscriptions.push(symbolCache);
    context.subscriptions.push(watcher);
    context.subscriptions.push(onDidChangeTextDocument);
};

export { symbolCache, registerSymbolCache };
