import { FC, useEffect, useState, useRef } from 'react';
import {
  Button,
  Modal,
  Progress,
  Space,
  Form,
  Select,
  Card,
  Typography,
  Popover,
  InputNumber,
  message,
} from 'antd';
import { useNavigate } from 'react-router-dom';
import { CheckCircleTwoTone, FileAddOutlined } from '@ant-design/icons';
import type { FFmpegConfiguration, FileItem } from 'renderer/preload';
import { humanFileSize } from 'renderer/utils/utils';
import style from './style.module.scss';
import { FRAME_RATE_LIST, SCREEN_SIZE_LIST } from './constants';
import PixelSetting from './PixelSetting';

interface ConvertFileItem extends FileItem {
  percent?: number;
}

export interface ProgressData {
  path: string;
  target: string;
  percent: number;
}

interface ConfigurationState {
  isShowing: boolean;
}

const FFmpeg: FC = () => {
  const [convertFiles, setConvertFiles] = useState<ConvertFileItem[]>([]);
  const [configuration, setConfigurations] = useState<ConfigurationState>({
    isShowing: false,
  });

  const convertFileTotalNum = useRef(convertFiles.length);
  const convertedFileNum = useRef(0);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  useEffect(() => {
    const progressEvent = window.electron.ipcRenderer.on(
      'ffmpeg-convert-progress',
      (data) => {
        console.log('ffmpeg-convert-progress', data as ProgressData);
        const progressData = data as ProgressData;
        setConvertFiles((prev) =>
          prev.map((file) =>
            file.path === progressData.path
              ? { ...file, percent: progressData.percent }
              : file
          )
        );
      }
    );

    // 子进程关闭时会调用
    const successEvent = window.electron.ipcRenderer.on(
      'ffmpeg-convert-success',
      (data) => {
        const progressData = data as ProgressData;
        setConvertFiles((prev) =>
          prev.map((file) =>
            file.path === progressData.path
              ? { ...file, percent: progressData.percent }
              : file
          )
        );
        // 校验是否全部文件都转换完成
        convertedFileNum.current += 1;
        console.log(
          'ffmpeg-convert-success',
          convertedFileNum.current,
          convertFileTotalNum.current
        );
        if (convertedFileNum.current >= convertFileTotalNum.current) {
          Modal.confirm({
            icon: <CheckCircleTwoTone />,
            content: <div>视频转换成功</div>,
            okText: '打开文件夹',
            cancelText: '取消',
            onOk() {
              window.electron.shell.showItemInFolder(progressData.target);
            },
            onCancel() {
              Modal.destroyAll();
            },
          });
          setConvertFiles([]);
          convertFileTotalNum.current = 0;
          convertedFileNum.current = 0;
        }
      }
    );
    return () => {
      progressEvent?.();
      successEvent?.();
    };
  }, []);

  // 选择文件
  const handleSelectFile = async () => {
    const files = await window.electron.ffmpeg.readFile({
      type: 'video',
      isMultiple: true,
    });
    setConvertFiles(files);
    convertFileTotalNum.current = files.length;
    convertedFileNum.current = 0;
  };

  // 转换文件
  const handleConvert = async (targetType: 'mp4' | 'gif') => {
    if (!convertFiles?.length) {
      message.warn('请先选择视频');
      return;
    }
    const config: FFmpegConfiguration = {};
    if (configuration.isShowing) {
      const { compressRatio, frameRate, screenSize, customScreenSize } =
        await form.validateFields();
      config.compressRatio = compressRatio ?? 28;
      if (frameRate !== -1) config.frameRate = frameRate;
      if (screenSize !== -1 && screenSize !== 'custom')
        config.screenSize = screenSize;
      if (screenSize === 'custom') {
        const { width, height } = customScreenSize;
        if (width && height) config.screenSize = `${width}:${height}`;
        if (!width && height) config.screenSize = `-2:${height}`;
        if (width && !height) config.screenSize = `${width}:-2`;
      }
    }
    message.info('正在处理，请稍候');
    await window.electron.ffmpeg.convertFiles(
      convertFiles.map((v) => v.path),
      targetType,
      Object.keys(config).length ? config : undefined
    );
  };

  return (
    <div className={style.ffmpeg}>
      <div className="mb20 back-row">
        <h2>视频转MP4</h2>
        <Button className="back-btn" onClick={() => navigate('/')}>
          返回首页
        </Button>
      </div>
      <div>
        <Space className="mb20">
          <Button
            type="primary"
            onClick={handleSelectFile}
            className="choose-file-btn"
          >
            <FileAddOutlined />
            选择视频文件
          </Button>
          <Button
            onClick={() => {
              if (configuration.isShowing) {
                form.resetFields();
              }
              setConfigurations((prev) => ({ isShowing: !prev.isShowing }));
            }}
          >
            参数配置（{configuration.isShowing ? '启用' : '未启用'}）
          </Button>
        </Space>
        {configuration.isShowing && (
          <Card title="参数配置" className="mb20">
            <Form form={form} labelCol={{ span: 4 }}>
              <Form.Item
                name="compressRatio"
                label="压缩比例"
                extra="取值范围0-51，值越大表示压缩比例更高，文件更小但质量更差，推荐设置在18-28区间内"
                initialValue={28}
              >
                <InputNumber min={0} max={51} step={1} />
              </Form.Item>
              <Form.Item
                name="frameRate"
                label="帧率"
                extra="Change FPS (frames per second) of video"
                initialValue={-1}
              >
                <Select>
                  {FRAME_RATE_LIST.map((v) => (
                    <Select.Option key={v.value} value={v.value}>
                      {v.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item
                name="screenSize"
                label="分辨率"
                extra="Select a resolution for your video (width x height) in pixels."
                initialValue={-1}
              >
                <Select>
                  {SCREEN_SIZE_LIST.map((v) => (
                    <Select.Option key={v.value} value={v.value}>
                      {v.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item
                noStyle
                shouldUpdate={(prevValue, curValue) =>
                  prevValue.screenSize !== curValue.screenSize
                }
              >
                {({ getFieldValue }) =>
                  getFieldValue('screenSize') === 'custom' ? (
                    <Form.Item
                      name="customScreenSize"
                      label="自定义分辨率"
                      extra="Enter a video width and height (in pixels). If no width or no height is specified, we will keep the video's aspect ratio intact."
                      initialValue={{ width: undefined, height: undefined }}
                    >
                      <PixelSetting />
                    </Form.Item>
                  ) : null
                }
              </Form.Item>
            </Form>
          </Card>
        )}
        <Typography.Title level={4}>视频列表</Typography.Title>
        {convertFiles.map((v) => (
          <div key={v.path}>
            <Space size="large">
              <span>{v.path}</span>
              <span>{humanFileSize(v.size, true)}</span>
              <Popover
                content={
                  <div
                    style={{
                      whiteSpace: 'pre-wrap',
                      maxHeight: 300,
                      overflowY: 'auto',
                    }}
                  >
                    {v.metadata}
                  </div>
                }
                title={v.path}
              >
                <Button type="text">Metadata</Button>
              </Popover>
            </Space>
            <Progress percent={v.percent} size="small" />
          </div>
        ))}
      </div>
      <Space className="mt10" direction="vertical">
        <Button type="primary" onClick={() => handleConvert('mp4')}>
          转为 mp4
        </Button>
        <Space className="tips" direction="vertical" size="small">
          <div>提示：</div>
          <div>
            1. 转换文件会保存到相同目录下，文件名称为原始文件名_converted
          </div>
        </Space>
      </Space>
    </div>
  );
};

export default FFmpeg;
