//@ts-nocheck
"use client"

import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, Edit2, Trash2, Eye } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ConfirmDeleteModal } from "./confirm-delete-modal"

interface ToothRecord {
  _id?: string
  toothNumber: number
  sides: string[]
  procedure: string
  diagnosis: string
  comments: string
  date: string
  fillingType?: string
  createdBy?: string
}

interface ToothChartResultsTableProps {
  teeth: Record<number, any>
  procedures?: ToothRecord[]
  onEdit?: (record: ToothRecord) => void
  onDelete?: (recordId: string) => Promise<void> | void
  onViewDetails?: (record: ToothRecord) => void
}

const ITEMS_PER_PAGE = {
  xs: 3,
  sm: 4,
  md: 5,
  lg: 6,
  xl: 8,
  '2xl': 10
}

// Format date from ISO string to readable format (DD-MM-YYYY)
const formatDate = (dateString: string | Date): string => {
  try {
    const date = typeof dateString === "string" ? new Date(dateString) : dateString
    if (isNaN(date.getTime())) return "-"
    return date.toLocaleDateString("en-GB", { 
      day: "2-digit", 
      month: "2-digit", 
      year: "numeric" 
    })
  } catch {
    return "-"
  }
}

export function ToothChartResultsTable({ teeth, procedures = [], onEdit, onDelete, onViewDetails }: ToothChartResultsTableProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; recordId?: string; toothNumber?: number; procedure?: string }>({
    isOpen: false,
  })
  const [isDeleting, setIsDeleting] = useState(false)
  const [detailsModal, setDetailsModal] = useState<{ isOpen: boolean; record?: ToothRecord }>({
    isOpen: false,
  })

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!deleteModal.recordId || !onDelete) return
    
    try {
      setIsDeleting(true)
      console.log("[v0] Deleting procedure:", deleteModal.recordId)
      await onDelete(deleteModal.recordId)
      setDeleteModal({ isOpen: false })
    } catch (error) {
      console.error("[v0] Delete error:", error)
    } finally {
      setIsDeleting(false)
    }
  }

  // Use procedures array directly from database
  const tableData = useMemo(() => {
    if (procedures && procedures.length > 0) {
      console.log("[v0] Using procedures from database:", procedures.length, "procedures")
      return procedures.sort((a, b) => {
        if (a.toothNumber === b.toothNumber) {
          return new Date(b.date).getTime() - new Date(a.date).getTime()
        }
        return a.toothNumber - b.toothNumber
      })
    }
    return []
  }, [procedures])

  // Responsive items per page
  const totalPages = Math.ceil(tableData.length / ITEMS_PER_PAGE.md) // Default to md
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE.md
  const endIndex = startIndex + ITEMS_PER_PAGE.md
  const paginatedData = tableData.slice(startIndex, endIndex)

  if (tableData.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-4 sm:p-6 text-center">
        <p className="text-muted-foreground text-sm sm:text-base">
          No procedures recorded yet. Click on a tooth to add a procedure.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
      <h3 className="font-semibold text-foreground text-base sm:text-lg lg:text-xl">Procedure Records</h3>
      
      {/* Container for responsive table */}
      <div className="rounded-lg border border-border overflow-hidden">
        
        {/* Large screens (lg and above) - Full table */}
        <div className="hidden lg:block overflow-x-auto">
          <div className="min-w-full">
            <table className="w-full text-sm xl:text-base">
              <thead>
                <tr className="bg-muted border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Tooth #</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Side(s)</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Procedure</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Filling Type</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Diagnosis</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Date</th>
                  {(onEdit || onDelete || onViewDetails) && (
                    <th className="text-left py-3 px-4 font-semibold text-foreground">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((record, index) => (
                  <tr
                    key={`${record._id || record.toothNumber}-${index}`}
                    className="border-b border-border hover:bg-muted/30 transition-colors last:border-b-0"
                  >
                    <td className="py-3 px-4 font-medium text-foreground">#{record.toothNumber}</td>
                    <td className="py-3 px-4 text-foreground">
                      <div className="flex flex-wrap gap-1">
                        {record.sides?.map((side) => (
                          <span
                            key={side}
                            className="inline-block bg-primary/10 text-primary px-2 py-1 rounded text-xs font-medium"
                          >
                            {side}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-foreground">{record.procedure}</td>
                    <td className="py-3 px-4 text-foreground text-sm">
                      {record.fillingType && record.procedure?.toLowerCase() === "filling" ? record.fillingType : "-"}
                    </td>
                    <td className="py-3 px-4 text-foreground">{record.diagnosis || "-"}</td>
                    <td className="py-3 px-4 text-muted-foreground text-sm">
                      {formatDate(record.date)}
                    </td>
                    {(onEdit || onDelete || onViewDetails) && (
                      <td className="py-3 px-4 text-foreground">
                        <div className="flex gap-2">
                          {onViewDetails !== undefined && (
                            <button
                              onClick={() => setDetailsModal({
                                isOpen: true,
                                record,
                              })}
                              className="p-2 text-secondary-foreground  rounded transition-colors bg-secondary cursor-pointer"
                              title="View Details"
                            >
                             
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                          {onEdit !== undefined && (
                            <button
                              onClick={() => onEdit(record)}
                              className="p-2 text-primary hover:bg-primary/10 rounded transition-colors cursor-pointer"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {onDelete !== undefined && record._id && (
                            <button
                              onClick={() => setDeleteModal({
                                isOpen: true,
                                recordId: record._id,
                                toothNumber: record.toothNumber,
                                procedure: record.procedure,
                              })}
                              className="p-2 text-destructive hover:bg-destructive/10 rounded transition-colors cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Medium screens (md) - Compact table */}
        <div className="hidden md:block lg:hidden overflow-x-auto">
          <div className="min-w-full">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Tooth #</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Sides</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Procedure</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Date</th>
                  {(onEdit || onDelete || onViewDetails) && (
                    <th className="text-left py-3 px-4 font-semibold text-foreground">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((record, index) => (
                  <tr
                    key={`${record._id || record.toothNumber}-${index}`}
                    className="border-b border-border hover:bg-muted/30 transition-colors last:border-b-0"
                  >
                    <td className="py-3 px-4 font-medium text-foreground">#{record.toothNumber}</td>
                    <td className="py-3 px-4 text-foreground">
                      <div className="flex flex-wrap gap-1">
                        {record.sides?.map((side) => (
                          <span
                            key={side}
                            className="inline-block bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px] font-medium"
                          >
                            {side}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-foreground">
                      <div>
                        <div className="font-medium">{record.procedure}</div>
                        {record.fillingType && record.procedure?.toLowerCase() === "filling" && (
                          <div className="text-xs text-muted-foreground mt-0.5">{record.fillingType}</div>
                        )}
                        <div className="text-xs text-muted-foreground mt-0.5">{record.diagnosis || "No diagnosis"}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground text-xs">
                      {formatDate(record.date)}
                    </td>
                    {(onEdit || onDelete || onViewDetails) && (
                      <td className="py-3 px-4 text-foreground">
                        <div className="flex flex-col gap-1">
                          {onViewDetails !== undefined && (
                            <button
                              onClick={() => setDetailsModal({
                                isOpen: true,
                                record,
                              })}
                              className="p-1.5 text-xs font-medium text-secondary-foreground bg-secondary hover:bg-secondary/80 rounded transition-colors cursor-pointer"
                              title="View Details"
                            >
                              View
                            </button>
                          )}
                          <div className="flex gap-1">
                            {onEdit !== undefined && (
                              <button
                                onClick={() => onEdit(record)}
                                className="p-1.5 text-primary hover:bg-primary/10 rounded transition-colors flex-1 cursor-pointer"
                                title="Edit"
                              >
                                <Edit2 className="w-3.5 h-3.5 mx-auto" />
                              </button>
                            )}
                            {onDelete !== undefined && record._id && (
                              <button
                                onClick={() => setDeleteModal({
                                  isOpen: true,
                                  recordId: record._id,
                                  toothNumber: record.toothNumber,
                                  procedure: record.procedure,
                                })}
                                className="p-1.5 text-destructive hover:bg-destructive/10 rounded transition-colors flex-1 cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5 mx-auto" />
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Small screens (sm) - Card layout */}
        <div className="hidden sm:block md:hidden space-y-3 p-3">
          {paginatedData.map((record, index) => (
            <div
              key={`${record._id || record.toothNumber}-${index}`}
              className="bg-card border border-border rounded-lg p-4 space-y-3 shadow-sm"
            >
              <div className="flex justify-between items-start gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground text-lg">#{record.toothNumber}</span>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                    {formatDate(record.date)}
                  </span>
                </div>
                {(onEdit || onDelete || onViewDetails) && (
                  <div className="flex gap-1">
                    {onViewDetails !== undefined && (
                      <button
                        onClick={() => setDetailsModal({
                          isOpen: true,
                          record,
                        })}
                        className="p-1.5 text-secondary-foreground hover:bg-secondary/20 rounded transition-colors bg-secondary cursor-pointer"
                        title="View Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {onEdit !== undefined && (
                      <button
                        onClick={() => onEdit(record)}
                        className="p-1.5 text-primary hover:bg-primary/10 rounded transition-colors cursor-pointer"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {onDelete !== undefined && record._id && (
                      <button
                        onClick={() => setDeleteModal({
                          isOpen: true,
                          recordId: record._id,
                          toothNumber: record.toothNumber,
                          procedure: record.procedure,
                        })}
                        className="p-1.5 text-destructive hover:bg-destructive/10 rounded transition-colors cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
              
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-foreground">Sides:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {record.sides?.map((side) => (
                      <span
                        key={side}
                        className="inline-block bg-primary/10 text-primary px-2 py-1 rounded text-xs font-medium"
                      >
                        {side}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="font-medium text-foreground">Procedure:</span>
                    <p className="text-foreground font-medium">{record.procedure}</p>
                  </div>
                  
                  <div>
                    <span className="font-medium text-foreground">Diagnosis:</span>
                    <p className="text-foreground">{record.diagnosis || "-"}</p>
                  </div>
                </div>

                {record.fillingType && record.procedure?.toLowerCase() === "filling" && (
                  <div>
                    <span className="font-medium text-foreground">Filling Type:</span>
                    <p className="text-foreground">{record.fillingType}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Extra small screens (xs) - Minimal card layout */}
        <div className="sm:hidden space-y-3 p-2">
          {paginatedData.map((record, index) => (
            <div
              key={`${record._id || record.toothNumber}-${index}`}
              className="bg-card border border-border rounded-lg p-3 space-y-2 shadow-sm"
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-bold text-foreground text-base">Tooth #{record.toothNumber}</span>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {formatDate(record.date)}
                  </div>
                </div>
                {(onEdit || onDelete || onViewDetails) && (
                  <div className="flex gap-1">
                    {onViewDetails !== undefined && (
                      <button
                        onClick={() => setDetailsModal({
                          isOpen: true,
                          record,
                        })}
                        className="p-1 text-secondary-foreground hover:bg-secondary/20 rounded transition-colors bg-secondary cursor-pointer"
                        title="View Details"
                      >
                        <Eye className="w-3 h-3" />
                      </button>
                    )}
                    {onEdit !== undefined && (
                      <button
                        onClick={() => onEdit(record)}
                        className="p-1 text-primary hover:bg-primary/10 rounded transition-colors cursor-pointer"
                        title="Edit"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    )}
                    {onDelete !== undefined && record._id && (
                      <button
                        onClick={() => setDeleteModal({
                          isOpen: true,
                          recordId: record._id,
                          toothNumber: record.toothNumber,
                          procedure: record.procedure,
                        })}
                        className="p-1 text-destructive hover:bg-destructive/10 rounded transition-colors cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
              
              <div className="space-y-1.5 text-sm">
                <div>
                  <span className="font-medium text-foreground">Sides:</span>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {record.sides?.map((side) => (
                      <span
                        key={side}
                        className="inline-block bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[10px] font-medium"
                      >
                        {side}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div>
                  <span className="font-medium text-foreground">Procedure:</span>
                  <p className="text-foreground font-medium text-xs">{record.procedure}</p>
                </div>

                <div>
                  <span className="font-medium text-foreground">Diagnosis:</span>
                  <p className="text-foreground text-xs">{record.diagnosis || "-"}</p>
                </div>

                {record.fillingType && record.procedure?.toLowerCase() === "filling" && (
                  <div>
                    <span className="font-medium text-foreground">Filling:</span>
                    <p className="text-foreground text-xs">{record.fillingType}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Responsive Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2 mt-4 sm:mt-6 px-2 sm:px-0">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="flex items-center gap-1 px-3 py-2 text-xs sm:text-sm font-medium bg-muted hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed text-foreground rounded-lg transition-colors min-w-[80px] sm:min-w-[100px] justify-center cursor-pointer"
          >
            <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Previous</span>
            <span className="sm:hidden">Prev</span>
          </button>

          <div className="text-xs sm:text-sm text-muted-foreground px-2">
            <span className="font-medium text-foreground">{currentPage}</span>
            <span className="mx-1">/</span>
            <span className="font-medium text-foreground">{totalPages}</span>
          </div>

          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1 px-3 py-2 text-xs sm:text-sm font-medium bg-muted hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed text-foreground rounded-lg transition-colors min-w-[80px] sm:min-w-[100px] justify-center cursor-pointer"
          >
            <span className="hidden sm:inline">Next</span>
            <span className="sm:hidden">Next</span>
            <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={deleteModal.isOpen}
        title="Delete Procedure"
        description={`Are you sure you want to delete this procedure from tooth #${deleteModal.toothNumber}? This action cannot be undone.`}
        itemName={deleteModal.procedure}
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteModal({ isOpen: false })}
      />

      {/* View Details Modal - Responsive */}
      <Dialog open={detailsModal.isOpen} onOpenChange={(open) => setDetailsModal({ isOpen: open })}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full mx-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              Procedure Details - Tooth #{detailsModal.record?.toothNumber}
            </DialogTitle>
          </DialogHeader>

          {detailsModal.record && (
            <div className="space-y-4 text-sm sm:text-base">
              <div className="bg-muted rounded-lg p-3 sm:p-4 space-y-3 sm:space-y-4">
                <div>
                  <span className="font-semibold text-foreground">Sides Affected:</span>
                  <div className="flex flex-wrap gap-1 sm:gap-2 mt-2">
                    {detailsModal.record.sides?.map((side) => (
                      <span
                        key={side}
                        className="inline-block bg-primary/10 text-primary px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium"
                      >
                        {side}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-border">
                  <span className="font-semibold text-foreground">Procedure:</span>
                  <p className="mt-1 text-foreground">{detailsModal.record.procedure}</p>
                </div>

                <div>
                  <span className="font-semibold text-foreground">Diagnosis:</span>
                  <p className="mt-1 text-foreground">{detailsModal.record.diagnosis || "-"}</p>
                </div>

                <div>
                  <span className="font-semibold text-foreground">Date:</span>
                  <p className="mt-1 text-foreground">{formatDate(detailsModal.record.date)}</p>
                </div>

                {detailsModal.record.procedure?.toLowerCase() === "filling" && detailsModal.record.fillingType && (
                  <div>
                    <span className="font-semibold text-foreground">Filling Type:</span>
                    <p className="mt-1 text-foreground">{detailsModal.record.fillingType}</p>
                  </div>
                )}

                {detailsModal.record.comments && (
                  <div className="pt-2 border-t border-border">
                    <span className="font-semibold text-foreground">Comments:</span>
                    <p className="mt-1 text-foreground whitespace-pre-wrap text-sm">{detailsModal.record.comments}</p>
                  </div>
                )}
              </div>

              <button
                onClick={() => setDetailsModal({ isOpen: false })}
                className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm sm:text-base cursor-pointer"
              >
                Close
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
