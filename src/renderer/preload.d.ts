import { Channels } from 'main/preload';

export interface FileItem {
  path: string;
  size: number;
  metadata: string;
}

export interface FFmpegConfiguration {
  frameRate?: number;
  screenSize?: string;
  aspectRatio?: string;
  compressRatio?: number;
}

export interface ReadFileParams {
  type: 'video' | 'image';
  isMultiple: boolean;
}

export interface FFmpegWatermarkConfiguration {
  inputVideoConfigs: {
    path: string;
    watermarkWidthPercent: number;
    opacity: number;
  }[];
  inputImagePath: string;
  placement: 'center' | 'leftTop' | 'rightBottom' | 'leftBottom' | 'rightTop';
}

declare global {
  interface Window {
    electron: {
      ipcRenderer: {
        sendMessage(channel: Channels, args: unknown[]): void;
        on(
          channel: string,
          func: (...args: unknown[]) => void
        ): (() => void) | undefined;
        once(channel: string, func: (...args: unknown[]) => void): void;
      };
      ffmpeg: {
        readFile: (option: ReadFileParams) => Promise<FileItem[]>;
        convertFiles: (
          filePaths: string[],
          targetType: 'mp4' | 'gif',
          configuration?: FFmpegConfiguration
        ) => Promise<void>;
        convertFilesByCustomShell: (
          filePaths: string[],
          targetType: 'mp4' | 'gif',
          configuration?: FFmpegConfiguration
        ) => Promise<void>;
        addWatermark: (
          configuration: FFmpegWatermarkConfiguration
        ) => Promise<void>;
      };
      shell: {
        openLink: (url: string) => void;
        showItemInFolder: (path: string) => void;
      };
    };
  }
}
