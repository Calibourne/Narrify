// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import Home from '@/app/page'

vi.mock('@/lib/parsers', () => ({
  selectParser: vi.fn(),
}))

import { selectParser } from '@/lib/parsers'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  localStorage.clear()
})

function renderAndSelectFile(filename = 'sample.fb2') {
  const { container } = render(<Home />)
  const input = container.querySelector('input[type="file"]') as HTMLInputElement
  const file = new File(['hello'], filename, { type: 'text/xml' })
  fireEvent.change(input, { target: { files: [file] } })
  return { container, file }
}

test('shows error message when parser throws', async () => {
  vi.mocked(selectParser).mockReturnValue({
    parse: () => Promise.reject(new Error('File is corrupted')),
  })

  renderAndSelectFile()
  fireEvent.click(screen.getByRole('button', { name: 'Parse Book' }))

  await waitFor(() => {
    expect(screen.getByText('File is corrupted')).toBeInTheDocument()
  })
})

