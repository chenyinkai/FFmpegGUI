import { CheckCircleTwoTone, FileAddOutlined } from '@ant-design/icons';
import {
  Button,
  Modal,
  Popover,
  Progress,
  Space,
  Typography,
  Tooltip,
  Form,
  Card,
  InputNumber,
  message,
} from 'antd';
import { FC, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileItem } from 'renderer/preload';
import { humanFileSize } from 'renderer/utils/utils';
import style from './style.module.scss';
import { ProgressData } from './FFmpeg';
import Placement from './WatermarkForm';

interface ConvertFileItem extends FileItem {
  percent?: number;
}

const Watermark: FC = () => {
  const [convertFiles, setConvertFiles] = useState<ConvertFileItem[]>([]);
  const [watermarkImg, setWatermarkImg] = useState<FileItem>({} as FileItem);

  const navigate = useNavigate();
  const convertFileTotalNum = useRef(convertFiles.length);
  const convertedFileNum = useRef(0);
  const [form] = Form.useForm();

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
            content: <div>添加水印成功</div>,
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
          setWatermarkImg({} as FileItem);
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

  // 选择视频
  const handleSelectFile = async () => {
    const files = await window.electron.ffmpeg.readFile({
      type: 'video',
      isMultiple: true,
    });
    setConvertFiles(files);
    convertFileTotalNum.current = files.length;
    convertedFileNum.current = 0;
  };

  // 选择图片
  const handleSelectLogo = async () => {
    const files = await window.electron.ffmpeg.readFile({
      type: 'image',
      isMultiple: false,
    });
    if (!files?.[0]?.path) return;
    setWatermarkImg(files?.[0]);
  };

  const handleConvert = async () => {
    try {
      if (!convertFiles?.length) {
        message.warn('请先选择视频');
        return;
      }
      if (!watermarkImg?.path) {
        message.warn('请先选择水印图片');
        return;
      }
      const { placement, opacity, widthPercent } = await form.validateFields();
      const watermarkImgWidth = JSON.parse(watermarkImg.metadata).streams[0]
        .width;
      let inputVideoConfigs = convertFiles.map((v) => ({
        path: v.path,
        watermarkWidthPercent: 1,
        opacity,
      }));
      if (widthPercent) {
        inputVideoConfigs = convertFiles.map((v) => {
          const { width } = JSON.parse(v.metadata).streams[0];
          return {
            path: v.path,
            opacity,
            watermarkWidthPercent:
              ((widthPercent / 100) * width) / watermarkImgWidth,
          };
        });
      }
      const params = {
        inputVideoConfigs,
        inputImagePath: watermarkImg.path,
        placement,
      };
      message.info('正在处理，请稍候');
      await window.electron.ffmpeg.addWatermark(params);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className={style.ffmpeg}>
      <div className="mb20 back-row">
        <h2>视频加水印</h2>
        <Button className="back-btn" onClick={() => navigate('/')}>
          返回首页
        </Button>
      </div>
      <div>
        <Card title="第一步：选择视频" className="mb20">
          <Button
            type="primary"
            onClick={handleSelectFile}
            className="choose-file-btn mb20"
          >
            <FileAddOutlined />
            选择本地视频文件
          </Button>
          <Typography.Title level={5}>待处理视频列表</Typography.Title>
          {convertFiles.map((v) => (
            <div key={v.path}>
              <Space size="large">
                <span>{v.path}</span>
                <span>{humanFileSize(v.size, true)}</span>
                <Tooltip title="尺寸">
                  {JSON.parse(v.metadata).streams[0]?.width} *
                  {JSON.parse(v.metadata).streams[0]?.height}
                </Tooltip>
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
        </Card>
        <Card title="第二步：选择水印图片" className="mb20">
          <Button
            type="primary"
            onClick={handleSelectLogo}
            className="choose-file-btn mb20"
          >
            <FileAddOutlined />
            选择水印图片
          </Button>
          <Space align="center">
            <Typography.Title level={5}>已选择图片路径：</Typography.Title>
            <div>{watermarkImg?.path}</div>
            {!!watermarkImg?.metadata && (
              <Tooltip title="尺寸">
                {JSON.parse(watermarkImg.metadata).streams[0]?.width} *
                {JSON.parse(watermarkImg.metadata).streams[0]?.height}
              </Tooltip>
            )}
          </Space>
        </Card>

        <Card title="第三步：参数配置" className="mb20">
          <Form form={form} labelCol={{ span: 4 }}>
            <Form.Item
              name="placement"
              label="选择水印位置"
              initialValue="center"
            >
              <Placement />
            </Form.Item>
            <Form.Item
              name="opacity"
              label="水印透明度"
              extra="取值范围 0-1"
              initialValue={1}
            >
              <InputNumber min={0} max={1} step={0.1} />
            </Form.Item>
            <Form.Item
              name="widthPercent"
              label="水印宽度"
              extra="请填写水印相对于视频宽度占比，取值范围1-100，不填写时取原图大小"
            >
              <InputNumber min={1} max={100} step={1} addonAfter="%" />
            </Form.Item>
          </Form>
        </Card>

        <Card title="第四步：确认添加" className="mb20">
          <Button type="primary" onClick={handleConvert}>
            添加水印
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default Watermark;
