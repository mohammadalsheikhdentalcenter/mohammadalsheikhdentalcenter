"use client"

import { useState } from "react"
import { X, Download, FileText, ImageIcon } from "lucide-react"

interface XrayDisplayViewerProps {
  imageUrl: string
  title: string
  type: "xray" | "photo" | "scan"
  description?: string
  notes?: string
  uploadedBy?: string
  uploadedAt?: string
  onClose: () => void
}

export function XrayDisplayViewer({
  imageUrl,
  title,
  type,
  description,
  notes,
  uploadedBy,
  uploadedAt,
  onClose,
}: XrayDisplayViewerProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isDownloading, setIsDownloading] = useState(false)
  const isPdf = imageUrl?.toLowerCase().includes(".pdf") || imageUrl?.includes("pdf")

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      xray: "X-Ray",
      photo: "Photo",
      scan: "Scan",
    }
    return labels[type] || type
  }

  const handleDownload = async () => {
    try {
      setIsDownloading(true)

      // For Cloudinary URLs, add download parameter to force download
      let downloadUrl = imageUrl
      if (imageUrl.includes("cloudinary.com")) {
        // Add download parameter to Cloudinary URL
        downloadUrl = imageUrl.includes("?") ? `${imageUrl}&fl_attachment` : `${imageUrl}?fl_attachment`
      }

      const response = await fetch(downloadUrl)
      if (!response.ok) throw new Error("Download failed")

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${title || "xray"}.${isPdf ? "pdf" : "jpg"}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error("[v0] Download error:", error)
      alert("Failed to download file. Please try again.")
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 sm:p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-card rounded-lg shadow-xl border border-border w-full max-w-sm sm:max-w-md md:max-w-xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-2 sm:p-4 border-b border-border sticky top-0 bg-card z-10 gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {isPdf ? (
              <FileText className="w-4 sm:w-5 h-4 sm:h-5 text-destructive flex-shrink-0" />
            ) : (
              <ImageIcon className="w-4 sm:w-5 h-4 sm:h-5 text-primary flex-shrink-0" />
            )}
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground text-sm sm:text-base truncate">{title || "Document"}</h3>
              <p className="text-xs text-muted-foreground">{getTypeLabel(type)}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="p-1.5 sm:p-2 hover:bg-muted rounded-lg transition-colors cursor-pointer text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
              title="Download"
            >
              <Download className={`w-4 sm:w-5 h-4 sm:h-5 ${isDownloading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 hover:bg-muted rounded-lg transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 sm:w-5 h-4 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 flex-1 overflow-y-auto">
          {/* File Preview */}
          <div className="bg-muted rounded-lg border border-border overflow-hidden">
            {isPdf ? (
              <div className="w-full h-64 sm:h-80 md:h-96 bg-muted flex items-center justify-center">
                <iframe
                  src={`${imageUrl}#toolbar=0`}
                  className="w-full h-full"
                  title={title}
                  onLoad={() => setIsLoading(false)}
                />
              </div>
            ) : (
              <div className="relative w-full">
                <img
                  src={imageUrl || "/placeholder.svg"}
                  alt={title}
                  className="w-full rounded-lg"
                  onLoad={() => setIsLoading(false)}
                  onError={(e) => {
                    e.currentTarget.src = "/placeholder.svg"
                    setIsLoading(false)
                  }}
                />
              </div>
            )}
          </div>

          {/* Details in one box */}
          <div className="bg-muted/50 rounded-lg p-3 sm:p-4 border border-border space-y-2">
            <h4 className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase mb-2">Details</h4>

            <p className="text-xs sm:text-sm text-foreground">
              <span className="font-medium text-muted-foreground">Type:</span> {getTypeLabel(type)}
            </p>

            {uploadedAt && (
              <p className="text-xs sm:text-sm text-foreground">
                <span className="font-medium text-muted-foreground">Uploaded:</span>{" "}
                {new Date(uploadedAt).toLocaleDateString()} {new Date(uploadedAt).toLocaleTimeString()}
              </p>
            )}

            {uploadedBy && (
              <p className="text-xs sm:text-sm text-foreground">
                <span className="font-medium text-muted-foreground">Uploaded By:</span> {uploadedBy}
              </p>
            )}

            {description && (
              <p className="text-xs sm:text-sm text-foreground">
                <span className="font-medium text-muted-foreground">Description:</span> {description}
              </p>
            )}

            {notes && (
              <div className="pt-2 border-t border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Clinical Notes</p>
                <p className="text-xs sm:text-sm text-foreground whitespace-pre-wrap">{notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-2 sm:p-4 border-t border-border bg-muted/30 flex gap-2">
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-colors font-medium cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
          >
            <Download className={`w-3.5 sm:w-4 h-3.5 sm:h-4 ${isDownloading ? "animate-spin" : ""}`} />
            {isDownloading ? "Downloading..." : "Download"}
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-muted hover:bg-muted/80 text-muted-foreground px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-colors font-medium cursor-pointer text-xs sm:text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
