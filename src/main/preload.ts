import { contextBridge, ipcRenderer, IpcRendererEvent, shell } from 'electron';
import type {
  FFmpegConfiguration,
  FFmpegWatermarkConfiguration,
  ReadFileParams,
} from '../renderer/preload';

export type Channels = 'ipc-example';

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    sendMessage(channel: Channels, args: unknown[]) {
      ipcRenderer.send(channel, args);
    },
    on(channel: Channels, func: (...args: unknown[]) => void) {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
        func(...args);
      ipcRenderer.on(channel, subscription);

      return () => ipcRenderer.removeListener(channel, subscription);
    },
    once(channel: Channels, func: (...args: unknown[]) => void) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },
  },
  ffmpeg: {
    readFile(option: ReadFileParams) {
      return ipcRenderer.invoke('ffmpeg:readFile', option);
    },
    convertFiles: (
      filePaths: string[],
      targetType: 'mp4' | 'gif',
      configuration: FFmpegConfiguration
    ) => {
      return ipcRenderer.invoke(
        'ffmpeg:convert',
        filePaths,
        targetType,
        configuration
      );
    },
    addWatermark: (configuration: FFmpegWatermarkConfiguration) => {
      return ipcRenderer.invoke('ffmpeg:addWatermark', configuration);
    },
  },
  shell: {
    openLink(url: string) {
      shell.openExternal(url);
    },
    showItemInFolder(path: string) {
      shell.showItemInFolder(path);
    },
  },
});
