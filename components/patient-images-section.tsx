"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { toast } from "react-hot-toast"
import { Upload, Trash2, Eye, FileText } from "lucide-react"
import { ConfirmDeleteModal } from "./confirm-delete-modal"
import { XrayFileUpload } from "./xray-file-upload"
import { XrayDisplayViewer } from "./xray-display-viewer"

interface PatientImage {
  _id: string
  type: "xray" | "photo" | "scan"
  title: string
  description: string
  imageUrl: string
  uploadedBy: { name: string; _id?: string }
  uploadedAt: string
  notes: string
}

interface PatientImagesSectionProps {
  patientId: string
  token: string
  isDoctor: boolean
  currentDoctorId?: string
}

export function PatientImagesSection({ patientId, token, isDoctor, currentDoctorId }: PatientImagesSectionProps) {
  const [images, setImages] = useState<PatientImage[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [selectedImage, setSelectedImage] = useState<PatientImage | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [imageToDelete, setImageToDelete] = useState<PatientImage | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [formData, setFormData] = useState({
    type: "xray" as "xray" | "photo" | "scan",
    title: "",
    description: "",
    imageUrl: "",
    notes: "",
  })
  const [showFileUpload, setShowFileUpload] = useState(false)

  useEffect(() => {
    fetchImages()
  }, [patientId])

  const fetchImages = async () => {
    try {
      const res = await fetch(`/api/patient-images?patientId=${patientId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setImages(data.images || [])
      }
    } catch (error) {
      console.error("Error fetching images:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUploadSuccess = async (fileUrl: string, fileName: string) => {
    setFormData({
      ...formData,
      imageUrl: fileUrl,
      title: formData.title || fileName.split(".")[0],
    })
    setShowFileUpload(false)
  }

  const handleImageUpload = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.imageUrl) {
      toast.error("Please provide an image URL")
      return
    }

    setUploading(true)
    try {
      const res = await fetch("/api/patient-images", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          patientId,
          ...formData,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setImages([data.image, ...images])
        toast.success("Image uploaded successfully")
        setShowUploadForm(false)
        setFormData({
          type: "xray",
          title: "",
          description: "",
          imageUrl: "",
          notes: "",
        })
      } else {
        const error = await res.json()
        toast.error(error.error || "Failed to upload image")
      }
    } catch (error) {
      toast.error("Error uploading image")
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteImage = async () => {
    if (!imageToDelete) return

    setIsDeleting(true)
    try {
      const res = await fetch(`/api/patient-images/${imageToDelete._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        setImages(images.filter((img) => img._id !== imageToDelete._id))
        toast.success("Image deleted successfully")
        setShowDeleteModal(false)
        setImageToDelete(null)
      } else {
        const error = await res.json()
        toast.error(error.error || "Failed to delete image")
      }
    } catch (error) {
      toast.error("Error deleting image")
    } finally {
      setIsDeleting(false)
    }
  }

  const getImageTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      xray: "X-Ray",
      photo: "Photo",
      scan: "Scan",
    }
    return labels[type] || type
  }

  const canDeleteImage = (image: PatientImage) => {
    if (!isDoctor) return false
    if (!currentDoctorId) return false
    if (!image.uploadedBy) return false

    console.log("[v0] Delete check - uploadedBy:", image.uploadedBy, "currentDoctorId:", currentDoctorId)

    const uploadedId = String(image.uploadedBy._id || image.uploadedBy)
    const currentId = String(currentDoctorId)

    console.log("[v0] Comparing - uploadedId:", uploadedId, "currentId:", currentId, "Match:", uploadedId === currentId)

    return uploadedId === currentId
  }

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading images...</div>
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      {isDoctor && (
        <div>
          <button
            onClick={() => setShowUploadForm(!showUploadForm)}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg transition-colors text-sm font-medium cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            {showUploadForm ? "Cancel" : "Upload Image"}
          </button>

          {showUploadForm && (
            <div className="mt-4 bg-card border border-border rounded-lg p-4 space-y-4 shadow-md">
              <h3 className="font-semibold text-foreground">Upload X-Ray or Image</h3>

              {!formData.imageUrl && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-foreground mb-3">Step 1: Upload File</h4>
                  <XrayFileUpload onUploadSuccess={handleFileUploadSuccess} isLoading={uploading} />
                </div>
              )}

              {formData.imageUrl && (
                <div className="mb-4 p-3 bg-accent/10 border border-accent rounded-lg">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">File uploaded:</span> {formData.title}
                  </p>
                  <button
                    onClick={() => setFormData({ ...formData, imageUrl: "", title: "" })}
                    className="text-xs text-accent hover:underline mt-2 cursor-pointer"
                  >
                    Change file
                  </button>
                </div>
              )}

              <form onSubmit={handleImageUpload} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-2">Type *</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-sm cursor-pointer"
                    >
                      <option value="xray">X-Ray</option>
                      <option value="photo">Photo</option>
                      <option value="scan">Scan</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-2">Title</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., Panoramic X-Ray"
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm cursor-text"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the image..."
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm cursor-text"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Add clinical notes..."
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm cursor-text"
                    rows={2}
                  />
                </div>

                <button
                  type="submit"
                  disabled={uploading || !formData.imageUrl}
                  className="w-full bg-accent hover:bg-accent/90 disabled:opacity-50 text-accent-foreground px-4 py-2 rounded-lg transition-colors text-sm font-medium cursor-pointer disabled:cursor-not-allowed"
                >
                  {uploading ? "Saving..." : "Save X-Ray"}
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Images Grid */}
      <div>
        <h3 className="font-semibold text-foreground mb-4">
          {images.length === 0 ? "No images uploaded" : `Images (${images.length})`}
        </h3>

        {images.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {images.map((image) => {
              const isPdf = image.imageUrl?.toLowerCase().includes(".pdf")
              return (
                <div
                  key={image._id}
                  className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                >
                  <div className="aspect-square bg-muted overflow-hidden relative flex items-center justify-center">
                    {isPdf ? (
                      <div className="flex flex-col items-center justify-center w-full h-full bg-gradient-to-br from-muted to-muted/50">
                        <FileText className="w-12 h-12 text-destructive/50 mb-2" />
                        <p className="text-xs text-muted-foreground font-medium">PDF Document</p>
                      </div>
                    ) : (
                      <img
                        src={image.imageUrl || "/placeholder.svg"}
                        alt={image.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        onError={(e) => {
                          e.currentTarget.src = "/placeholder.svg"
                        }}
                      />
                    )}
                  </div>
                  <div className="p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium text-foreground text-sm">{image.title || "Untitled"}</p>
                        <p className="text-xs text-muted-foreground">{getImageTypeLabel(image.type)}</p>
                      </div>
                    </div>
                    {image.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{image.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Uploaded by {image.uploadedBy?.name} on {new Date(image.uploadedAt).toLocaleDateString()}
                    </p>
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => setSelectedImage(image)}
                        className="flex-1 flex items-center justify-center gap-1 bg-primary hover:bg-primary/90 text-primary-foreground px-2 py-1 rounded text-xs font-medium transition-colors cursor-pointer"
                      >
                        <Eye className="w-3 h-3" />
                        View
                      </button>
                      {canDeleteImage(image) && (
                        <button
                          onClick={() => {
                            setImageToDelete(image)
                            setShowDeleteModal(true)
                          }}
                          className="flex-1 flex items-center justify-center gap-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground px-2 py-1 rounded text-xs font-medium transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Image Viewer Modal - Using new XrayDisplayViewer */}
      {selectedImage && (
        <XrayDisplayViewer
          imageUrl={selectedImage.imageUrl}
          title={selectedImage.title || "Document"}
          type={selectedImage.type}
          description={selectedImage.description}
          notes={selectedImage.notes}
          uploadedBy={selectedImage.uploadedBy?.name}
          uploadedAt={selectedImage.uploadedAt}
          onClose={() => setSelectedImage(null)}
        />
      )}

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        title="Delete Image"
        description="Are you sure you want to delete this image? This action cannot be undone."
        itemName={imageToDelete?.title || "Untitled Image"}
        onConfirm={handleDeleteImage}
        onCancel={() => {
          setShowDeleteModal(false)
          setImageToDelete(null)
        }}
        isLoading={isDeleting}
      />
    </div>
  )
}
