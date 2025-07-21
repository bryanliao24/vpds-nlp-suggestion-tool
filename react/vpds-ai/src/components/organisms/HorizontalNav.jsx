// src/components/organisms/HorizontalNav.jsx
import { Utility, Typography, Tabs, Tab, Button } from '@visa/nova-react';
import { VisaLogo } from '@visa/nova-react';

export default function HorizontalNav() {
  return (
    <Utility
      style={{
        position: 'sticky',
        top: 0,
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #D0D0D0',
        zIndex: 1000
      }}
    >
      <Utility
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '24px 32px'
        }}
      >
        {/* Left: VisaLogo + text */}
        <Utility style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <VisaLogo />
          <Typography variant="headline-3" style={{ color: '#0052CC' }}>
            Natural Language to Component Suggestion Assignment
          </Typography>
        </Utility>

    
      </Utility>
    </Utility>
  );
}
