"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Upload, X, AlertCircle, CheckCircle2 } from "lucide-react"
import { toast } from "react-hot-toast"
import { uploadToCloudinary, formatFileSize } from "@/lib/cloudinary-upload"

interface XrayFileUploadProps {
  onUploadSuccess: (url: string, fileName: string) => void
  isLoading?: boolean
}

export function XrayFileUpload({ onUploadSuccess, isLoading = false }: XrayFileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const MAX_FILE_SIZE = 1024 * 1024 // 1MB

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const validateFile = (file: File): boolean => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`File size must be less than 1MB. Your file is ${formatFileSize(file.size)}`)
      return false
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only JPEG, PNG, GIF, and WebP images are allowed")
      return false
    }

    return true
  }

  const handleFileSelect = async (file: File) => {
    if (!validateFile(file)) {
      return
    }

    setSelectedFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select a file first")
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 30, 90))
      }, 200)

      const url = await uploadToCloudinary(selectedFile)

      clearInterval(progressInterval)
      setUploadProgress(100)

      toast.success("X-ray uploaded successfully!")
      onUploadSuccess(url, selectedFile.name)

      // Reset
      setTimeout(() => {
        setSelectedFile(null)
        setUploadProgress(0)
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
      }, 1000)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Drag and Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-lg p-4 sm:p-6 md:p-8 transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : selectedFile
              ? "border-accent bg-accent/5"
              : "border-primary bg-primary/2"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleInputChange}
          accept=".jpg,.jpeg,.png,.gif,.webp"
          disabled={uploading || isLoading}
          className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />

        <div className="flex flex-col items-center justify-center gap-2 sm:gap-3">
          {selectedFile ? (
            <>
              <CheckCircle2 className="w-8 sm:w-10 h-8 sm:h-10 text-accent" />
              <div className="text-center">
                <p className="font-semibold text-foreground text-sm sm:text-base truncate px-2">{selectedFile.name}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
              </div>
            </>
          ) : (
            <>
              <Upload className="w-8 sm:w-10 h-8 sm:h-10 text-muted-foreground" />
              <div className="text-center px-2">
                <p className="font-semibold text-foreground text-sm sm:text-base">Drag and drop your X-ray image</p>
                <p className="text-xs sm:text-sm text-muted-foreground">or click to browse (Max 1MB)</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* File Info */}
      {selectedFile && (
        <div className="bg-muted/50 rounded-lg p-2 sm:p-3 border border-border flex items-start justify-between gap-2 sm:gap-3">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <AlertCircle className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
            <div className="text-xs sm:text-sm min-w-0">
              <p className="font-medium text-foreground">Image ready to upload</p>
              <p className="text-xs text-muted-foreground">X-ray image file</p>
            </div>
          </div>
          <button
            onClick={() => {
              setSelectedFile(null)
              if (fileInputRef.current) {
                fileInputRef.current.value = ""
              }
            }}
            disabled={uploading || isLoading}
            className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 cursor-pointer flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Upload Progress */}
      {uploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="text-muted-foreground">Uploading...</span>
            <span className="font-medium text-foreground">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div className="bg-accent h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
          </div>
        </div>
      )}

      {/* Upload Button */}
      {selectedFile && !uploading && (
        <button
          onClick={handleUpload}
          disabled={uploading || isLoading}
          className="w-full bg-accent hover:bg-accent/90 disabled:bg-accent/50 text-accent-foreground px-3 sm:px-4 py-2 rounded-lg transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          Upload X-ray
        </button>
      )}
    </div>
  )
}
