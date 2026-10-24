import { ImageResponse } from 'next/og';

export const alt =
  'ProfessionalResume.co.ke - Build a professional CV for Kenyan and international jobs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: '#ffffff',
          color: '#0f172a',
          fontFamily: 'Arial, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ width: 24, height: '100%', background: '#0052cc', display: 'flex' }} />
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '66px 76px 58px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
            <div
              style={{
                width: 82,
                height: 82,
                borderRadius: 16,
                background: '#0052cc',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 34,
                fontWeight: 800,
              }}
            >
              PR
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 34, fontWeight: 800 }}>ProfessionalResume.co.ke</div>
              <div style={{ marginTop: 6, fontSize: 20, color: '#475569' }}>
                Professional documents. Clear next steps.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 920 }}>
            <div style={{ fontSize: 62, lineHeight: 1.08, fontWeight: 800 }}>
              Build a CV that is ready for the opportunity.
            </div>
            <div style={{ marginTop: 24, fontSize: 26, lineHeight: 1.35, color: '#334155' }}>
              Kenya-ready CVs, cover letters, ATS checks, and career guidance for local and
              international roles.
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              fontSize: 20,
              fontWeight: 700,
            }}
          >
            <span style={{ display: 'flex', color: '#047857' }}>ATS-friendly templates</span>
            <span style={{ display: 'flex', color: '#c2410c' }}>•</span>
            <span style={{ display: 'flex', color: '#0052cc' }}>AI-assisted writing</span>
            <span style={{ display: 'flex', color: '#c2410c' }}>•</span>
            <span style={{ display: 'flex', color: '#334155' }}>Professional PDF export</span>
          </div>
        </div>
      </div>
    ),
    size
  );
}
