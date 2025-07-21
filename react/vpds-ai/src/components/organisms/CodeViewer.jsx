// src/components/organisms/CodeViewer.jsx
import React, { useState } from 'react';
import { Button } from '@visa/nova-react';
import {
  VisaCopyHigh        as CopyIcon,
  GenericCheckmarkTiny as CheckIcon,
} from '@visa/nova-icons-react';

export default function CodeViewer({ code }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Copy failed:', e);
    }
  };

  return (
    <div className="code-wrapper">
      {/* code block */}
      <pre className="code-block">{code}</pre>

      {/* copy button */}
      <Button
        title={copied ? 'Copied!' : 'Copy code'}   
        iconOnly
        aria-label="Copy code"
        buttonSize="small"
        colorScheme={copied ? 'success' : 'secondary'}
        className="copy-btn"
        onClick={handleCopy}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </Button>
    </div>
  );
}
