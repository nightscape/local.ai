import { useCallback, useEffect, useState } from "react"

import { type ValidCommand, invoke } from "~features/invoke"
import type { FileInfo } from "~features/model-downloader/model-file"

export const createFileConfigStore =
  <T>(getterCommand: ValidCommand, setterCommand: ValidCommand) =>
  (file: FileInfo, defaultData?: T) => {
    const [data, _setData] = useState<T>(defaultData)

    useEffect(() => {
      invoke(getterCommand, {
        path: file.path
      })
        .then(_setData)
        .catch((_) => {
          _setData(defaultData)
        })
    }, [file?.path])

    const update = useCallback(
      async (newValue: Partial<T>) => {
        _setData((cc) => ({
          ...cc,
          ...newValue
        }))

        await invoke(setterCommand, {
          path: file.path,
          config: {
            ...data,
            ...newValue
          }
        })
      },
      [file?.path, data]
    )

    return {
      data,
      update
    }
  }
