import { dialog, ipcMain } from 'electron';
import {
  FFmpegConfiguration,
  FFmpegWatermarkConfiguration,
  ReadFileParams,
} from 'renderer/preload';
import { fsStat } from '../util';
import { runPromiseByQueue } from './tools';
import { addWatermark, anyToMP4, getVideoMetadata } from './utils';

const SUFFIX_TYPE_MAP = {
  video: ['mp4', 'mov', 'avi', 'mkv', 'flv', 'webm', 'm4v'].concat(
    ['mp4', 'mov', 'avi', 'mkv', 'flv', 'webm', 'm4v'].map((v) =>
      v.toLocaleUpperCase()
    )
  ),
  image: ['jpg', 'jpeg', 'png', 'gif'].concat(
    ['jpg', 'jpeg', 'png', 'gif'].map((v) => v.toLocaleUpperCase())
  ),
};

export default function registerFFmpegEvent() {
  ipcMain.handle('ffmpeg:readFile', async (_event, option: ReadFileParams) => {
    const { type, isMultiple } = option;
    const filesRes = await dialog.showOpenDialog({
      properties: isMultiple ? ['openFile', 'multiSelections'] : ['openFile'],
      filters: [
        {
          name: type,
          extensions: SUFFIX_TYPE_MAP[type],
        },
      ],
    });
    const files = filesRes.filePaths;
    const fileStats = await Promise.all(files.map((file) => fsStat(file)));
    // 解析视频元数据
    return files.map((filePath, index) => ({
      path: filePath,
      size: fileStats[index].size,
      metadata:
        type === 'video'
          ? getVideoMetadata(filePath)
          : getVideoMetadata(filePath),
    }));
  });

  ipcMain.handle(
    'ffmpeg:convert',
    async (
      _event,
      filePaths: string[],
      targetType,
      configuration: FFmpegConfiguration
    ) => {
      if (targetType === 'mp4') {
        const asyncTasks = filePaths.map(
          (filePath) => () => anyToMP4(filePath, configuration)
        );
        runPromiseByQueue(asyncTasks);
      }
    }
  );

  ipcMain.handle(
    'ffmpeg:addWatermark',
    async (_event, configuration: FFmpegWatermarkConfiguration) => {
      const { inputVideoConfigs, inputImagePath, placement } = configuration;
      const asyncTasks = inputVideoConfigs.map(
        (config) => () =>
          addWatermark(
            config.path,
            inputImagePath,
            placement,
            config.opacity,
            config.watermarkWidthPercent
          )
      );
      runPromiseByQueue(asyncTasks);
    }
  );
}
