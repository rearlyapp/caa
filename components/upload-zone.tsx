"use client"

import { useCallback, useState } from "react"
import { Upload, FileImage, Check, AlertCircle, Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface UploadedFile {
  name: string
  type: string
  url: string
  status: "pending" | "processing" | "done" | "error"
}

interface UploadZoneProps {
  label: string
  accept: string
  docType: "pan" | "aadhaar" | "photo" | "signature"
  file?: UploadedFile | null
  onFileSelect: (file: File, docType: string) => void
  onRemove?: () => void
}

export function UploadZone({
  label,
  accept,
  docType,
  file,
  onFileSelect,
  onRemove,
}: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile) {
        onFileSelect(droppedFile, docType)
      }
    },
    [onFileSelect, docType]
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0]
      if (selectedFile) {
        onFileSelect(selectedFile, docType)
      }
    },
    [onFileSelect, docType]
  )

  if (file) {
    return (
      <div className="relative flex items-center gap-3 rounded-lg border bg-card p-4">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            file.status === "done" && "bg-success/10",
            file.status === "processing" && "bg-warning/10",
            file.status === "error" && "bg-destructive/10",
            file.status === "pending" && "bg-muted"
          )}
        >
          {file.status === "done" && (
            <Check className="h-5 w-5 text-success" />
          )}
          {file.status === "processing" && (
            <Loader2 className="h-5 w-5 animate-spin text-warning" />
          )}
          {file.status === "error" && (
            <AlertCircle className="h-5 w-5 text-destructive" />
          )}
          {file.status === "pending" && (
            <FileImage className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {label}
          </p>
          <p className="text-xs text-muted-foreground truncate">{file.name}</p>
        </div>
        {onRemove && (
          <button
            onClick={onRemove}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label={`Remove ${label}`}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    )
  }

  return (
    <label
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors",
        isDragOver
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50 hover:bg-muted/50"
      )}
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragOver(true)
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
        <Upload className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Drop file or click to browse
        </p>
      </div>
      <input
        type="file"
        className="sr-only"
        accept={accept}
        onChange={handleChange}
      />
    </label>
  )
}
