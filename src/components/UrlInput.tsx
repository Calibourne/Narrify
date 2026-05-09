'use client'
import { useUrlParsing } from '@/hooks/useUrlParsing'
import UrlInputSidebar from './UrlInputSidebar'
import UrlInputMain from './UrlInputMain'
import type { Chapter } from '@/lib/parsers/types'

type Props = {
  onChapters: (chapters: Chapter[]) => void
  onError: (msg: string) => void
  disabled: boolean
}

export default function UrlInput({ onChapters, onError, disabled }: Props) {
  const {
    state,
    setUrl,
    handleGo,
    dubText,
    reset,
    setTag,
    setChecked,
    setPickerTexts,
    loadChecklist,
    setPasteText,
  } = useUrlParsing(onChapters, onError)

  return (
    <div>
      <UrlInputSidebar
        state={state}
        setUrl={setUrl}
        onGo={handleGo}
        onDub={dubText}
        onCancel={reset}
        onSwitchMode={(mode) => setTag(mode)}
        disabled={disabled}
      />
      <UrlInputMain
        state={state}
        setChecked={setChecked}
        setPickerTexts={setPickerTexts}
        onLoadChecklist={loadChecklist}
        setPasteText={setPasteText}
        onDub={dubText}
      />
    </div>
  )
}
