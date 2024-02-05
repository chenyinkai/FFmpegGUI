/* eslint-disable global-require */
import { BrowserWindow } from 'electron';
import path from 'path';
import child_process from 'child_process';
import runScript from './cmd';
import { filterProgress, getProgress } from './tools';
import type {
  FFmpegConfiguration,
  FFmpegWatermarkConfiguration,
} from '../../renderer/preload';

let ffmpegPath = '';
let ffprobePath = '';
let mainWindow: BrowserWindow;

export function initFFMPEG(window: BrowserWindow) {
  ffmpegPath = require('ffmpeg-static').replace(
    'app.asar',
    'app.asar.unpacked'
  );
  ffprobePath = require('ffprobe-static').path.replace(
    'app.asar',
    'app.asar.unpacked'
  );
  mainWindow = window;
}

export function getVideoMetadata(videoPath: string) {
  const cmd = `${ffprobePath} -select_streams v -show_entries format=duration,size,bit_rate,filename -show_streams -v quiet -of csv="p=0" -of json -i "${videoPath}"`;
  try {
    const processData = child_process.spawnSync(cmd, {
      shell: true,
      encoding: 'utf-8',
      timeout: 10000,
    });
    const videoMetaData = processData.stdout;
    return videoMetaData;
  } catch (error) {
    return JSON.stringify(error);
  }
}

function parseFilePath(
  filePath: string,
  targetType: string,
  suffix: string
): string {
  const filePathObj = path.parse(filePath);
  return `${filePathObj.dir}${path.sep}${filePathObj.name}_${suffix}${targetType}`;
}

/**
 * 根据配置项生成 ffmpeg 脚本
 *
 * @param {FFmpegConfiguration} configuration
 * @returns {string}
 */
function getScriptFromConfiguration(
  configuration: FFmpegConfiguration
): string {
  const defaultScript = `-c:v libx264 -crf 28 -pix_fmt yuv420p`;
  if (!configuration) return defaultScript;
  const { compressRatio, frameRate, screenSize } = configuration;
  const configScript = `-c:v libx264 -crf ${compressRatio} -pix_fmt yuv420p`;
  const filterOptions = [];
  if (frameRate) filterOptions.push(`fps=fps=${frameRate}`);
  if (screenSize) filterOptions.push(`scale=${screenSize}`);
  if (filterOptions.length) {
    return `-vf ${filterOptions.join()} -c:v libx264 -crf ${compressRatio} -pix_fmt yuv420p`;
  }
  return configScript;
}

export function anyToMP4(
  filePath: string,
  configuration: FFmpegConfiguration
): Promise<string> {
  return new Promise((resolve, reject) => {
    const pathToSourceFile = path.resolve(filePath);
    const pathTarget = parseFilePath(filePath, '.mp4', 'converted');
    const command = `${ffmpegPath} -y -i "${pathToSourceFile}" ${getScriptFromConfiguration(
      configuration
    )} "${pathTarget}"`;
    runScript({
      command,
      args: [],
      onProgress: (data: string) => {
        const progress = getProgress(data);
        if (filterProgress(progress)) {
          mainWindow.webContents.send('ffmpeg-convert-progress', {
            path: pathToSourceFile,
            percent: progress,
          });
        }
      },
      onSuccess: () => {
        resolve('success');
        mainWindow.webContents.send('ffmpeg-convert-success', {
          path: pathToSourceFile,
          target: pathTarget,
          percent: 100,
        });
      },
      onError: (error: Error) => {
        reject(error);
      },
    });
  });
}

export function anyToMP4ByCustomShell(
  filePath: string,
  configuration: any
): Promise<string> {
  return new Promise((resolve, reject) => {
    const pathToSourceFile = path.resolve(filePath);
    const pathTarget = parseFilePath(filePath, '.mp4', 'converted');
    const command = configuration.shell
      .replace('ffmpeg', `${ffmpegPath}`)
      .replace('inputfile', pathToSourceFile)
      .replace('outputfile', pathTarget);
    runScript({
      command,
      args: [],
      onProgress: (data: string) => {
        const progress = getProgress(data);
        if (filterProgress(progress)) {
          mainWindow.webContents.send('ffmpeg-convert-progress', {
            path: pathToSourceFile,
            percent: progress,
          });
        }
      },
      onSuccess: () => {
        resolve('success');
        mainWindow.webContents.send('ffmpeg-convert-success', {
          path: pathToSourceFile,
          target: pathTarget,
          percent: 100,
        });
      },
      onError: (error: Error) => {
        reject(error);
      },
    });
  });
}

// 水印位置
const WATERMARK_PLACEMENT_MAP = {
  center:
    '-filter_complex "[1]colorchannelmixer=aa={opacity},scale=iw*{watermarkWidthPercent}:-1[wm];[0][wm]overlay=(main_w-overlay_w)/2:(main_h-overlay_h)/2" -codec:a copy',
  leftTop:
    '-filter_complex "[1]colorchannelmixer=aa={opacity},scale=iw*{watermarkWidthPercent}:-1[wm];[0][wm]overlay=10:10" -codec:a copy',
  rightTop:
    '-filter_complex "[1]colorchannelmixer=aa={opacity},scale=iw*{watermarkWidthPercent}:-1[wm];[0][wm]overlay=main_w-overlay_w-10:10" -codec:a copy',
  leftBottom:
    '-filter_complex "[1]colorchannelmixer=aa={opacity},scale=iw*{watermarkWidthPercent}:-1[wm];[0][wm]overlay=10:main_h-overlay_h" -codec:a copy',
  rightBottom:
    '-filter_complex "[1]colorchannelmixer=aa={opacity},scale=iw*{watermarkWidthPercent}:-1[wm];[0][wm]overlay=main_w-overlay_w-10:main_h-overlay_h-10" -codec:a copy',
};

function getWatermarkScript(
  placement: FFmpegWatermarkConfiguration['placement'],
  opacity: number,
  watermarkWidthPercent: number
) {
  return WATERMARK_PLACEMENT_MAP[placement]
    .replace('{opacity}', String(opacity))
    .replace('{watermarkWidthPercent}', watermarkWidthPercent.toFixed(2));
}

// 添加水印
export function addWatermark(
  inputVideoPath: string,
  inputImagePath: string,
  placement: FFmpegWatermarkConfiguration['placement'],
  opacity: number,
  watermarkWidthPercent: number
) {
  return new Promise((resolve, reject) => {
    const pathInputVideo = path.resolve(inputVideoPath);
    const pathInputImage = path.resolve(inputImagePath);
    const pathTarget = parseFilePath(
      inputVideoPath,
      path.parse(inputVideoPath).ext,
      'watermark'
    );
    const command = `${ffmpegPath} -y -i "${pathInputVideo}" -i ${pathInputImage} ${getWatermarkScript(
      placement,
      opacity,
      watermarkWidthPercent
    )} "${pathTarget}"`;
    runScript({
      command,
      args: [],
      onProgress: (data: string) => {
        const progress = getProgress(data);
        if (filterProgress(progress)) {
          mainWindow.webContents.send('ffmpeg-convert-progress', {
            path: pathInputVideo,
            percent: progress,
          });
        }
      },
      onSuccess: () => {
        resolve('success');
        mainWindow.webContents.send('ffmpeg-convert-success', {
          path: pathInputVideo,
          target: pathTarget,
          percent: 100,
        });
      },
      onError: (error: Error) => {
        reject(error);
      },
    });
  });
}
