import { cn } from "@localai/theme/utils"
import { SpinnerButton } from "@localai/ui/button"
import { Input } from "@localai/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@localai/ui/select"
import { ModelType, modelTypeList } from "@models/index"
import { TrashIcon } from "@radix-ui/react-icons"
import { confirm } from "@tauri-apps/api/dialog"
import { useState } from "react"

import { InvokeCommand, invoke } from "~features/invoke"
import { DownloadProgress } from "~features/model-downloader/download-progress"
import { DownloadState } from "~features/model-downloader/use-model-download"
import { useGlobal } from "~providers/global"
import { ModelLoadState, useModel } from "~providers/model"

const TestModelButton = () => {
  const { model } = useModel()

  const [isTesting, setIsTesting] = useState(false)

  return (
    <SpinnerButton
      className="text-yellow-9"
      isSpinning={isTesting}
      onClick={async () => {
        setIsTesting(true)
        await invoke(InvokeCommand.TestModel, {
          ...model
        })
        setIsTesting(false)
      }}>
      Test Model
    </SpinnerButton>
  )
}

export const ModelConfig = () => {
  const {
    modelsDirectoryState: { updateModelsDirectory }
  } = useGlobal()

  const {
    model,
    modelLoadState,
    launchCount,
    incrementLaunchCount,
    loadModel,
    downloadState,
    modelConfig
  } = useModel()

  if (!modelConfig.data) {
    return null
  }

  return (
    <div className="flex items-center justify-between w-full gap-2 group">
      {/* <Input
        placeholder="Label"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
      /> */}
      <div className="flex gap-3">
        <SpinnerButton
          className={cn(
            "w-10 p-1 justify-center",
            "group-hover:opacity-100 opacity-0 transition-opacity",
            downloadState === DownloadState.Downloading ? "hidden" : "flex"
          )}
          Icon={TrashIcon}
          onClick={async () => {
            if (!(await confirm(`Deleting ${model.name}?`))) {
              return
            }

            await invoke(InvokeCommand.DeleteModelFile, {
              path: model.path
            })

            await updateModelsDirectory()
          }}
          disabled={modelLoadState === ModelLoadState.Loaded}
        />
        <DownloadProgress />
      </div>
      <div className="flex items-center justify-end gap-2">
        {/* <TestModelButton /> */}
        <Input
          className="w-40"
          placeholder="Tokenizer"
          value={modelConfig.data.tokenizer}
          onChange={(e) =>
            modelConfig.update({
              tokenizer: e.target.value
            })
          }
        />

        <Select
          value={modelConfig.data.modelType}
          onValueChange={(v) =>
            modelConfig.update({
              modelType: v as ModelType
            })
          }>
          <SelectTrigger className={cn("text-gray-11", "w-24 relative")}>
            <label
              className={cn(
                "absolute -top-2 right-2 text-xs bg-gray-3 px-2 py-px rounded-md z-10"
              )}>
              Type
            </label>
            <SelectValue aria-label={modelConfig.data.modelType}>
              {modelConfig.data.modelType || "???"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="flex h-48 w-full">
            {modelTypeList.map((mt) => (
              <SelectItem key={mt} value={mt}>
                {mt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <SpinnerButton
          Icon={({ className }) => (
            <code
              className={cn(
                "flex items-center justify-center",
                "text-xs rounded-lg bg-gray-6 py-2 px-3",
                className
              )}>
              {launchCount}
            </code>
          )}
          isSpinning={modelLoadState === ModelLoadState.Loading}
          disabled={
            modelLoadState === ModelLoadState.Loaded ||
            (downloadState !== DownloadState.None &&
              downloadState !== DownloadState.Completed)
          }
          onClick={() => {
            incrementLaunchCount()
            loadModel()
          }}>
          {modelLoadState === ModelLoadState.Loaded ? "Loaded" : "Load Model"}
        </SpinnerButton>
      </div>
    </div>
  )
}
