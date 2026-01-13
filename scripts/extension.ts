import * as vscode from 'vscode';
import * as shaderlab from './extension.shaderlab.js';
import * as hlsl from './extension.hlsl.js';

function activate(context: vscode.ExtensionContext) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "Beautify ShaderLab" is now active!');

    shaderlab.activate(context);
    hlsl.activate(context);
}

// this method is called when your extension is deactivated
function deactivate() {
    console.log('您的扩展"Beautify ShaderLab"已被释放！');
}

export {
    activate,
    deactivate
};
