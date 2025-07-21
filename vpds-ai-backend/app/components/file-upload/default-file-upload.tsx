/**
 *              © 2025 Visa
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 **/
import { Button, Input, InputContainer, Label, Utility } from '@visa/nova-react';
import { useId, useRef } from 'react';

const id = 'file-upload-default';
const fileInputRef = { current: null } as React.RefObject<HTMLInputElement>;
const handleChoose = () => fileInputRef.current?.click();
const handleChange = (e: any) => {
  const f = e.target.files?.[0];
  if (f) alert(`Selected: ${f.name}`);
};

export const DefaultFileUpload = () => {
  return (
    <Utility vFlex vFlexCol vGap={4}>
      <input
        ref={fileInputRef}
        id={id}
        type="file"
        style={{ display: 'none' }}
        onChange={handleChange}
      />

      <Label htmlFor={id}>Choose file</Label>
      <InputContainer>
        <Input
          id={`${id}-display`}
          type="text"
          readOnly
          placeholder="No file chosen"
          onClick={handleChoose}
          value={fileInputRef.current?.files?.[0]?.name ?? ''}
        />
      </InputContainer>

      <Button onClick={handleChoose}>Upload</Button>
    </Utility>
  );
};
