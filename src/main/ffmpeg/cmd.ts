// Uses node.js process manager
import { dialog } from 'electron';
import child_process from 'child_process';

interface RunScriptParams {
  command: string;
  args: any;
  onProgress: (data: string) => void;
  onSuccess: () => void;
  onError: (error: Error) => void;
}

// This function will output the lines from the script
// and will return the full combined output
// as well as exit code when it's done (using the callback).
export default function runScript(params: RunScriptParams) {
  const { command, args, onProgress, onSuccess, onError } = params;
  const child = child_process.spawn(command, args, {
    shell: true,
  });
  // You can also use a variable to save the output for when the script closes later
  child.on('error', (error) => {
    onError(error);
    dialog.showMessageBox({
      title: 'Title',
      type: 'error',
      message: `Error occured.\r\n${error}`,
    });
  });

  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (data) => {
    // Here is the output
    const dataString = data.toString();
    console.log('stdout', dataString);
  });

  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (data) => {
    // Return some data to the renderer process with the mainprocess-response ID
    onProgress(data);
    // Here is the output from the command
    // console.log('stderr', command, data);
  });

  child.on('close', (code) => {
    // Here you can get the exit code of the script
    switch (code) {
      case 0:
        onSuccess();
        break;
      default:
        dialog.showMessageBox({
          title: 'default Title',
          type: 'error',
          message: `End process.\r\n code is ${code}`,
        });
    }
  });
}
