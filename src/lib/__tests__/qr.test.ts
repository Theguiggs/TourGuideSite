import { getQrCodeUrl, getDeepLink } from '../qr';

describe('QR utilities', () => {
  it('should generate QR URL with tour path', () => {
    const url = getQrCodeUrl('ame-des-parfumeurs', 'grasse');
    const decoded = decodeURIComponent(url);
    expect(decoded).toContain('catalogue/grasse/ame-des-parfumeurs');
    expect(decoded).toContain('source=qr');
  });

  it('should include office param when provided', () => {
    const url = getQrCodeUrl('ame-des-parfumeurs', 'grasse', 'office-grasse-1');
    const decoded = decodeURIComponent(url);
    expect(decoded).toContain('office=office-grasse-1');
  });

  it('should not include office param when omitted', () => {
    const url = getQrCodeUrl('ame-des-parfumeurs', 'grasse');
    const decoded = decodeURIComponent(url);
    expect(decoded).not.toContain('office=');
  });

  it('should generate deep link with tour ID', () => {
    const link = getDeepLink('grasse-ame-parfumeurs');
    expect(link).toBe('tourguide://tour/grasse-ame-parfumeurs');
  });
});
