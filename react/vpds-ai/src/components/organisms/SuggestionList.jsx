// src/components/organisms/SuggestionList.jsx
import React, { useState, useId } from 'react';
import {
  Banner, BannerCloseButton, BannerContent, BannerIcon,
  InputContainer, InputControl, Label, Select, Typography, Utility
} from '@visa/nova-react';
import { VisaChevronDownTiny } from '@visa/nova-icons-react';

/**
 * @param {{
 *   suggestions : { id:string, comp:string }[],
 *   meta        : Record<string, Record<string,string>>,   // components_detail_meta.json
 *   defaultMap  : Record<string, string>,                  // default_component_files_updated.json
 *   selections  : Record<string,string>,                   // The "currently selected variant"
 *   onChange    : (comp:string, variant:string)=>void      // Notify app updates
 * }} props
 */
export default function SuggestionList({
  suggestions, meta, defaultMap, selections, onChange,
}) {
  const [showBanner, setShowBanner] = useState(true);
  const idPrefix = useId();

  /* ----- Prompt for empty list ----- */
  if (!suggestions.length && showBanner) {
    return (
      <Utility vPaddingTop={32}>
        <Banner>
          <BannerIcon />
          <BannerContent className="v-pl-2 v-pb-2">
            <Typography variant="body-2-bold">No suggestions yet</Typography>
            <Typography>Please enter a prompt and click "Suggest Components"”".</Typography>
          </BannerContent>
          <BannerCloseButton onClick={() => setShowBanner(false)} />
        </Banner>
      </Utility>
    );
  }

  /* ----- Component List + Select ----- */
  return (
    <Utility vPaddingTop={24} vFlex vFlexWrap vGap={16}>

      {suggestions.map(({ id, comp }, index) => {
        const selectId = `${idPrefix}-${index}`;   // DOM id

        /* All variations (keys) */
        const variants = Object.keys(meta?.[comp] || {});

        /* default variations（Determined by defaultMap） */
        const defaultFile   = defaultMap?.[comp] || '';

        const defaultVariant = defaultFile.replace(/\.tsx$/i, '');

        /* If the user selection has been saved in current → selections, otherwise use defaultVariant */
        const current = selections[id] ?? defaultVariant;

        /* Make sure current must appear in the option list */
        const opts = variants.includes(current) ? variants : [current, ...variants];

        return (
          <Utility
            key={selectId}
            vFlex vFlexCol vGap={4}
            vMinWidth={200}
          >
            <Label
              htmlFor={selectId}
              style={{ color: '#0052CC', fontWeight: 600 }}
            >
              {comp}
            </Label>

            <InputContainer>
              <Select
                id={selectId}
                name={selectId}
                value={current}
                onChange={e => onChange(id, e.target.value)}
              >
                {opts.map(v => (
                  <option key={`${selectId}-${v}`} value={v}>
                    {v}
                  </option>
                ))}
              </Select>
              <InputControl><VisaChevronDownTiny /></InputControl>
            </InputContainer>
          </Utility>
        );
      })}
    </Utility>
  );
}
