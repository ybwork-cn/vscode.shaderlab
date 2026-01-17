import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Unity Package 路径缓存
 * key: 包名 (如 "com.unity.render-pipelines.core")
 * value: 实际文件系统路径
 */
const packagePathCache = new Map<string, string>();
let lastUnityProjectPath: string | null = null;

/**
 * 获取扩展配置
 */
const getConfig = () => {
    const config = vscode.workspace.getConfiguration('ybwork-shaderlab');
    return {
        cgIncludesPath: config.get<string>('cgIncludesPath') || vscode.workspace.getConfiguration().get<string>('Unity CGIncludes Path'),
        unityProjectPath: config.get<string>('unityProjectPath'),
        packageMappings: config.get<Record<string, string>>('packageMappings') || {},
    };
}

/**
 * 扫描 Unity 项目的 Package 目录，建立包名到路径的映射
 */
const scanUnityPackages = (unityProjectPath: string): void => {
    // 如果项目路径没变，使用缓存
    if (lastUnityProjectPath === unityProjectPath && packagePathCache.size > 0) {
        return;
    }

    packagePathCache.clear();
    lastUnityProjectPath = unityProjectPath;

    // 1. 扫描 Library/PackageCache (从 Package Manager 安装的包)
    const packageCachePath = path.join(unityProjectPath, 'Library', 'PackageCache');
    if (fs.existsSync(packageCachePath)) {
        try {
            const entries = fs.readdirSync(packageCachePath, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    // 包名格式: com.unity.render-pipelines.core@14.0.8 或 @hash
                    const match = entry.name.match(/^(.+?)@/);
                    if (match) {
                        const packageName = match[1];
                        packagePathCache.set(packageName, path.join(packageCachePath, entry.name));
                    }
                }
            }
        } catch (e) {
            console.error('Failed to scan PackageCache:', e);
        }
    }

    // 2. 扫描 Packages 目录 (本地包/嵌入式包)
    const packagesPath = path.join(unityProjectPath, 'Packages');
    if (fs.existsSync(packagesPath)) {
        try {
            const entries = fs.readdirSync(packagesPath, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    // 检查是否有 package.json
                    const packageJsonPath = path.join(packagesPath, entry.name, 'package.json');
                    if (fs.existsSync(packageJsonPath)) {
                        try {
                            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
                            if (packageJson.name) {
                                // 本地包优先级更高，覆盖 PackageCache 中的同名包
                                packagePathCache.set(packageJson.name, path.join(packagesPath, entry.name));
                            }
                        } catch (e) {
                            console.error(`Failed to parse package.json: ${packageJsonPath}`, e);
                        }
                    }
                }
            }

            // 3. 解析 manifest.json 获取更多包信息（包括 git 包）
            const manifestPath = path.join(packagesPath, 'manifest.json');
            if (fs.existsSync(manifestPath)) {
                try {
                    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
                    // manifest.dependencies 包含所有依赖，但路径信息在 packages-lock.json 中
                } catch (e) {
                    console.error('Failed to parse manifest.json:', e);
                }
            }
        } catch (e) {
            console.error('Failed to scan Packages:', e);
        }
    }

    console.log(`Scanned ${packagePathCache.size} Unity packages`);
}

/**
 * 解析 "Packages/xxx" 格式的路径
 * @param includePath 如 "Packages/com.unity.render-pipelines.core/ShaderLibrary/Common.hlsl"
 * @returns 实际文件系统路径或 null， 如： "E:/MyUnityProject/Packages/com.unity.render-pipelines.core/ShaderLibrary/Common.hlsl"
 */
