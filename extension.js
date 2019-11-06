const vscode = require('vscode')
const { exec } = require('child_process')
const path = require('path')
const fs = require('fs')
const pkgUp = require('pkg-up')

function activate(context) {
  console.log('Congratulations, your extension "vscode-purty" is now active!')
  context.subscriptions.push(
    vscode.languages.registerDocumentFormattingEditProvider(
      { scheme: 'file', language: 'purescript' },
      { provideDocumentFormattingEdits: doc => format(doc) }
    )
  )
}

function format(document) {
  console.debug('formatting purescript')
  return purty(document)
    .then(({ stdout }) => {
      const lastLineId = document.lineCount - 1
      const wholeDocument = new vscode.Range(
        0,
        0,
        lastLineId,
        document.lineAt(lastLineId).text.length
      )
      return [vscode.TextEdit.replace(wholeDocument, stdout)]
    })
    .catch(err => {
      console.log('err', err)
      vscode.window.showErrorMessage(`Error: ${err}`);
      vscode.window.showInformationMessage('Do you have Purty installed? "npm install purty"');
    })
}

function purty(document) {
  const configs = vscode.workspace.getConfiguration('purty');
  let purtyCmd;
  // We use empty string to mean unspecified because it means that the setting
  // can be edited without having to write json (`["string", "null"]` does not
  // have this property).
  if (configs.pathToPurty !== "") {
    purtyCmd = configs.pathToPurty;
  } else {
    const localPurty = findLocalPurty(document.fileName);
    if (localPurty != null) {
      purtyCmd = localPurty;
    } else {
      purtyCmd = 'purty';
    }
  }
  const cmd = `${purtyCmd} -`;
  const text = document.getText();
  const cwdCurrent = vscode.workspace.rootPath;
  return new Promise((resolve, reject) => {
    const childProcess = exec(cmd, { cwd: cwdCurrent }, (err, stdout, stderr) => {
      if (err) {
        console.log('err', err)
        reject(err)
      }
      resolve({ stdout: stdout, stderr: stderr })
    })
    childProcess.stdin.write(text)
    childProcess.stdin.end()
  })
}

function findLocalPurty(fspath) {
  try {
    const pkgPath = pkgUp.sync({ cwd: fspath });
    if (pkgPath) {
      const purtyPath = path.resolve(
        path.dirname(pkgPath),
        'node_modules',
        '.bin',
        'purty'
      );
      if (fs.existsSync(purtyPath)) {
        return purtyPath;
      }
    }
  } catch (e) {
  }
  return null;
}

function deactivate() { }

module.exports = {
  activate,
  deactivate
}
