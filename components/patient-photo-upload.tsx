"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Upload, CheckCircle2 } from "lucide-react"
import { toast } from "react-hot-toast"
import { uploadToCloudinary, formatFileSize } from "@/lib/cloudinary-upload"

interface PatientPhotoUploadProps {
  onUploadSuccess: (url: string) => void
  isLoading?: boolean
}

export function PatientPhotoUpload({ onUploadSuccess, isLoading = false }: PatientPhotoUploadProps) {
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

      toast.success("Photo uploaded successfully!")
      onUploadSuccess(url)

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
    <div className="space-y-4">
      {/* Drag and Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-lg p-8 transition-colors ${
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
          accept="image/*"
          disabled={uploading || isLoading}
          className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />

        <div className="flex flex-col items-center justify-center gap-3">
          {selectedFile ? (
            <>
              <CheckCircle2 className="w-10 h-10 text-accent" />
              <div className="text-center">
                <p className="font-semibold text-foreground">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
              </div>
            </>
          ) : (
            <>
              <Upload className="w-10 h-10 text-muted-foreground" />
              <div className="text-center">
                <p className="font-semibold text-foreground">Drag and drop patient photo</p>
                <p className="text-sm text-muted-foreground">or click to browse (Max 1MB)</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Upload Progress */}
      {uploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
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
          className="w-full bg-accent hover:bg-accent/90 disabled:bg-accent/50 text-accent-foreground px-4 py-2 rounded-lg transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          Upload Photo
        </button>
      )}
    </div>
  )
}
