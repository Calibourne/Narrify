// @vitest-environment jsdom
import { render, screen, fireEvent, within } from '@testing-library/react'
import { vi, test, expect } from 'vitest'
import UploadZone from '@/components/UploadZone'

test('shows placeholder text', () => {
  const { container } = render(<UploadZone onFile={() => {}} disabled={false} />)
  const zone = container.querySelector('div')!
  expect(within(zone).getByText(/Drop .epub or .fb2/i)).toBeInTheDocument()
  expect(within(zone).getByText(/click to browse/i)).toBeInTheDocument()
})

test('calls onFile when a file is selected via input', () => {
  const onFile = vi.fn()
  const { container } = render(<UploadZone onFile={onFile} disabled={false} />)
  const input = container.querySelector('input[type="file"]') as HTMLInputElement
  const file = new File(['content'], 'book.epub', { type: 'application/epub+zip' })
  fireEvent.change(input, { target: { files: [file] } })
  expect(onFile).toHaveBeenCalledWith(file)
})

test('file input is disabled when disabled prop is true', () => {
  const { container } = render(<UploadZone onFile={() => {}} disabled={true} />)
  const input = container.querySelector('input[type="file"]') as HTMLInputElement
  expect(input).toBeDisabled()
})

test('calls onFile on drop', () => {
  const onFile = vi.fn()
  const { container } = render(<UploadZone onFile={onFile} disabled={false} />)
  const zone = container.querySelector('div')!
  const file = new File(['content'], 'book.fb2', { type: 'text/xml' })
  fireEvent.drop(zone, { dataTransfer: { files: [file] } })
  expect(onFile).toHaveBeenCalledWith(file)
})

test('does not call onFile on drop when disabled', () => {
  const onFile = vi.fn()
  const { container } = render(<UploadZone onFile={onFile} disabled={true} />)
  const zone = container.querySelector('div')!
  const file = new File(['content'], 'book.epub', { type: 'application/epub+zip' })
  fireEvent.drop(zone, { dataTransfer: { files: [file] } })
  expect(onFile).not.toHaveBeenCalled()
})
