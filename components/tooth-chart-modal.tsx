//@ts-nocheck
"use client";

import React from "react";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const TOOTH_SIDES = ["Distal", "Mesial", "Occlusal", "Incisal", "Cervical"];
const COMMON_PROCEDURES = [
  "Filling",
  "Root Canal",
  "Crown",
  "Extraction",
  "Cleaning",
  "Whitening",
  "Bridge",
  "Implant",
];

interface ToothModalProps {
  isOpen: boolean;
  toothNumber: number | null;
  existingData?: {
    _id?: string;
    toothNumbers?: number[];
    sides?: string[];
    procedure?: string;
    diagnosis?: string;
    comments?: string;
    date?: string;
    fillingType?: string;
    rootCanalType?: string;
  };
  onClose: () => void;
  onSave: (data: {
    toothNumber: number;
    toothNumbers?: number[];
    sides: string[];
    procedure: string;
    diagnosis: string;
    comments: string;
    date: string;
    fillingType?: string;
    rootCanalType?: string;
  }) => void;
}

const FILLING_TYPES = [
  "Composite Resin",
  "Amalgam",
  "Glass Ionomer",
  "Resin-Modified Glass Ionomer",
  "Temporary Filling",
  "Other",
];

const ROOT_CANAL_TYPES = [
  "Single Canal",
  "Two Canals",
  "Three Canals",
  "Four Canals",
  "Retreatment",
  "Other",
];

// All teeth numbers for multi-selection
const ALL_TEETH = [
  18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28, 48, 47, 46,
  45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38,
];

