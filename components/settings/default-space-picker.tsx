"use client"

import { useTransition } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { setDefaultSpace } from "@/app/actions/space"
import { setDemoSpaceId } from "@/app/actions/demo"
import type { Space } from "@/lib/types"

interface DefaultSpacePickerProps {
  spaces: Space[]
  defaultSpaceId: string | null
  isDemo?: boolean
}

export function DefaultSpacePicker({ spaces, defaultSpaceId, isDemo = false }: DefaultSpacePickerProps) {
  const [isPending, startTransition] = useTransition()

  function handleChange(spaceId: string) {
    startTransition(async () => {
      if (isDemo) {
        await setDemoSpaceId(spaceId)
      } else {
        await setDefaultSpace(spaceId)
      }
    })
  }

  if (spaces.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No spaces configured yet. Set one up in the Space Builder tab.
      </p>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <Select
        value={defaultSpaceId ?? undefined}
        onValueChange={handleChange}
        disabled={isPending}
      >
        <SelectTrigger className="w-64">
          <SelectValue placeholder="Select a space…" />
        </SelectTrigger>
        <SelectContent>
          {spaces.map(s => (
            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isPending && <span className="text-xs text-muted-foreground">Saving…</span>}
    </div>
  )
}