const resolveUnityPackagePath = (includePath: string): string | null => {
    // 检查是否是 Packages/ 开头
    if (!includePath.startsWith('Packages/')) {
        return null;
    }

    const config = getConfig();

    // 1. 首先检查用户自定义的包映射
    for (const [packagePrefix, realPath] of Object.entries(config.packageMappings)) {
        const fullPrefix = `Packages/${packagePrefix}`;
        if (includePath.startsWith(fullPrefix)) {
            const relativePath = includePath.substring(fullPrefix.length);
            const resolvedPath = path.join(realPath, relativePath);
            if (fs.existsSync(resolvedPath)) {
                return resolvedPath;
            }
        }
    }

    // 2. 尝试自动解析 Unity 项目中的包
    let unityProjectPath = config.unityProjectPath;

    // 如果没有配置，尝试从工作区推断
    if (!unityProjectPath) {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders) {
            for (const folder of workspaceFolders) {
                // 检查是否是 Unity 项目（有 Assets 文件夹）
                if (fs.existsSync(path.join(folder.uri.fsPath, 'Assets'))) {
                    unityProjectPath = folder.uri.fsPath;
                    break;
                }
            }
        }
    }

    if (unityProjectPath) {
        // 扫描并缓存包路径
        scanUnityPackages(unityProjectPath);

        // 解析包名: Packages/com.unity.xxx/ShaderLibrary/Common.hlsl
        // 提取: com.unity.xxx 和 ShaderLibrary/Common.hlsl
        const pathAfterPackages = includePath.substring('Packages/'.length);
        const slashIndex = pathAfterPackages.indexOf('/');

        if (slashIndex > 0) {
            const packageName = pathAfterPackages.substring(0, slashIndex);
            const fileRelativePath = pathAfterPackages.substring(slashIndex + 1);

            const packageRootPath = packagePathCache.get(packageName);
            if (packageRootPath) {
                const resolvedPath = path.join(packageRootPath, fileRelativePath);
                if (fs.existsSync(resolvedPath)) {
                    return resolvedPath;
                }
            }
        }
    }

    return null;
}

/**
 * 解析 #include 路径，返回实际文件 URI
 * 搜索顺序：
 * 1. 相对于当前文件
 * 2. Unity Package 路径 (Packages/xxx)
 * 3. 工作区根目录
 * 4. Unity CGIncludes 路径（内置 Shader）
 */
const resolveIncludePath = (document: vscode.TextDocument, includePath: string): vscode.Uri | null => {
    const config = getConfig();

    // 1. 相对于当前文件目录
    const docDir = path.dirname(document.uri.fsPath);
    const relativePath = path.join(docDir, includePath);
    if (fs.existsSync(relativePath)) {
        return vscode.Uri.file(relativePath);
    }

    // 2. Unity Package 路径 (Packages/xxx 格式)
    const packagePath = resolveUnityPackagePath(includePath);
    if (packagePath) {
        return vscode.Uri.file(packagePath);
    }

    // 3. 工作区根目录
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders) {
        for (const folder of workspaceFolders) {
            const workspacePath = path.join(folder.uri.fsPath, includePath);
            if (fs.existsSync(workspacePath)) {
                return vscode.Uri.file(workspacePath);
            }
        }
    }

    // 4. Unity CGIncludes 路径（用户配置，用于内置 Shader）
    if (config.cgIncludesPath) {
        const unityPath = path.join(config.cgIncludesPath, includePath);
        if (fs.existsSync(unityPath)) {
            return vscode.Uri.file(unityPath);
        }
    }

    return null;
}

/**
 * 提供文档链接（#include 可点击跳转）
 */
const provideDocumentLinks = (document: vscode.TextDocument, token: vscode.CancellationToken): vscode.DocumentLink[] => {
    const links: vscode.DocumentLink[] = [];
    const text = document.getText();

    // 匹配 #include "xxx" 或 #include <xxx>
    const regex = /#include\s+["<]([^">]+)[">]/g;
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
        } else {
            // 创建带提示的链接
            const link = new vscode.DocumentLink(range);
            if (includePath.startsWith('Packages/')) {
                link.tooltip = `无法找到 Package 文件: ${includePath}\n请配置 Unity 项目路径或包映射`;
            } else {
                link.tooltip = `无法找到文件: ${includePath}`;
            }
            links.push(link);
        }
    }

    return links;
}

/**
 * 解析链接（当用户点击时调用）
 */
const resolveDocumentLink = (link: vscode.DocumentLink, token: vscode.CancellationToken): vscode.DocumentLink => {
    return link;
}

/**
 * 清除包路径缓存（当配置改变时调用）
 */
const clearPackageCache = (): void => {
    packagePathCache.clear();
    lastUnityProjectPath = null;
}

// 注册 DocumentLinkProvider
const hlslDocumentLinkProvider = vscode.languages.registerDocumentLinkProvider(
    ['hlsl', 'shaderlab'],
    {
        provideDocumentLinks,
        resolveDocumentLink
    }
);

// 监听配置变化，清除缓存
vscode.workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration('ybwork-shaderlab')) {
        clearPackageCache();
    }
});

export { hlslDocumentLinkProvider, resolveIncludePath };
