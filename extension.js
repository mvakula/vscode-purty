const vscode = require('vscode')
const { exec } = require('child_process')
const path = require('path')
const fs = require('fs')
const pkgUp = require('pkg-up')

function activate (context) {
  console.log('Congratulations, your extension "vscode-purty" is now active!')
  context.subscriptions.push(
    vscode.languages.registerDocumentFormattingEditProvider(
      { scheme: 'file', language: 'purescript' },
      { provideDocumentFormattingEdits: doc => format(doc) }
    )
  )
}

function format (document) {
  console.log('formatting purescript')
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
    })
}
function purty (document) {
  const localPurty = findLocalPurty(document.fileName);
  const cmd = `${localPurty || 'purty'} -`;
  const text = document.getText();
  const cwdCurrent = vscode.workspace.rootPath
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

function findLocalPurty (fspath) {
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

exports.activate = activate

function deactivate () {}

module.exports = {
  activate,
  deactivate
}
