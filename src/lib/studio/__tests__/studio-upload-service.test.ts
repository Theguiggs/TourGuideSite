/**
 * Tests for StudioUploadService — upload audio/photo, validation, cache, retry.
 */

jest.mock('aws-amplify/storage', () => ({
  uploadData: jest.fn(),
  getUrl: jest.fn(),
}));

import { uploadData, getUrl } from 'aws-amplify/storage';
import { uploadAudio, uploadPhoto, getPlayableUrl, clearCache, _testExports } from '../studio-upload-service';

const mockUploadData = uploadData as jest.Mock;
const mockGetUrl = getUrl as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  clearCache();
});

describe('uploadAudio', () => {
  it('succeeds and returns s3Key', async () => {
    const blob = new Blob(['audio'], { type: 'audio/webm' });
    mockUploadData.mockReturnValue({ result: Promise.resolve({ path: 'guide-studio/sub/s1/audio/scene_0.webm' }) });

    const result = await uploadAudio(blob, 'session-1', 0);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.s3Key).toBe('guide-studio/sub/s1/audio/scene_0.webm');
    expect(mockUploadData).toHaveBeenCalledTimes(1);
  });

  it('accepts MIME with codec suffix (audio/webm;codecs=opus)', async () => {
    const blob = new Blob(['audio'], { type: 'audio/webm;codecs=opus' });
    mockUploadData.mockReturnValue({ result: Promise.resolve({ path: 'guide-studio/sub/s1/audio/scene_0.webm' }) });
    const result = await uploadAudio(blob, 'session-1', 0);
    expect(result.ok).toBe(true);
    expect(mockUploadData).toHaveBeenCalledTimes(1);
  });

  it('rejects unsupported MIME type without calling uploadData', async () => {
    const blob = new Blob(['text'], { type: 'text/plain' });
    const result = await uploadAudio(blob, 'session-1', 0);
    expect(result.ok).toBe(false);
    expect(mockUploadData).not.toHaveBeenCalled();
  });

  it('retries on failure and succeeds on 3rd attempt', async () => {
    const blob = new Blob(['audio'], { type: 'audio/webm' });
    let callCount = 0;
    mockUploadData.mockImplementation(() => {
      callCount++;
      if (callCount < 3) {
        return { result: Promise.reject(new Error('Network error')) };
      }
      return { result: Promise.resolve({ path: 'guide-studio/sub/s1/audio/scene_0.webm' }) };
    });

    const result = await uploadAudio(blob, 'session-1', 0);
    expect(result.ok).toBe(true);
    expect(callCount).toBe(3);
  });

  it('fails after 3 retries exhausted', async () => {
    const blob = new Blob(['audio'], { type: 'audio/webm' });
    mockUploadData.mockImplementation(() => ({
      result: Promise.reject(new Error('Network error')),
    }));

    const result = await uploadAudio(blob, 'session-1', 0);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('3 tentatives');
  });
});

describe('uploadPhoto', () => {
  it('succeeds and returns s3Key', async () => {
    const file = new File(['photo'], 'test.jpg', { type: 'image/jpeg' });
    mockUploadData.mockReturnValue({ result: Promise.resolve({ path: 'guide-studio/sub/s1/photos/scene_0_0.jpg' }) });

    const result = await uploadPhoto(file, 'session-1', 0, 0);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.s3Key).toBe('guide-studio/sub/s1/photos/scene_0_0.jpg');
  });

  it('rejects file exceeding 5MB without calling uploadData', async () => {
    // Create a fake file with size > 5MB
    const bigContent = new Uint8Array(6 * 1024 * 1024);
    const file = new File([bigContent], 'big.jpg', { type: 'image/jpeg' });
    const result = await uploadPhoto(file, 'session-1', 0, 0);
    expect(result.ok).toBe(false);
    expect(mockUploadData).not.toHaveBeenCalled();
  });
});

describe('getPlayableUrl', () => {
  it('returns cached URL on second call (no extra getUrl call)', async () => {
    mockGetUrl.mockResolvedValue({ url: new URL('https://s3.example.com/signed?token=abc') });

    const url1 = await getPlayableUrl('guide-studio/sub/s1/audio/scene_0.webm');
    const url2 = await getPlayableUrl('guide-studio/sub/s1/audio/scene_0.webm');

    expect(url1).toBe(url2);
    expect(mockGetUrl).toHaveBeenCalledTimes(1);
  });

  it('refreshes URL after cache TTL expires', async () => {
    mockGetUrl.mockResolvedValue({ url: new URL('https://s3.example.com/signed?token=old') });
    await getPlayableUrl('key-1');

    // Manually expire the cache entry
    const entry = _testExports.urlCache.get('key-1');
    if (entry) entry.expiresAt = Date.now() - 1000;

    mockGetUrl.mockResolvedValue({ url: new URL('https://s3.example.com/signed?token=new') });
    const url2 = await getPlayableUrl('key-1');

    expect(url2).toContain('token=new');
    expect(mockGetUrl).toHaveBeenCalledTimes(2);
  });
});
