import { FC, useEffect, useState, useRef } from 'react';
import {
  Button,
  Modal,
  Progress,
  Space,
  Form,
  Card,
  Typography,
  Popover,
  Input,
  message,
} from 'antd';
import { useNavigate } from 'react-router-dom';
import { CheckCircleTwoTone, FileAddOutlined } from '@ant-design/icons';
import type { FileItem } from 'renderer/preload';
import { humanFileSize } from 'renderer/utils/utils';
import style from './style.module.scss';

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

const Custom: FC = () => {
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
    const config: any = {};
    if (configuration.isShowing) {
      const { shell } = await form.validateFields();
      if (
        shell.indexOf('ffmpeg') === -1 ||
        shell.indexOf('inputfile') === -1 ||
        shell.indexOf('outputfile') === -1
      ) {
        message.warn('自定义脚本必须包含 ffmpeg, inputfile 和 outputfile 字符');
        return;
      }
      config.shell = shell;
    }
    message.info('正在处理，请稍候');
    await window.electron.ffmpeg.convertFilesByCustomShell(
      convertFiles.map((v) => v.path),
      targetType,
      Object.keys(config).length ? config : undefined
    );
  };

  return (
    <div className={style.ffmpeg}>
      <div className="mb20 back-row">
        <h2>自定义脚本-视频转换</h2>
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
                name="shell"
                label="shell"
                extra="确保 shell 脚本必须包含 ffmpeg, inputfile 和 outputfile 占位字符，应用会将占位字符替换为实际路径。示例：ffmpeg -i inputfile -o outputfile"
              >
                <Input />
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
          开始转换
        </Button>
        <Space className="tips" direction="vertical" size="small">
          <div>提示：</div>
          <div>
            1. 转换文件会保存到相同目录下，文件名称为原始文件名_converted 2.
          </div>
          <div>
            2.确保 shell 脚本必须包含 ffmpeg, inputfile 和 outputfile
            占位字符，应用会将占位字符替换为实际路径
          </div>
          <div>
            3. 示例1 提取透明通道，指定比特率可填入命令： ffmpeg -i inputfile
            -vf &quot;split [a], pad=iw*2:ih [b], [a] alphaextract, [b]
            overlay=w&quot; -b:v 1000k -maxrate 1000k -bufsize 2000k -y
            outputfile
          </div>
        </Space>
      </Space>
    </div>
  );
};

export default Custom;
