import { useState } from 'react';
import type { FC } from 'react';
import { Tag } from 'antd';
import { FFmpegWatermarkConfiguration } from 'renderer/preload';
import { watermarkPlacementList } from './constants';

interface IProps {
  value: FFmpegWatermarkConfiguration['placement'];
  onChange: (value: IProps['value']) => void;
}

const Placement: FC<any> = ({ value, onChange }: IProps) => {
  const [val, setVal] = useState(value || 'center');

  function triggerChange(curVal: IProps['value']) {
    onChange(curVal);
  }

  return (
    <div>
      {watermarkPlacementList.map((v) => (
        <Tag
          key={v.value}
          color={val === v.value ? 'blue' : undefined}
          onClick={() => {
            const curVal = v.value as FFmpegWatermarkConfiguration['placement'];
            setVal(curVal);
            triggerChange(curVal);
          }}
        >
          {v.label}
        </Tag>
      ))}
    </div>
  );
};

export default Placement;
