// src/App.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';    // Keyboard navigation
import { nanoid } from 'nanoid';  // Create id for storing recent prompt and snippets
import {
  Button, ContentCard, ContentCardBody, ContentCardTitle, Label,
  InputContainer, Textarea, Utility, Accordion, AccordionHeading,
  AccordionPanel, AccordionToggleIcon, Typography
} from '@visa/nova-react';

import * as Nova from '@visa/nova-react';
import * as RRD  from 'react-router-dom';
import * as NovaIcons from '@visa/nova-icons-react'; 
import { useCombobox, useMultipleSelection  } from 'downshift';
import * as FUI from '@floating-ui/react';   

import { LiveProvider, LivePreview, LiveError } from 'react-live';
import HorizontalNav  from './components/organisms/HorizontalNav';
import SuggestionList from './components/organisms/SuggestionList';
import CodeViewer from './components/organisms/CodeViewer';
import './App.css';

import detailMeta   from './components_detail_meta.json';
import defaultFiles from './default_component_files_updated.json';

/* ---------------------- Backend API Portal ------------------------------ */
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/* -------------------------------- Helpers ------------------------------ */
const stripImportsExports = raw => {
  const removed = [];
  const kept = raw
    .split(/\r?\n/)
    .filter(line => {
      const t = line.trim();
      const drop =
      t.startsWith('import ') ||
      t.startsWith('export {') ||         
      (t.startsWith('export ') && t.includes(' from '));
      if (drop) removed.push(line);
      return !drop;
    })
    .map(line =>
      line.trim().startsWith('export ') ? line.replace(/^export\s+/, '') : line
    );

  console.groupCollapsed('%cstripImportsExports', 'color:#03a');
  console.table({ removedLines: removed });
  console.log('cleaned source:\n', kept.join('\n'));
  console.groupEnd();

  // call render() in noInline mode
  return kept.join('\n').trim() + '\n\nrender(<AssembledDemo />);';
};

const parseNamedImports = code => {
  const map = {};
  const re  = /import\s+{([^}]+)}\s+from\s+['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(code))) {
    const names = m[1].split(',').map(s => s.trim()).filter(Boolean);
    map[m[2]] = (map[m[2]] || []).concat(names);
  }
  return map;
};

// this is to save history in local browser
const HISTORY_KEY = 'vpds.history';
export const saveHistory = list =>
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 10)));
export const clearHistory = () => localStorage.removeItem(HISTORY_KEY);
/* ---------------------------------------------------------------------- */

