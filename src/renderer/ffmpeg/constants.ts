export const FRAME_RATE_LIST = [
  {
    label: '保持不变',
    value: -1,
  },
  ...[1, 2, 5, 10, 12, 15, 20, 23.976, 25, 29.97, 50, 59.94].map((v) => ({
    label: `${v} fps`,
    value: v,
  })),
];

export const SCREEN_SIZE_LIST = [
  {
    label: '保持不变',
    value: -1,
  },
  {
    label: '320*240(240p)',
    value: '320:240',
  },
  {
    label: '480*320(320p)',
    value: '480:320',
  },
  {
    label: '640*480(480p)',
    value: '640:480',
  },
  {
    label: '1280*720(720p)',
    value: '1280:720',
  },
  {
    label: '1920*1080(1080p)',
    value: '1920:1080',
  },
  {
    label: '2560*1440(1440p)',
    value: '2560:1440',
  },
  {
    label: '自定义',
    value: 'custom',
  },
];

export const watermarkPlacementList = [
  {
    label: '居中',
    value: 'center',
  },
  {
    label: '左上',
    value: 'leftTop',
  },
  {
    label: '右上',
    value: 'rightTop',
  },
  {
    label: '左下',
    value: 'leftBottom',
  },
  {
    label: '右下',
    value: 'rightBottom',
  },
];
