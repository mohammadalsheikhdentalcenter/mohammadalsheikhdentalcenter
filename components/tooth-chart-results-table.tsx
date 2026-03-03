//@ts-nocheck
"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Edit2, Trash2, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDeleteModal } from "./confirm-delete-modal";

interface ToothRecord {
  _id?: string;
  toothNumber: number;
  sides: string[];
  procedure: string;
  diagnosis: string;
  comments: string;
  date: string;
  fillingType?: string;
  rootCanalType?: string;
  createdBy?: string;
  createdByName?: string;
  patientName?: string;
}

interface GeneralProcedureRecord {
  _id?: string;
  id?: string;
  name: string;
  date: string;
  comments?: string;
  notes?: string;
  createdBy?: string;
  createdByName?: string;
  patientName?: string;
}

interface ToothChartResultsTableProps {
  teeth: Record<number, any>;
  procedures?: ToothRecord[];
  generalProcedures?: GeneralProcedureRecord[];
  userRole?: string;
  onEdit?: (record: ToothRecord) => void;
  onDelete?: (recordId: string) => Promise<void> | void;
  onViewDetails?: (record: ToothRecord) => void;
  onViewGeneralProcedure?: (record: GeneralProcedureRecord) => void;
  onEditGeneralProcedure?: (record: GeneralProcedureRecord) => void;
  onDeleteGeneralProcedure?: (recordId: string) => Promise<void> | void;
}

const ITEMS_PER_PAGE = {
  xs: 3,
  sm: 4,
  md: 5,
  lg: 6,
  xl: 8,
  "2xl": 10,
};

// Format date from ISO string to readable format (DD-MM-YYYY)
const formatDate = (dateString: string | Date): string => {
  try {
    const date =
      typeof dateString === "string" ? new Date(dateString) : dateString;
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "-";
  }
};