export function ToothChartModal({
  isOpen,
  toothNumber,
  existingData,
  onClose,
  onSave,
}: ToothModalProps) {
  const [selectedSides, setSelectedSides] = useState<string[]>([]);
  const [selectedTeeth, setSelectedTeeth] = useState<number[]>([]);
  const [procedure, setProcedure] = useState("");
  const [customProcedure, setCustomProcedure] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [comments, setComments] = useState("");
  const [fillingType, setFillingType] = useState("");
  const [rootCanalType, setRootCanalType] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [showCustom, setShowCustom] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [enableMultiSelect, setEnableMultiSelect] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Update form state when modal opens with new data
  useEffect(() => {
    if (isOpen) {
      if (existingData && existingData._id) {
        // Editing mode - load procedure data
        setIsEditing(true);
        // Enable multi-select if editing a grouped record with multiple teeth
        const hasMultipleTeeth =
          existingData.toothNumbers && existingData.toothNumbers.length > 1;
        setEnableMultiSelect(hasMultipleTeeth);
        // Use toothNumbers from existingData if available, otherwise use single toothNumber
        setSelectedTeeth(
          existingData.toothNumbers || (toothNumber ? [toothNumber] : []),
        );
        setSelectedSides(existingData.sides || []);
        setDiagnosis(existingData.diagnosis || "");
        setComments(existingData.comments || "");
        setFillingType(existingData.fillingType || "");
        setRootCanalType(existingData.rootCanalType || "");
        // Handle date - ensure it's in YYYY-MM-DD format
        let formattedDate = new Date().toISOString().split("T")[0];
        if (existingData.date) {
          if (typeof existingData.date === "string") {
            formattedDate = existingData.date.split("T")[0]; // Remove time part if present
          } else if (existingData.date instanceof Date) {
            formattedDate = existingData.date.toISOString().split("T")[0];
          }
        }
        setDate(formattedDate);

        // Handle procedure - check if it's custom or predefined
        const proc = existingData.procedure || "";
        if (
          COMMON_PROCEDURES.some((p) => p.toLowerCase() === proc.toLowerCase())
        ) {
          setProcedure(proc);
          setCustomProcedure("");
          setShowCustom(false);
        } else if (proc) {
          setProcedure("");
          setCustomProcedure(proc);
          setShowCustom(true);
        } else {
          setProcedure("");
          setCustomProcedure("");
          setShowCustom(false);
        }
      } else {
        // New procedure mode - reset form
        setIsEditing(false);
        setEnableMultiSelect(false);
        setSelectedTeeth(toothNumber ? [toothNumber] : []);
        setSelectedSides([]);
        setProcedure("");
        setCustomProcedure("");
        setDiagnosis("");
        setComments("");
        setFillingType("");
        setRootCanalType("");
        setDate(new Date().toISOString().split("T")[0]);
        setShowCustom(false);
      }
    }
  }, [isOpen, existingData, toothNumber]);

  // Auto-select all sides when "Whitening" is selected
  useEffect(() => {
    const selectedProcedure = showCustom ? customProcedure : procedure;
    if (selectedProcedure.toLowerCase() === "whitening") {
      setSelectedSides(TOOTH_SIDES);
    }
  }, [procedure, customProcedure, showCustom]);

  const handleSidToggle = (side: string) => {
    setSelectedSides((prev) =>
      prev.includes(side) ? prev.filter((s) => s !== side) : [...prev, side],
    );
  };

  const handleToothToggle = (tooth: number) => {
    setSelectedTeeth((prev) =>
      prev.includes(tooth) ? prev.filter((t) => t !== tooth) : [...prev, tooth],
    );
  };

  const handleProcedureChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === "other") {
      setShowCustom(true);
      setProcedure("");
    } else {
      setShowCustom(false);
      setProcedure(value);
      setCustomProcedure("");

      // Auto-select all sides for whitening
      if (value.toLowerCase() === "whitening") {
        // Don't auto-select - let user choose
        setSelectedSides([]);
      }
    }
  };

  const handleSave = async () => {
    // Prevent double-click
    if (isSaving) {
      return;
    }

    const finalProcedure = showCustom ? customProcedure : procedure;

    // Validate teeth selection
    if (enableMultiSelect && selectedTeeth.length === 0) {
      alert("Please select at least one tooth");
      return;
    }

    if (!enableMultiSelect && !toothNumber) {
      return;
    }

    if (!selectedSides.length || !finalProcedure) {
      alert("Please select at least one side and a procedure");
      return;
    }

    // Check if filling type is required when procedure is "Filling"
    if (finalProcedure.toLowerCase() === "filling" && !fillingType) {
      alert("Please select a filling type");
      return;
    }

    // Check if root canal type is required when procedure is "Root Canal"
    if (finalProcedure.toLowerCase() === "root canal" && !rootCanalType) {
      alert("Please select a root canal type");
      return;
    }

    const saveData = {
      toothNumber: enableMultiSelect ? selectedTeeth[0] : toothNumber!,
      toothNumbers: enableMultiSelect ? selectedTeeth : undefined,
      sides: selectedSides,
      procedure: finalProcedure,
      diagnosis,
      comments,
      date,
      fillingType,
      rootCanalType,
    };

    console.log("[ToothChartModal] Saving data:", saveData);
    console.log("[ToothChartModal] enableMultiSelect:", enableMultiSelect);
    console.log("[ToothChartModal] selectedTeeth:", selectedTeeth);

    // Set loading state
    setIsSaving(true);

    try {
      await onSave(saveData);
    } finally {
      // Reset loading state after save completes
      setIsSaving(false);
    }
    // Don't reset form here - let the parent component close the modal
  };

  const resetForm = () => {
    setSelectedSides([]);
    setSelectedTeeth([]);
    setProcedure("");
    setCustomProcedure("");
    setDiagnosis("");
    setComments("");
    setFillingType("");
    setRootCanalType("");
    setDate(new Date().toISOString().split("T")[0]);
    setShowCustom(false);
    setEnableMultiSelect(false);
    setIsSaving(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {enableMultiSelect && selectedTeeth.length > 1
              ? `Teeth #${selectedTeeth.sort((a, b) => a - b).join(", #")} - Enter Procedure Details`
              : enableMultiSelect
                ? `Multiple Teeth - Enter Procedure Details`
                : `Tooth #${toothNumber} - Enter Procedure Details`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Multi-Select Toggle */}
          <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <input
              type="checkbox"
              id="multiSelect"
              checked={enableMultiSelect}
              onChange={(e) => {
                setEnableMultiSelect(e.target.checked);
                if (!e.target.checked) {
                  setSelectedTeeth(toothNumber ? [toothNumber] : []);
                }
              }}
              className="w-4 h-4 cursor-pointer"
              disabled={isEditing}
            />
            <Label
              htmlFor="multiSelect"
              className={`text-sm font-medium ${isEditing ? "cursor-default" : "cursor-pointer"}`}
            >
              Apply same procedure to multiple teeth
            </Label>
          </div>

          {/* Multiple Teeth Selection */}
          {enableMultiSelect && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Select Teeth</Label>
              <div className="grid grid-cols-8 gap-1 p-3 bg-gray-50 rounded-lg border border-gray-200 max-h-32 overflow-y-auto">
                {ALL_TEETH.map((tooth) => (
                  <button
                    key={tooth}
                    onClick={() => handleToothToggle(tooth)}
                    className={`py-1 px-1 text-xs font-medium cursor-pointer rounded border transition-colors ${
                      selectedTeeth.includes(tooth)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-white border-border hover:bg-gray-100"
                    }`}
                  >
                    {tooth}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Selected: {selectedTeeth.length}{" "}
                {selectedTeeth.length === 1 ? "tooth" : "teeth"}
              </p>
            </div>
          )}

          {/* Tooth Sides */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Select Tooth Sides</Label>
            <div className="grid grid-cols-5 gap-2">
              {TOOTH_SIDES.map((side) => (
                <button
                  key={side}
                  onClick={() => handleSidToggle(side)}
                  className={`py-2 px-1 text-xs font-medium cursor-pointer  rounded border transition-colors ${
                    selectedSides.includes(side)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted border-border hover:bg-input"
                  }`}
                >
                  {side}
                </button>
              ))}
            </div>
          </div>

          {/* Diagnosis */}
          <div className="space-y-2">
            <Label htmlFor="diagnosis" className="text-sm font-medium">
              Diagnosis
            </Label>
            <Input
              id="diagnosis"
              placeholder="e.g., Cavity, Decay, Discoloration"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              className="text-sm"
            />
          </div>

          {/* Procedure Dropdown */}
          <div className="space-y-2">
            <Label htmlFor="procedure" className="text-sm font-medium">
              Procedure Done
            </Label>
            <select
              id="procedure"
              value={showCustom ? "other" : procedure}
              onChange={handleProcedureChange}
              className="w-full px-3 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-sm"
            >
              <option value="">Select a procedure...</option>
              {COMMON_PROCEDURES.map((proc) => (
                <option key={proc} value={proc}>
                  {proc}
                </option>
              ))}
              <option value="other">Other (type custom)</option>
            </select>
          </div>

          {/* Custom Procedure Input */}
          {showCustom && (
            <div className="space-y-2">
              <Label htmlFor="customProcedure" className="text-sm font-medium">
                Custom Procedure
              </Label>
              <Input
                id="customProcedure"
                placeholder="Type the procedure name..."
                value={customProcedure}
                onChange={(e) => setCustomProcedure(e.target.value)}
                className="text-sm"
              />
            </div>
          )}

          {/* Filling Type Input - Show only when "Filling" is selected */}
          {(procedure.toLowerCase() === "filling" ||
            (showCustom && customProcedure.toLowerCase() === "filling")) && (
            <div className="space-y-2">
              <Label htmlFor="fillingType" className="text-sm font-medium">
                Filling Type <span className="text-red-500">*</span>
              </Label>
              <select
                id="fillingType"
                value={fillingType}
                onChange={(e) => setFillingType(e.target.value)}
                className="w-full px-3 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-sm"
              >
                <option value="">Select filling type...</option>
                {FILLING_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Root Canal Type Input - Show only when "Root Canal" is selected */}
          {(procedure.toLowerCase() === "root canal" ||
            (showCustom && customProcedure.toLowerCase() === "root canal")) && (
            <div className="space-y-2">
              <Label htmlFor="rootCanalType" className="text-sm font-medium">
                Root Canal Type <span className="text-red-500">*</span>
              </Label>
              <select
                id="rootCanalType"
                value={rootCanalType}
                onChange={(e) => setRootCanalType(e.target.value)}
                className="w-full px-3 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-sm"
              >
                <option value="">Select root canal type...</option>
                {ROOT_CANAL_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date" className="text-sm font-medium">
              Date of Procedure
            </Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="text-sm"
            />
          </div>

          {/* Comments */}
          <div className="space-y-2">
            <Label htmlFor="comments" className="text-sm font-medium">
              Comments
            </Label>
            <Textarea
              id="comments"
              placeholder="Add any additional notes about this procedure..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="text-sm"
              rows={3}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1 bg-transparent cursor-pointer "
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1 cursor-pointer "
              disabled={isSaving}
            >
              {isSaving ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  {isEditing ? "Updating..." : "Saving..."}
                </span>
              ) : (
                <>{isEditing ? "Update" : "Save"}</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
