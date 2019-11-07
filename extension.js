const vscode = require('vscode')
const { exec } = require('child_process')
const path = require('path')
const fs = require('fs')
const pkgUp = require('pkg-up')
const which = require('which');

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
      // We have already checked that the exe exists and is executable, any errors
      // at this point are most likely syntax errors that are better flagged by the
      // linter, so we just log to the console and finish.
      console.log(err);
      return []; // We must return an array of edits, in this case nothing.
    })
}

const purty = async (document) => {
  const configs = vscode.workspace.getConfiguration('purty');
  // We use empty string to mean unspecified because it means that the setting
  // can be edited without having to write json (`["string", "null"]` does not
  // have this property).
  const purtyCmd = await findPurty(document.fileName, configs.pathToPurty);
  if (purtyCmd == null) {
    vscode.window.showErrorMessage(`Error: Could not find location of purty exe.`);
    vscode.window.showInformationMessage('Do you have purty installed? (`npm install purty`)');
    vscode.window.showInformationMessage('Or you can specify the full path in settings.');
    return Promise.reject("cannot find purty exe");
  }
  // Quotes make sure any strange characters in the path are escaped (single quotes would
  // be better, but double quotes are more cross-platform (works on windows))
  const cmd = `"${purtyCmd}" -`;
  const text = document.getText();
  const cwdCurrent = vscode.workspace.rootPath;
  return new Promise((resolve, reject) => {
    const childProcess = exec(cmd, { cwd: cwdCurrent }, (err, stdout, stderr) => {
      if (err) {
        reject(err);
      }
      resolve({ stdout: stdout, stderr: stderr });
    })
    childProcess.stdin.write(text);
    childProcess.stdin.end();
  })
}

/// Find the purty executable.
///
/// If a path is passed as an argument that is tested first,
/// then/otherwise the location (<workspace_dir>/node_modules/.bin/purty) is searched,
/// and finally the `PATH` environment variable used for a final search. If no executable
/// is found, then the promise will be rejected.
const findPurty = async (psFilePath, purtyPath) => {
  if (purtyPath !== "") {
    if (await canRun(purtyPath)) {
      return purtyPath;
    }
  }
  const localPurty = await localPurtyPath(psFilePath);
  if (await canRun(localPurty)) {
    return localPurty;
  }
  try {
    return await which('purty');
  } catch (_) {
  }
  return null;
}

/// Does an executable at `exePath` exist and is it runnable?
const canRun = async (exePath) => {
  if (exePath == null) {
    return false;
  }
  try {
    await fs.promises.access(exePath, fs.constants.X_OK);
    return true;
  } catch (_) {
  }
  return false;
}

/// Get the location that `npm install purty` would install purty to. If no file
/// exists there or it is not executable, return `null`.
const localPurtyPath = async (cwd) => {
  try {
    const workspacePath = await pkgUp({ cwd });
    const purtyPath = path.resolve(
      path.dirname(workspacePath),
      'node_modules',
      '.bin',
      'purty'
    );
    if (await canRun(purtyPath)) {
      return purtyPath;
    }
  } catch (_) {
  }
  return null;
}

function getPurtyCmd(pathToPurty, fileName) {
  // We use empty string to mean unspecified because it means that the setting
  // can be edited without having to write json (`["string", "null"]` does not
  // have this property).
  if (pathToPurty !== "") {
    return pathToPurty;
  } else {
    const localPurty = findLocalPurty(fileName);
    if (localPurty != null) {
      return localPurty;
    } else {
      return 'purty';
    }
  }
}

function deactivate() { }

module.exports = {
  activate,
  deactivate
}
