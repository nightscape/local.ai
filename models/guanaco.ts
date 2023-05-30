import { LicenseType, type ModelMap, ModelType } from "./_shared"

export const guanacoModelMap: ModelMap = {
  "Guanaco 7B": {
    description: "A model fine-tuned using the QLoRA technique",
    modelType: ModelType.Llama,
    downloadUrl:
      "https://huggingface.co/TheBloke/guanaco-7B-GGML/resolve/main/guanaco-7B.ggmlv3.q5_1.bin",
    blake3: "7645c7c52071ef7bcd009e1485c036c318f85f14536565cf01a17e7c03b4cfba",
    sha256: "8ca43ccb8adadeaa9b9853dac2b1cdbad7b499c270c76ea448e1a97c64ed5a4e",
    vocabulary: ["JosephusCheung/Guanaco"],
    licenses: [LicenseType.Academic, LicenseType.NonCommercial],
    citation: ["https://arxiv.org/pdf/2305.14314.pdf"]
  }
}