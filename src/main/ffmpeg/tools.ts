// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
let previousFram = 0;

// 字符转对象
export const parseProgressLine = (line) => {
  const progress = {};

  // Remove all spaces after = and trim
  // eslint-disable-next-line no-param-reassign
  line = line.replace(/=\s+/g, '=').trim();
  const progressParts: string[] = line.split(' ');

  // Split every progress part by "=" to get key and value
  for (let i = 0; i < progressParts.length; i += 1) {
    const progressSplit = progressParts[i].split('=', 2);
    const key = progressSplit[0];
    const value = progressSplit[1];

    // This is not a progress line
    if (typeof value === 'undefined') return null;

    progress[key] = value;
  }

  return progress;
};

// 获取进度
export const getProgress = (line) => {
  const { frame } = parseProgressLine(line.toString()) || {};
  if (frame) {
    const progress = Number(((previousFram / +frame) * 100).toFixed(2));
    previousFram = frame;
    return progress;
  }
  return 0;
};

// 筛选有效进度
export function filterProgress(progress: number) {
  if (progress > 0 && progress <= 100) return progress;
  return null;
}

export async function runPromiseByQueue(tasks: Promise[]) {
  // eslint-disable-next-line no-restricted-syntax
  for (const task of tasks) {
    // eslint-disable-next-line no-await-in-loop
    await task();
  }
}
