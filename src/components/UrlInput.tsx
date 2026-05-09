'use client'
import type { useUrlParsing } from '@/hooks/useUrlParsing'
import UrlInputSidebar from './UrlInputSidebar'

type Props = {
  urlParsing: ReturnType<typeof useUrlParsing>
  disabled: boolean
}

export default function UrlInput({ urlParsing, disabled }: Props) {
  const {
    state,
    setUrl,
    handleGo,
    dubText,
    reset,
    setTag,
  } = urlParsing

  return (
    <UrlInputSidebar
      state={state}
      setUrl={setUrl}
      onGo={handleGo}
      onDub={dubText}
      onCancel={reset}
      onSwitchMode={(mode) => setTag(mode)}
      disabled={disabled}
    />
  )
}