export function ToothChartResultsTable({
  teeth,
  procedures = [],
  generalProcedures = [],
  userRole,
  onEdit,
  onDelete,
  onViewDetails,
  onViewGeneralProcedure,
  onEditGeneralProcedure,
  onDeleteGeneralProcedure,
}: ToothChartResultsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<"general" | "tooth">(
    generalProcedures && generalProcedures.length > 0 ? "general" : "tooth",
  );
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    recordIds?: string[];
    toothNumbers?: number[];
    procedure?: string;
    isGeneralProcedure?: boolean;
  }>({
    isOpen: false,
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [detailsModal, setDetailsModal] = useState<{
    isOpen: boolean;
    record?: ToothRecord;
  }>({
    isOpen: false,
  });
  const [viewGeneralProcedureModal, setViewGeneralProcedureModal] = useState<{
    isOpen: boolean;
    record?: GeneralProcedureRecord;
  }>({
    isOpen: false,
  });

  // Handle delete confirmation - supports deleting multiple grouped records
  const handleDeleteConfirm = async () => {
    try {
      setIsDeleting(true);

      if (
        deleteModal.isGeneralProcedure &&
        deleteModal.recordIds &&
        onDeleteGeneralProcedure
      ) {
        // Handle general procedure deletion
        for (const recordId of deleteModal.recordIds) {
          await onDeleteGeneralProcedure(recordId);
        }
      } else if (
        !deleteModal.isGeneralProcedure &&
        deleteModal.recordIds &&
        onDelete
      ) {
        // Handle tooth procedure deletion
        for (const recordId of deleteModal.recordIds) {
          await onDelete(recordId);
        }
      }
      setDeleteModal({ isOpen: false });
    } catch (error) {
      console.error("Delete error:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Use procedures array directly from database and group by same procedure
  const tableData = useMemo(() => {
    if (procedures && procedures.length > 0) {
      // Group procedures by matching attributes
      const grouped = procedures.reduce(
        (acc, record) => {
          // Create a unique key for grouping based on all attributes except toothNumber
          const sidesKey = record.sides?.sort().join(",") || "";
          const key = `${record.procedure}-${record.diagnosis}-${record.date}-${sidesKey}-${record.fillingType || ""}-${record.rootCanalType || ""}-${record.comments || ""}-${record.createdBy || ""}`;

          if (!acc[key]) {
            // First occurrence - create new grouped record with toothNumbers array
            acc[key] = {
              ...record,
              toothNumbers: [record.toothNumber],
              _ids: record._id ? [record._id] : [], // Store all IDs for deletion
            };
          } else {
            // Add tooth number to existing group
            acc[key].toothNumbers.push(record.toothNumber);
            if (record._id) {
              acc[key]._ids.push(record._id);
            }
          }
          return acc;
        },
        {} as Record<string, any>,
      );

      // Convert to array and sort by date (newest first), then by tooth number
      return Object.values(grouped).sort((a: any, b: any) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateA === dateB) {
          const aFirstTooth = Math.min(...a.toothNumbers);
          const bFirstTooth = Math.min(...b.toothNumbers);
          return aFirstTooth - bFirstTooth;
        }
        return dateB - dateA; // Newest first
      });
    }
    return [];
  }, [procedures]);

  // Responsive items per page
  const totalPages = Math.ceil(tableData.length / ITEMS_PER_PAGE.md); // Default to md
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE.md;
  const endIndex = startIndex + ITEMS_PER_PAGE.md;
  const paginatedData = tableData.slice(startIndex, endIndex);

  // Determine which type column to show based on procedures
  const showTypeColumn = useMemo(() => {
    return paginatedData.some(
      (record) =>
        record.procedure?.toLowerCase() === "filling" ||
        record.procedure?.toLowerCase() === "root canal",
    );
  }, [paginatedData]);

  // Helper function to get the type value for a record
  const getTypeValue = (record: ToothRecord) => {
    console.log(`[Table] Getting type for tooth #${record.toothNumber}:`, {
      procedure: record.procedure,
      fillingType: record.fillingType,
      rootCanalType: record.rootCanalType,
    });
    if (record.procedure?.toLowerCase() === "filling" && record.fillingType) {
      return record.fillingType;
    }
    if (
      record.procedure?.toLowerCase() === "root canal" &&
      record.rootCanalType
    ) {
      return record.rootCanalType;
    }
    return "-";
  };

  // Only show "no procedures" message if there are no tooth procedures AND no general procedures
  if (
    tableData.length === 0 &&
    (!generalProcedures || generalProcedures.length === 0)
  ) {
    return (
      <div className="bg-card border border-border rounded-lg p-4 sm:p-6 text-center mt-4">
        <p className="text-muted-foreground text-sm sm:text-base">
          No procedures recorded yet. Click on a tooth to add a procedure or add
          a general procedure.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
      <h3 className="font-semibold text-foreground text-base sm:text-lg lg:text-xl">
        Procedure Records
      </h3>

      {/* Tabs for General and Tooth Procedures */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "general" | "tooth")}
        className="w-full"
      >
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="general" className="relative">
            General Procedures
            {generalProcedures && generalProcedures.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-semibold text-white bg-green-600 rounded-full">
                {generalProcedures.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="tooth" className="relative">
            Tooth Procedures
            {tableData.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-semibold text-white bg-blue-600 rounded-full">
                {tableData.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* General Procedures Tab */}
        <TabsContent value="general" className="space-y-4">
          {generalProcedures && generalProcedures.length > 0 ? (
            <div className="rounded-lg border border-green-200 bg-green-50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted border-b border-border">
                      <th className="text-left py-2 px-3 font-semibold text-foreground whitespace-nowrap">
                        Date
                      </th>
                      <th className="text-left py-2 px-3 font-semibold text-foreground whitespace-nowrap">
                        Procedure Name
                      </th>
                      {/* <th className="text-left py-2 px-3 font-semibold text-foreground whitespace-nowrap">
                        Patient Name
                      </th> */}
                      <th className="text-left py-2 px-3 font-semibold text-foreground whitespace-nowrap">
                        Doctor Name
                      </th>
                      <th className="text-left py-2 px-3 font-semibold text-foreground whitespace-nowrap w-48">
                        Comments
                      </th>
                      <th className="text-left py-2 px-3 font-semibold text-foreground whitespace-nowrap">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {generalProcedures.map((proc) => (
                      <tr
                        key={proc._id || proc.id || proc.name}
                        className="border-b border-border hover:bg-muted/30 transition-colors last:border-b-0"
                      >
                        <td className="py-2 px-3 text-foreground text-xs sm:text-sm whitespace-nowrap">
                          {formatDate(proc.date)}
                        </td>
                        <td className="py-2 px-3 text-foreground text-xs sm:text-sm font-medium">
                          {proc.name}
                        </td>
                        {/* <td className="py-2 px-3 text-foreground text-xs sm:text-sm">
                          {proc.patientName || "-"}
                        </td> */}
                        <td className="py-2 px-3 text-foreground text-xs sm:text-sm">
                          {proc.createdByName || proc.createdBy || "-"}
                        </td>
                        <td className="py-2 px-3 text-muted-foreground text-xs sm:text-sm max-w-xs">
                          {proc.comments || proc.notes ? (
                            <div
                              className="line-clamp-1"
                              title={proc.comments || proc.notes}
                            >
                              {proc.comments || proc.notes}
                            </div>
                          ) : (
                            <span className="text-muted-foreground/50">-</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-foreground whitespace-nowrap">
                          <div className="flex gap-2">
                            {/* View Button - visible to all */}
                            <button
                              onClick={() =>
                                setViewGeneralProcedureModal({
                                  isOpen: true,
                                  record: proc,
                                })
                              }
                              className="p-2 text-blue-600 hover:bg-blue-100 rounded transition-colors cursor-pointer"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {/* Edit Button - only for doctors */}
                            {userRole === "doctor" &&
                              onEditGeneralProcedure !== undefined && (
                                <button
                                  onClick={() => onEditGeneralProcedure(proc)}
                                  className="p-2 text-primary hover:bg-primary/10 rounded transition-colors cursor-pointer"
                                  title="Edit"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                              )}
                            {/* Delete Button - only for doctors */}
                            {userRole === "doctor" && (proc._id || proc.id) && (
                              <button
                                onClick={() =>
                                  setDeleteModal({
                                    isOpen: true,
                                    recordIds: [(proc._id || proc.id)!],
                                    isGeneralProcedure: true,
                                  })
                                }
                                className="p-2 text-destructive hover:bg-destructive/10 rounded transition-colors cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-lg p-4 sm:p-6 text-center">
              <p className="text-muted-foreground text-sm sm:text-base">
                No general procedures recorded yet. Select a procedure from the
                dropdown to add one.
              </p>
            </div>
          )}
        </TabsContent>

        {/* Tooth Procedures Tab */}
        <TabsContent value="tooth" className="space-y-4">
          {/* Container for responsive table */}
          <div className="rounded-lg border border-border overflow-hidden">
            {/* Large screens (lg and above) - Full table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm xl:text-base">
                <thead>
                  <tr className="bg-muted border-b border-border">
                    <th className="text-left py-2 px-3 font-semibold text-foreground whitespace-nowrap">
                      Date
                    </th>
                    {/* <th className="text-left py-2 px-3 font-semibold text-foreground whitespace-nowrap">
                  Patient Name
                </th> */}
                    <th className="text-left py-2 px-3 font-semibold text-foreground whitespace-nowrap">
                      Doctor Name
                    </th>
                    <th className="text-left py-2 px-3 font-semibold text-foreground whitespace-nowrap">
                      Tooth #
                    </th>
                    <th className="text-left py-2 px-3 font-semibold text-foreground whitespace-nowrap">
                      Side(s)
                    </th>
                    <th className="text-left py-2 px-3 font-semibold text-foreground whitespace-nowrap">
                      Procedure
                    </th>
                    {showTypeColumn && (
                      <th className="text-left py-2 px-3 font-semibold text-foreground whitespace-nowrap">
                        Type
                      </th>
                    )}
                    <th className="text-left py-2 px-3 font-semibold text-foreground whitespace-nowrap">
                      Diagnosis
                    </th>
                    <th className="text-left py-2 px-3 font-semibold text-foreground whitespace-nowrap w-48">
                      Comments
                    </th>
                    {(onEdit || onDelete || onViewDetails) && (
                      <th className="text-left py-2 px-3 font-semibold text-foreground whitespace-nowrap">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((record, index) => (
                    <tr
                      key={`${record._id || record.toothNumbers?.[0] || record.toothNumber}-${index}`}
                      className="border-b border-border hover:bg-muted/30 transition-colors last:border-b-0"
                    >
                      <td className="py-1.5 px-3 text-muted-foreground text-sm whitespace-nowrap align-middle font-medium">
                        {formatDate(record.date)}
                      </td>
                      {/* <td className="py-1.5 px-3 text-foreground text-sm whitespace-nowrap align-middle">
                    {record.patientName || "-"}
                  </td> */}
                      <td className="py-1.5 px-3 text-foreground text-sm whitespace-nowrap align-middle">
                        {record.createdByName || record.createdBy || "-"}
                      </td>
                      <td className="py-1.5 px-3 font-medium text-foreground align-top min-w-[200px]">
                        <div className="grid grid-cols-3 gap-1.5 w-full">
                          {(record.toothNumbers || [record.toothNumber])
                            .sort((a, b) => a - b)
                            .map((toothNum, idx) => (
                              <span
                                key={idx}
                                className="inline-block bg-blue-100 text-blue-800 px-1 py-1 rounded text-xs font-semibold text-center whitespace-nowrap"
                              >
                                #{toothNum}
                              </span>
                            ))}
                        </div>
                      </td>
                      <td className="py-1.5 px-3 text-foreground align-middle">
                        <div className="flex flex-wrap gap-0.5">
                          {record.sides?.map((side) => (
                            <span
                              key={side}
                              className="inline-block bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[11px] font-medium leading-tight"
                            >
                              {side}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-1.5 px-3 text-foreground whitespace-nowrap align-middle text-sm">
                        {record.procedure}
                      </td>
                      {showTypeColumn && (
                        <td className="py-1.5 px-3 text-foreground text-sm whitespace-nowrap align-middle">
                          {getTypeValue(record)}
                        </td>
                      )}
                      <td className="py-1.5 px-3 text-foreground whitespace-nowrap align-middle text-sm">
                        {record.diagnosis || "-"}
                      </td>
                      <td className="py-1.5 px-3 text-muted-foreground text-sm w-48 align-middle">
                        {record.comments || record.notes ? (
                          <div
                            className="line-clamp-1"
                            title={record.comments || record.notes}
                          >
                            {record.comments || record.notes}
                          </div>
                        ) : (
                          <span className="text-muted-foreground/50">-</span>
                        )}
                      </td>
                      {(onEdit || onDelete || onViewDetails) && (
                        <td className="py-1.5 px-3 text-foreground whitespace-nowrap align-middle">
                          <div className="flex gap-2">
                            {onViewDetails !== undefined && (
                              <button
                                onClick={() =>
                                  setDetailsModal({
                                    isOpen: true,
                                    record,
                                  })
                                }
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
                            {onDelete !== undefined &&
                              (record._id || record._ids) && (
                                <button
                                  onClick={() =>
                                    setDeleteModal({
                                      isOpen: true,
                                      recordIds: record._ids || [record._id],
                                      toothNumbers: record.toothNumbers || [
                                        record.toothNumber,
                                      ],
                                      procedure: record.procedure,
                                    })
                                  }
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

            {/* Medium screens (md) - Compact table */}
            <div className="hidden md:block lg:hidden overflow-x-auto">
              <div className="min-w-full">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted border-b border-border">
                      <th className="text-left py-3 px-4 font-semibold text-foreground">
                        Date
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">
                        Patient
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">
                        Doctor
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">
                        Tooth #
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">
                        Procedure
                      </th>
                      {(onEdit || onDelete || onViewDetails) && (
                        <th className="text-left py-3 px-4 font-semibold text-foreground">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((record, index) => (
                      <tr
                        key={`${record._id || record.toothNumbers?.[0] || record.toothNumber}-${index}`}
                        className="border-b border-border hover:bg-muted/30 transition-colors last:border-b-0"
                      >
                        <td className="py-3 px-4 text-muted-foreground text-xs font-medium whitespace-nowrap">
                          {formatDate(record.date)}
                        </td>
                        <td className="py-3 px-4 text-foreground text-xs whitespace-nowrap">
                          {record.patientName || "-"}
                        </td>
                        <td className="py-3 px-4 text-foreground text-xs whitespace-nowrap">
                          {record.createdByName || record.createdBy || "-"}
                        </td>
                        <td className="py-3 px-4 font-medium text-foreground">
                          <div className="flex flex-wrap gap-1">
                            {(record.toothNumbers || [record.toothNumber])
                              .sort((a, b) => a - b)
                              .map((toothNum, idx) => (
                                <span
                                  key={idx}
                                  className="inline-block bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-[10px] font-semibold"
                                >
                                  #{toothNum}
                                </span>
                              ))}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-foreground">
                          <div>
                            <div className="font-medium">
                              {record.procedure}
                            </div>
                            {record.fillingType &&
                              record.procedure?.toLowerCase() === "filling" && (
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  Type: {record.fillingType}
                                </div>
                              )}
                            {record.rootCanalType &&
                              record.procedure?.toLowerCase() ===
                                "root canal" && (
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  Type: {record.rootCanalType}
                                </div>
                              )}
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {record.diagnosis || "No diagnosis"}
                            </div>
                            {record.comments && (
                              <div className="text-xs text-muted-foreground mt-1 italic">
                                💬 {record.comments}
                              </div>
                            )}
                          </div>
                        </td>
                        {(onEdit || onDelete || onViewDetails) && (
                          <td className="py-3 px-4 text-foreground">
                            <div className="flex flex-col gap-1">
                              {onViewDetails !== undefined && (
                                <button
                                  onClick={() =>
                                    setDetailsModal({
                                      isOpen: true,
                                      record,
                                    })
                                  }
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
                                {onDelete !== undefined &&
                                  (record._id || record._ids) && (
                                    <button
                                      onClick={() =>
                                        setDeleteModal({
                                          isOpen: true,
                                          recordIds: record._ids || [
                                            record._id,
                                          ],
                                          toothNumbers: record.toothNumbers || [
                                            record.toothNumber,
                                          ],
                                          procedure: record.procedure,
                                        })
                                      }
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
                  key={`${record._id || record.toothNumbers?.[0] || record.toothNumber}-${index}`}
                  className="bg-card border border-border rounded-lg p-4 space-y-3 shadow-sm"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap gap-1">
                        {(record.toothNumbers || [record.toothNumber])
                          .sort((a, b) => a - b)
                          .map((toothNum, idx) => (
                            <span
                              key={idx}
                              className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-bold"
                            >
                              #{toothNum}
                            </span>
                          ))}
                      </div>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded w-fit">
                        {formatDate(record.date)}
                      </span>
                    </div>
                    {(onEdit || onDelete || onViewDetails) && (
                      <div className="flex gap-1">
                        {onViewDetails !== undefined && (
                          <button
                            onClick={() =>
                              setDetailsModal({
                                isOpen: true,
                                record,
                              })
                            }
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
                        {onDelete !== undefined &&
                          (record._id || record._ids) && (
                            <button
                              onClick={() =>
                                setDeleteModal({
                                  isOpen: true,
                                  recordIds: record._ids || [record._id],
                                  toothNumbers: record.toothNumbers || [
                                    record.toothNumber,
                                  ],
                                  procedure: record.procedure,
                                })
                              }
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
                      <span className="font-medium text-foreground">
                        Sides:
                      </span>
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
                        <span className="font-medium text-foreground">
                          Procedure:
                        </span>
                        <p className="text-foreground font-medium">
                          {record.procedure}
                        </p>
                      </div>

                      <div>
                        <span className="font-medium text-foreground">
                          Diagnosis:
                        </span>
                        <p className="text-foreground">
                          {record.diagnosis || "-"}
                        </p>
                      </div>
                    </div>

                    {record.fillingType &&
                      record.procedure?.toLowerCase() === "filling" && (
                        <div>
                          <span className="font-medium text-foreground">
                            Filling Type:
                          </span>
                          <p className="text-foreground">
                            {record.fillingType}
                          </p>
                        </div>
                      )}

                    {record.rootCanalType &&
                      record.procedure?.toLowerCase() === "root canal" && (
                        <div>
                          <span className="font-medium text-foreground">
                            Root Canal Type:
                          </span>
                          <p className="text-foreground">
                            {record.rootCanalType}
                          </p>
                        </div>
                      )}

                    {record.comments && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                        <span className="font-medium text-foreground">
                          Comments:
                        </span>
                        <p className="text-foreground mt-1">
                          {record.comments}
                        </p>
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
                  key={`${record._id || record.toothNumbers?.[0] || record.toothNumber}-${index}`}
                  className="bg-card border border-border rounded-lg p-3 space-y-2 shadow-sm"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex flex-wrap gap-1 mb-1">
                        {(record.toothNumbers || [record.toothNumber])
                          .sort((a, b) => a - b)
                          .map((toothNum, idx) => (
                            <span
                              key={idx}
                              className="inline-block bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-xs font-bold"
                            >
                              #{toothNum}
                            </span>
                          ))}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(record.date)}
                      </div>
                    </div>
                    {(onEdit || onDelete || onViewDetails) && (
                      <div className="flex gap-1">
                        {onViewDetails !== undefined && (
                          <button
                            onClick={() =>
                              setDetailsModal({
                                isOpen: true,
                                record,
                              })
                            }
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
                        {onDelete !== undefined &&
                          (record._id || record._ids) && (
                            <button
                              onClick={() =>
                                setDeleteModal({
                                  isOpen: true,
                                  recordIds: record._ids || [record._id],
                                  toothNumbers: record.toothNumbers || [
                                    record.toothNumber,
                                  ],
                                  procedure: record.procedure,
                                })
                              }
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
                      <span className="font-medium text-foreground">
                        Sides:
                      </span>
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
                      <span className="font-medium text-foreground">
                        Procedure:
                      </span>
                      <p className="text-foreground font-medium text-xs">
                        {record.procedure}
                      </p>
                    </div>

                    <div>
                      <span className="font-medium text-foreground">
                        Diagnosis:
                      </span>
                      <p className="text-foreground text-xs">
                        {record.diagnosis || "-"}
                      </p>
                    </div>

                    {record.fillingType &&
                      record.procedure?.toLowerCase() === "filling" && (
                        <div>
                          <span className="font-medium text-foreground">
                            Filling:
                          </span>
                          <p className="text-foreground text-xs">
                            {record.fillingType}
                          </p>
                        </div>
                      )}

                    {record.rootCanalType &&
                      record.procedure?.toLowerCase() === "root canal" && (
                        <div>
                          <span className="font-medium text-foreground">
                            Root Canal:
                          </span>
                          <p className="text-foreground text-xs">
                            {record.rootCanalType}
                          </p>
                        </div>
                      )}

                    {record.comments && (
                      <div className="bg-blue-50 border border-blue-200 rounded p-2">
                        <span className="font-medium text-foreground text-xs">
                          💬 Comments:
                        </span>
                        <p className="text-foreground text-xs mt-0.5">
                          {record.comments}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

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
            onClick={() =>
              setCurrentPage(Math.min(totalPages, currentPage + 1))
            }
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
        description={
          deleteModal.toothNumbers && deleteModal.toothNumbers.length > 1
            ? `Are you sure you want to delete this procedure from teeth #${deleteModal.toothNumbers.sort((a, b) => a - b).join(", #")}? This action cannot be undone.`
            : `Are you sure you want to delete this procedure from tooth #${deleteModal.toothNumbers?.[0]}? This action cannot be undone.`
        }
        itemName={deleteModal.procedure}
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteModal({ isOpen: false })}
      />

      {/* View Details Modal - Responsive */}
      <Dialog
        open={detailsModal.isOpen}
        onOpenChange={(open) => setDetailsModal({ isOpen: open })}
      >
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full mx-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              Procedure Details -{" "}
              {detailsModal.record?.toothNumbers &&
              detailsModal.record.toothNumbers.length > 1
                ? `Teeth #${detailsModal.record.toothNumbers.sort((a, b) => a - b).join(", #")}`
                : `Tooth #${detailsModal.record?.toothNumbers?.[0] || detailsModal.record?.toothNumber}`}
            </DialogTitle>
          </DialogHeader>

          {detailsModal.record && (
            <div className="space-y-4 text-sm sm:text-base">
              <div className="bg-muted rounded-lg p-3 sm:p-4 space-y-3 sm:space-y-4">
                <div>
                  <span className="font-semibold text-foreground">
                    Sides Affected:
                  </span>
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
                  <span className="font-semibold text-foreground">
                    Procedure:
                  </span>
                  <p className="mt-1 text-foreground">
                    {detailsModal.record.procedure}
                  </p>
                </div>

                <div>
                  <span className="font-semibold text-foreground">
                    Diagnosis:
                  </span>
                  <p className="mt-1 text-foreground">
                    {detailsModal.record.diagnosis || "-"}
                  </p>
                </div>

                <div>
                  <span className="font-semibold text-foreground">Date:</span>
                  <p className="mt-1 text-foreground">
                    {formatDate(detailsModal.record.date)}
                  </p>
                </div>

                {detailsModal.record.procedure?.toLowerCase() === "filling" &&
                  detailsModal.record.fillingType && (
                    <div>
                      <span className="font-semibold text-foreground">
                        Filling Type:
                      </span>
                      <p className="mt-1 text-foreground">
                        {detailsModal.record.fillingType}
                      </p>
                    </div>
                  )}

                {detailsModal.record.comments && (
                  <div className="pt-2 border-t border-border">
                    <span className="font-semibold text-foreground">
                      Comments:
                    </span>
                    <p className="mt-1 text-foreground whitespace-pre-wrap text-sm">
                      {detailsModal.record.comments}
                    </p>
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

      {/* View General Procedure Modal */}
      <Dialog
        open={viewGeneralProcedureModal.isOpen}
        onOpenChange={(open) =>
          setViewGeneralProcedureModal({
            ...viewGeneralProcedureModal,
            isOpen: open,
          })
        }
      >
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full mx-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              Procedure Details
            </DialogTitle>
          </DialogHeader>

          {viewGeneralProcedureModal.record && (
            <div className="space-y-4 text-sm sm:text-base">
              <div className="bg-muted rounded-lg p-3 sm:p-4 space-y-3 sm:space-y-4">
                <div>
                  <span className="font-semibold text-foreground">
                    Procedure Name:
                  </span>
                  <p className="mt-1 text-foreground">
                    {viewGeneralProcedureModal.record.name}
                  </p>
                </div>

                <div>
                  <span className="font-semibold text-foreground">Date:</span>
                  <p className="mt-1 text-foreground">
                    {new Date(
                      viewGeneralProcedureModal.record.date,
                    ).toLocaleDateString()}
                  </p>
                </div>

                {/* <div>
                  <span className="font-semibold text-foreground">
                    Patient Name:
                  </span>
                  <p className="mt-1 text-foreground">
                    {viewGeneralProcedureModal.record.patientName || "-"}
                  </p>
                </div> */}

                <div>
                  <span className="font-semibold text-foreground">
                    Doctor Name:
                  </span>
                  <p className="mt-1 text-foreground">
                    {viewGeneralProcedureModal.record.createdByName || "-"}
                  </p>
                </div>

                {viewGeneralProcedureModal.record.comments && (
                  <div className="pt-2 border-t border-border">
                    <span className="font-semibold text-foreground">
                      Comments:
                    </span>
                    <p className="mt-1 text-foreground whitespace-pre-wrap text-sm">
                      {viewGeneralProcedureModal.record.comments}
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={() => setViewGeneralProcedureModal({ isOpen: false })}
                className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm sm:text-base cursor-pointer"
              >
                Close
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
