import { Button, SpinnerButton } from "@localai/ui/button"
import { ReloadIcon } from "@radix-ui/react-icons"
import { invoke } from "@tauri-apps/api/tauri"
import { useEffect, useRef, useState } from "react"

import type { ModelMetadata } from "~pages"

export function ModelChecksum({ model }: { model: ModelMetadata }) {
  const [checksumHash, setChecksumHash] = useState("")
  const [isCalculating, setIsCalculating] = useState(false)
  const initializedRef = useRef(false)

  useEffect(() => {
    if (initializedRef.current) {
      return
    }
    initializedRef.current = true
    // get the models directory saved in config
    async function init() {
      setIsCalculating(true)
      const resp = await invoke<string>("get_cached_hash", {
        path: model.path
      }).catch(() => null)

      if (!!resp) {
        setChecksumHash(resp)
      }

      setIsCalculating(false)
    }
    init()
  }, [model])

  async function getChecksum() {
    setChecksumHash("")
    setIsCalculating(true)
    const resp = await invoke<string>("get_hash", {
      path: model.path
    })
    if (!!resp) {
      setChecksumHash(resp)
    }

    setIsCalculating(false)
  }

  return (
    <div className="flex justify-end text-xs text-gray-10 w-64">
      {checksumHash ? (
        <div className="flex gap-2">
          <ReloadIcon className="hover:text-gray-12" onClick={getChecksum} />
          <p>{checksumHash}</p>
        </div>
      ) : (
        <SpinnerButton
          isSpinning={isCalculating}
          className="text-xs"
          onClick={getChecksum}>
          {isCalculating ? "Calculating" : "Get Checksum"}
        </SpinnerButton>
      )}
    </div>
  )
}