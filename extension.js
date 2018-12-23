const vscode = require('vscode')
const { exec } = require('child_process')

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
  const cmd = `purty ${document.fileName} --dynamic`
  const cwdCurrent = vscode.workspace.rootPath
  return new Promise((resolve, reject) => {
    exec(cmd, { cwd: cwdCurrent }, (err, stdout, stderr) => {
      if (err) {
        console.log('err', err)
        reject(err)
      }
      resolve({ stdout: stdout, stderr: stderr })
    })
  })
}

exports.activate = activate

function deactivate () {}

module.exports = {
  activate,
  deactivate
}
