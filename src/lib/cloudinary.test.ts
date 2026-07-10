// src/lib/cloudinary.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { uploadImage } from './cloudinary'

describe('uploadImage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('posts the file to Cloudinary and returns the secure URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ secure_url: 'https://res.cloudinary.com/demo/image/upload/abc.jpg' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const file = new File(['fake-bytes'], 'photo.jpg', { type: 'image/jpeg' })
    const url = await uploadImage(file)

    expect(url).toBe('https://res.cloudinary.com/demo/image/upload/abc.jpg')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [requestUrl, options] = fetchMock.mock.calls[0]
    expect(requestUrl).toContain('api.cloudinary.com')
    expect(options.method).toBe('POST')
  })

  it('throws when Cloudinary responds with an error status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }))

    const file = new File(['fake-bytes'], 'photo.jpg', { type: 'image/jpeg' })

    await expect(uploadImage(file)).rejects.toThrow('Cloudinary upload failed')
  })
})