export default function App() {
  const [prompt, setPrompt] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [variantSel , setVariantSel ] = useState({});
  const [assembledCode, setAssembledCode] = useState('');
  const [previewSrc, setPreviewSrc] = useState('');
  const [history, setHistory] = useState([]);     // set the history empty initially

  /* ------------------- dynamic scope ------------------- */
  const liveScope = useMemo(() => {
    if (!assembledCode) return { React };
    const imports = parseNamedImports(assembledCode);
    
    const pools   = {
      '@visa/nova-react': Nova,
      '@visa/nova-icons-react': NovaIcons,   
      'react-router-dom': RRD,
      'downshift': { useCombobox, useMultipleSelection },
      '@floating-ui/react': FUI,
    };

    const {
      useState: rUseState,
      useEffect: rUseEffect,
      useCallback: rUseCallback,
      useRef:   rUseRef,
      useMemo:  rUseMemo,
      useId:    rUseId,
    } = React;

    const scope = {
      React,
      useState : rUseState,
      useEffect: rUseEffect,
      useCallback: rUseCallback, 
      useRef   : rUseRef,
      useMemo  : rUseMemo,
      useId    : rUseId,
      ...Nova,
      ...NovaIcons,
      ...RRD,
      useCombobox,
      useMultipleSelection,
      ...FUI,
    };
    Object.assign(scope, Nova, RRD);
    Object.entries(imports).forEach(([mod, names]) => {
      const lib = pools[mod];
      if (!lib) return;
      names.forEach(n => lib[n] && (scope[n] = lib[n]));
    });

    console.groupCollapsed('%cliveScope build', 'color:#0a0');
    console.table(imports);
    console.log('scope keys:', Object.keys(scope));
    console.groupEnd();

    return scope;
  }, [assembledCode]);

  /* ------------------- previewSrc ---------------------- */
  useEffect(() => {
    const src = stripImportsExports(assembledCode);
    console.log('%cpreviewSrc =>\n','color:#f06', src);
    setPreviewSrc(src);
    clearHistory();
  }, [assembledCode]);

  /* ------------------- backend call -------------------- */
  const handleSuggest = async () => {
    if (!prompt.trim()) return;

    /* ---------- 1. set initial state empty ---------- */
    setSuggestions([]);
    setVariantSel({});
    setAssembledCode('');

    try {
      const res = await fetch(`${API_BASE}/suggest`, {
        method : 'POST',
        headers: { 'Content-Type':'application/json' },
        body   : JSON.stringify({ prompt }),
      });
      const data = await res.json();

      console.group('%cBackend response', 'color:#f90');
      console.log('components ->', data.components);
      console.log('assembledCode ->\n', data.assembled_code);
      console.groupEnd();

      /* ---------- 2. Render default code first ---------- */
      
      const withIds = data.components.map((c, i) => ({ id: `${c}-${i}`, comp:c }));

      setSuggestions(withIds);
      setAssembledCode(data.assembled_code);

      // —— save to History ——
      const newItem = {
        id: nanoid(),
        prompt,
        code: data.assembled_code,
        ts: Date.now(),
      };
      const next = [newItem, ...history].slice(0, 10);
      setHistory(next);
      saveHistory(next);

      /* ---------- 3. Initialize variantSel for different components ---------- */
      const initSel = {};
      
      withIds.forEach(({ id, comp }) => { 
        const defFile = defaultFiles?.[comp] || '';
        initSel[id] = defFile.replace(/\.tsx$/i, '');
      });
      setVariantSel(initSel);          

    } catch (err) {
      console.error(err);
      setAssembledCode('// Error fetching example code.');
    }
  };


  /* click Assemble New Code ——> /assemble */
  const handleAssemble = async () => {
    if (!Object.keys(variantSel).length) return;
    try {
      const res  = await fetch(`${API_BASE}/assemble`, {
        method : 'POST',
        headers: { 'Content-Type':'application/json' },
        body   : JSON.stringify({
          prompt,
          selections: variantSel,        // { input:'clear-button-input', ... }
        }),
      });
      const data = await res.json();
      setAssembledCode(data.assembled_code);
      const newItem = {
        id: nanoid(),
        prompt,
        code: data.assembled_code,
        ts: Date.now(),
      };
      const next = [newItem, ...history].slice(0, 10);
      setHistory(next);
      saveHistory(next);
    } catch (err) { console.error(err); }
  };

  useHotkeys('ctrl+enter', handleSuggest);
  useHotkeys('ctrl+shift+a', handleAssemble);
  

  /* ------------------- UI ------------------------------ */
  return (
    <div className="full-screen">
      <HorizontalNav />

      <div className="app-container">
        <Utility className="main-grid">
          {/* Prompt Column */}
          <div className="left-panel">
            <ContentCard className="card-fixed-height">
              <ContentCardBody>
                <ContentCardTitle variant="headline-4" style={{ color:'#0052CC' }}>
                  Describe UI
                </ContentCardTitle>
                <Utility vFlex vFlexCol vGap={16} vPaddingTop={8}>
                  <Utility vFlex vFlexCol vGap={4}>
                    <Label htmlFor="prompt-input">Your prompt</Label>
                    <InputContainer>
                      <Textarea
                        id="prompt-input"
                        rows={4}
                        placeholder="Describe the UI you'd like to build…"
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                      />
                    </InputContainer>
                  </Utility>
                  <Utility vAlignItems="center">
                    <Button onClick={handleSuggest} style={{ marginBottom: 4 }}>
                      Suggest Components
                    </Button>
                  </Utility>
                  {/* -------- Recent History -------- */}
                  {history.length > 0 && (
                    <Accordion style={{ marginTop: 4 }}>
                      <AccordionHeading 
                      buttonSize="medium"
                      style={{
                        background:'#fff',
                        color:'#0033A0',        
                        border:'1px solid #0033A0',
                      }}
                      >
                        <AccordionToggleIcon />
                        Recent Snippets
                      </AccordionHeading>

                      <AccordionPanel>
                        <Utility vFlex vFlexCol vGap={4}>
                          {history.map(item => (
                            <Button
                              key={item.id}
                              buttonSize="small"
                              colorScheme="secondary"
                              style={{ justifyContent:'flex-start' }}
                              onClick={() => {
                                setPrompt(item.prompt);
                                setAssembledCode(item.code);
                              }}
                            >
                              {new Date(item.ts).toLocaleString()} — {item.prompt}
                            </Button>
                          ))}
                        </Utility>
                      </AccordionPanel>
                    </Accordion>
                  )}
                </Utility>
              </ContentCardBody>
            </ContentCard>
          </div>

          {/* Suggestion List */}
          <ContentCard className="card-fixed-height">
            <ContentCardBody>
              <ContentCardTitle variant="headline-4" style={{ color:'#0052CC' }}>
                Output
              </ContentCardTitle>
              <SuggestionList
                suggestions={suggestions}
                meta={detailMeta}
                defaultMap={defaultFiles}
                selections={variantSel}
                onChange={(id, v) =>
                  setVariantSel(sel => ({ ...sel, [id]: v }))
                }
              />
              {/* ——— Assemble button ——— */}
              {suggestions.length > 0 && (
                <Utility vPaddingTop={16}>
                  <Button
                    colorScheme="primary"
                    buttonSize="small"
                    onClick={handleAssemble}
                  >
                  Assemble&nbsp;New&nbsp;Code
                  </Button>
                </Utility>
              )}

            </ContentCardBody>
            
          </ContentCard>
        </Utility>

        {/* ---- Live Preview + Code ---- */}
        <div style={{ marginTop:32 }}>
          <Accordion>
            <AccordionHeading buttonSize="large" colorScheme="secondary">
              <AccordionToggleIcon />
              Example Assembled Code
            </AccordionHeading>

            <AccordionPanel>
              {assembledCode ? (
                <>
                  {/* Add title above LivePreview */}
                  <Typography variant="headline-5" style={{ marginBottom: 12 }}>
                    {prompt}
                  </Typography>
                  <LiveProvider
                    key={previewSrc}
                    code={previewSrc}
                    scope={liveScope}
                    noInline         /* KEEP noInline */
                  >
                    <div className="preview-wrapper">
                      <LivePreview />
                      <LiveError style={{
                        color:'#c00',
                        background:'#fff5f5',
                        border:'1px solid #faa',
                        padding:8,
                        maxHeight:200,
                        overflow:'auto',
                        fontFamily:'monospace',
                        whiteSpace:'pre-wrap'
                      }} />
                    </div>
                  </LiveProvider>
                  <CodeViewer code={assembledCode} />
                </>
              ) : (
                <Typography>Waiting for suggestions…</Typography>
              )}
            </AccordionPanel>
          </Accordion>
        </div>
      </div>
    </div>
  );
}
