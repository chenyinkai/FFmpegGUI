import { useState } from 'react';
import type { FC } from 'react';
import { Input } from 'antd';

interface IProps {
  value: {
    width: string;
    height: string;
  };
  onChange: (value: IProps['value']) => void;
}

const PixelSetting: FC<any> = ({ value, onChange }: IProps) => {
  const [val, setVal] = useState(
    value || {
      width: undefined,
      height: undefined,
    }
  );

  function triggerChange(curVal: IProps['value']) {
    onChange(curVal);
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement>,
    key: 'width' | 'height'
  ) {
    const curVal = { ...val, [key]: e.target.value };
    setVal(curVal);
    triggerChange(curVal);
  }

  return (
    <div>
      <Input.Group compact>
        <Input
          style={{ width: 150 }}
          placeholder="width"
          value={value.width}
          onChange={(e) => handleChange(e, 'width')}
        />
        <Input
          style={{ width: 150 }}
          placeholder="height"
          value={value.height}
          onChange={(e) => handleChange(e, 'height')}
        />
      </Input.Group>
    </div>
  );
};

export default PixelSetting;
