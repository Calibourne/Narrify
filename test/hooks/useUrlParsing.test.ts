/** @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useUrlParsing } from '@/hooks/useUrlParsing'

describe('useUrlParsing', () => {
  it('should initialize with correct default state', () => {
    const onChapters = vi.fn()
    const onError = vi.fn()
    const { result } = renderHook(() => useUrlParsing(onChapters, onError))

    expect(result.current.state).toEqual({
      tag: 'idle',
      url: '',
      pickerTexts: [],
      checked: new Set(),
      pasteText: '',
    })
  })

  it('should update url', () => {
    const { result } = renderHook(() => useUrlParsing(vi.fn(), vi.fn()))
    act(() => {
      result.current.setUrl('https://example.com')
    })
    expect(result.current.state.url).toBe('https://example.com')
  })

  it('should update tag', () => {
    const { result } = renderHook(() => useUrlParsing(vi.fn(), vi.fn()))
    act(() => {
      result.current.setTag('loading')
    })
    expect(result.current.state.tag).toBe('loading')
  })

  it('should update state partially', () => {
    const { result } = renderHook(() => useUrlParsing(vi.fn(), vi.fn()))
    act(() => {
      result.current.updateState({ tag: 'picker', html: '<div>test</div>' })
    })
    expect(result.current.state.tag).toBe('picker')
    expect(result.current.state.html).toBe('<div>test</div>')
  })

  it('should toggle checked index', () => {
    const { result } = renderHook(() => useUrlParsing(vi.fn(), vi.fn()))
    
    // Check
    act(() => {
      result.current.setChecked(1)
    })
    expect(result.current.state.checked.has(1)).toBe(true)

    // Uncheck
    act(() => {
      result.current.setChecked(1)
    })
    expect(result.current.state.checked.has(1)).toBe(false)
  })

  it('should reset state', () => {
    const { result } = renderHook(() => useUrlParsing(vi.fn(), vi.fn()))
    act(() => {
      result.current.setUrl('https://example.com')
      result.current.setTag('loading')
      result.current.reset()
    })
    expect(result.current.state).toEqual({
      tag: 'idle',
      url: '',
      pickerTexts: [],
      checked: new Set(),
      pasteText: '',
    })
  })
})
