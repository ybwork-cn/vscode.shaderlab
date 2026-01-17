import * as vscode from 'vscode';

// 创建诊断集合
const diagnosticCollection = vscode.languages
    .createDiagnosticCollection('ybwork-shaderlab');

/**
 * 报告指定文档的诊断信息
 * @param document 发生变化的文档
 */
const provideDiagnostics = (document: vscode.TextDocument): void => {
    // 仅处理 shaderlab 语言的文档
    if (document.languageId !== 'shaderlab')
        return;

    // 创建诊断信息列表
    // const diagnostics: vscode.Diagnostic[] = [];

    // // 添加一个诊断信息：第0行，第0列，错误级别，消息为 "这是一个自定义错误"
    // const range = new vscode.Range(
    //     new vscode.Position(0, 0),
    //     new vscode.Position(0, 10)
    // );
    // const diagnostic = new vscode.Diagnostic(range, '这是一个自定义错误', vscode.DiagnosticSeverity.Error);
    // diagnostics.push(diagnostic);

    // TODO: 实际的诊断逻辑
    // 分析代码结构，查找潜在错误或警告

    // 文件变化后，更新诊断集合，设置为新的诊断信息列表
    // diagnosticCollection.set(document.uri, diagnostics);
}

// 注册一个文档打开/更改监听器
const textChangedEvent = vscode.workspace.onDidChangeTextDocument(event => {
    provideDiagnostics(event.document);
});

export { diagnosticCollection, textChangedEvent };
