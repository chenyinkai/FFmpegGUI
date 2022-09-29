import { Button, Space } from 'antd';
import { FC } from 'react';
import { useNavigate } from 'react-router-dom';

const Home: FC = () => {
  const navigate = useNavigate();

  return (
    <Space direction="vertical">
      <h1>FFmpegGUI</h1>
      <Space>
        <Button type="primary" onClick={() => navigate('/convert/mp4')}>
          视频转MP4
        </Button>
        <Button type="primary" onClick={() => navigate('/watermark')}>
          视频加水印
        </Button>
      </Space>
    </Space>
  );
};

export default Home;
