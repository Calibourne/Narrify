// @vitest-environment jsdom
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import NarrationControls from '@/components/NarrationControls'

afterEach(cleanup)

describe('NarrationControls', () => {
  it('renders speed and pitch sliders', () => {
    render(<NarrationControls rate={0} pitch={0} onRateChange={vi.fn()} onPitchChange={vi.fn()} />)
    expect(screen.getByRole('slider', { name: /speed/i })).toBeInTheDocument()
    expect(screen.getByRole('slider', { name: /pitch/i })).toBeInTheDocument()
  })

  it('shows Normal label for both when rate=0 and pitch=0', () => {
    render(<NarrationControls rate={0} pitch={0} onRateChange={vi.fn()} onPitchChange={vi.fn()} />)
    expect(screen.getAllByText('Normal')).toHaveLength(2)
  })

  it('shows Fast label when rate is 20', () => {
    render(<NarrationControls rate={20} pitch={0} onRateChange={vi.fn()} onPitchChange={vi.fn()} />)
    expect(screen.getByText('Fast')).toBeInTheDocument()
  })

  it('shows Very Fast label when rate is 50', () => {
    render(<NarrationControls rate={50} pitch={0} onRateChange={vi.fn()} onPitchChange={vi.fn()} />)
    expect(screen.getByText('Very Fast')).toBeInTheDocument()
  })

  it('shows Slow label when rate is -20', () => {
    render(<NarrationControls rate={-20} pitch={0} onRateChange={vi.fn()} onPitchChange={vi.fn()} />)
    expect(screen.getByText('Slow')).toBeInTheDocument()
  })

  it('shows Very Slow label when rate is -50', () => {
    render(<NarrationControls rate={-50} pitch={0} onRateChange={vi.fn()} onPitchChange={vi.fn()} />)
    expect(screen.getByText('Very Slow')).toBeInTheDocument()
  })

  it('shows High pitch label when pitch is 15', () => {
    render(<NarrationControls rate={0} pitch={15} onRateChange={vi.fn()} onPitchChange={vi.fn()} />)
    expect(screen.getByText('High')).toBeInTheDocument()
  })

  it('shows Slightly Low pitch label when pitch is -5', () => {
    render(<NarrationControls rate={0} pitch={-5} onRateChange={vi.fn()} onPitchChange={vi.fn()} />)
    expect(screen.getByText('Slightly Low')).toBeInTheDocument()
  })

  it('shows Low pitch label when pitch is -15', () => {
    render(<NarrationControls rate={0} pitch={-15} onRateChange={vi.fn()} onPitchChange={vi.fn()} />)
    expect(screen.getByText('Low')).toBeInTheDocument()
  })

  it('shows Slightly High pitch label when pitch is 5', () => {
    render(<NarrationControls rate={0} pitch={5} onRateChange={vi.fn()} onPitchChange={vi.fn()} />)
    expect(screen.getByText('Slightly High')).toBeInTheDocument()
  })

  it('calls onRateChange with numeric value when speed slider changes', () => {
    const onRateChange = vi.fn()
    render(<NarrationControls rate={0} pitch={0} onRateChange={onRateChange} onPitchChange={vi.fn()} />)
    fireEvent.change(screen.getByRole('slider', { name: /speed/i }), { target: { value: '30' } })
    expect(onRateChange).toHaveBeenCalledWith(30)
  })

  it('calls onPitchChange with numeric value when pitch slider changes', () => {
    const onPitchChange = vi.fn()
    render(<NarrationControls rate={0} pitch={0} onRateChange={vi.fn()} onPitchChange={onPitchChange} />)
    fireEvent.change(screen.getByRole('slider', { name: /pitch/i }), { target: { value: '-5' } })
    expect(onPitchChange).toHaveBeenCalledWith(-5)
  })

  it('displays positive rate with + prefix', () => {
    render(<NarrationControls rate={20} pitch={0} onRateChange={vi.fn()} onPitchChange={vi.fn()} />)
    expect(screen.getByText('+20%')).toBeInTheDocument()
  })

  it('displays negative rate without + prefix', () => {
    render(<NarrationControls rate={-15} pitch={0} onRateChange={vi.fn()} onPitchChange={vi.fn()} />)
    expect(screen.getByText('-15%')).toBeInTheDocument()
  })

  it('displays positive pitch with + prefix and Hz unit', () => {
    render(<NarrationControls rate={0} pitch={5} onRateChange={vi.fn()} onPitchChange={vi.fn()} />)
    expect(screen.getByText('+5Hz')).toBeInTheDocument()
  })

  it('displays negative pitch without + prefix and Hz unit', () => {
    render(<NarrationControls rate={0} pitch={-10} onRateChange={vi.fn()} onPitchChange={vi.fn()} />)
    expect(screen.getByText('-10Hz')).toBeInTheDocument()
  })
})
