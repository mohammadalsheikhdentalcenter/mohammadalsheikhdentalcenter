"use client"

import { useState } from "react"

interface ToothStatus {
  status: string
  notes?: string
}

interface ToothChartProps {
  teeth: Record<number, ToothStatus>
  onToothClick: (toothNumber: number) => void
  readOnly?: boolean
  onToothStatusChange?: (toothNumber: number, newStatus: string) => void
}

const TREATMENT_OPTIONS = [
  { value: "healthy", label: "Healthy" },
  { value: "cavity", label: "Cavity" },
  { value: "filling", label: "Filling" },
  { value: "root_canal", label: "Root Canal" },
  { value: "crown", label: "Crown" },
  { value: "implant", label: "Implant" },
  { value: "treated", label: "Treated" },
  { value: "missing", label: "Missing" },
]

export function ToothChartVisual({ teeth, onToothClick, readOnly = false, onToothStatusChange }: ToothChartProps) {
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null)
  const [openDropdown, setOpenDropdown] = useState<number | null>(null)

  // Image mapping
  const getToothImageNumber = (toothNumber: number): number => {
    const toothImageMap: Record<number, number> = {
      18: 1,
      17: 2,
      16: 3,
      15: 4,
      14: 5,
      13: 6,
      12: 7,
      11: 8,
      21: 9,
      22: 10,
      23: 11,
      24: 12,
      25: 13,
      26: 14,
      27: 15,
      28: 16,
      38: 17,
      37: 18,
      36: 19,
      35: 20,
      34: 21,
      33: 22,
      32: 23,
      31: 24,
      41: 25,
      42: 26,
      43: 27,
      44: 28,
      45: 29,
      46: 30,
      47: 31,
      48: 32,
    }
    return toothImageMap[toothNumber] || toothNumber
  }

  const getToothColor = (status: string) => {
    const colors: Record<string, string> = {
      healthy: "#10b981",
      cavity: "#ef4444",
      missing: "#9ca3af",
      filling: "#f59e0b",
      root_canal: "#f97316",
      crown: "#8b5cf6",
      implant: "#3b82f6",
      treated: "#06b6d4",
    }
    const normalizedStatus = status.replace("-", "_")
    return colors[normalizedStatus] || "#3b82f6"
  }

  const getStatusDisplayName = (status: string) => {
    const statusNames: Record<string, string> = {
      healthy: "Healthy",
      cavity: "Cavity",
      missing: "Missing",
      filling: "Filling",
      root_canal: "Root Canal",
      crown: "Crown",
      implant: "Implant",
      treated: "Treated",
    }
    return statusNames[status] || status
  }

  const getToothIndicator = (status: string) => {
    switch (status) {
      case "filling":
        return "▓"
      case "implant":
        return "⊙"
      case "missing":
        return "✕"
      case "cavity":
        return "●"
      default:
        return ""
    }
  }

  // Tooth names based on FDI numbering
  const getToothName = (toothNumber: number): string => {
    const toothNames: Record<number, string> = {
      11: "(R)Central Incisor",
      12: "(R)Lateral Incisor",
      13: "(R)Cuspid (Canine)",
      14: "(R)First Bicuspid",
      15: "(R)Second Bicuspid",
      16: "(R)First Molar",
      17: "(R)Second Molar",
      18: "(R)Third Molar",
      21: "(L)Central Incisor",
      22: "(L)Lateral Incisor",
      23: "(L)Cuspid (Canine)",
      24: "(L)First Bicuspid",
      25: "(L)Second Bicuspid",
      26: "(L)First Molar",
      27: "(L)Second Molar",
      28: "(L)Third Molar",
      31: "(L)Central Incisor",
      32: "(L)Lateral Incisor",
      33: "(L)Cuspid (Canine)",
      34: "(L)First Bicuspid",
      35: "(L)Second Bicuspid",
      36: "(L)First Molar",
      37: "(L)Second Molar",
      38: "(L)Third Molar",
      41: "(R)Central Incisor",
      42: "(R)Lateral Incisor",
      43: "(R)Cuspid (Canine)",
      44: "(R)First Bicuspid",
      45: "(R)Second Bicuspid",
      46: "(R)First Molar",
      47: "(R)Second Molar",
      48: "(R)Third Molar",
    }
    return toothNames[toothNumber] || ""
  }

  // Tooth image rendering
  const ToothImage = ({ toothNumber, status }: { toothNumber: number; status: string }) => {
    const [imageError, setImageError] = useState(false)
    const imageNumber = getToothImageNumber(toothNumber)

    return (
      <div className="relative w-full h-full flex items-center justify-center bg-white rounded-lg overflow-hidden">
        {status === "missing" ? (
          <div className="w-full h-full flex items-center justify-center border-4 border-dashed border-gray-400 bg-gray-100">
            <div className="text-gray-600 text-2xl font-bold">✕</div>
          </div>
        ) : imageError ? (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <div className="text-gray-600 text-xs font-bold text-center px-1">{toothNumber}</div>
          </div>
        ) : (
          <img
            src={`/teeth/teeth${imageNumber}.png`}
            alt={`Tooth ${toothNumber}`}
            className="w-full h-full object-contain p-2"
            onError={() => setImageError(true)}
          />
        )}
      </div>
    )
  }

  const renderTeethRow = (toothNumbers: number[], bgColor: string, borderColor: string) => (
    <div
      className={`grid grid-cols-4 sm:grid-cols-8 gap-1 sm:gap-2 md:gap-3 p-2 sm:p-4 md:p-6 ${bgColor} rounded-lg border ${borderColor}`}
    >
      {toothNumbers.map((toothNum) => {
        const toothStatus = teeth[toothNum]?.status || "healthy"
        const toothNotes = teeth[toothNum]?.notes || ""
        const statusDisplayName = getStatusDisplayName(toothStatus)
        const indicator = getToothIndicator(toothStatus)
        const isTreated = toothStatus !== "healthy" && toothStatus !== "missing"

        return (
          <div key={toothNum} className="relative flex flex-col items-center">
            <div className="relative w-full">
              <button
                onClick={() => {
                  setSelectedTooth(toothNum)
                  setOpenDropdown(openDropdown === toothNum ? null : toothNum)
                }}
                disabled={readOnly}
                className={`relative h-16 sm:h-20 md:h-28 w-full rounded-lg flex flex-col items-center justify-center transition-all overflow-visible border-2 sm:border-4 group
                  ${readOnly ? "cursor-default" : "hover:shadow-md cursor-pointer hover:scale-105"}
                  ${selectedTooth === toothNum ? "ring-2 ring-offset-2 ring-primary" : ""}
                `}
                style={{
                  borderColor: getToothColor(toothStatus),
                }}
              >
                {/* Tooth image */}
                <div className="w-full h-full">
                  <ToothImage toothNumber={toothNum} status={toothStatus} />
                </div>

                {indicator && (
                  <div
                    className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 w-3 sm:w-4 md:w-5 h-3 sm:h-4 md:h-5 rounded-full flex items-center justify-center text-white text-[10px] sm:text-[8px] font-bold shadow-md"
                    style={{ backgroundColor: getToothColor(toothStatus) }}
                  >
                    {indicator}
                  </div>
                )}

                {/* Tooltip - responsive positioning */}
                <div className="hidden sm:block absolute -top-12 sm:-top-14 md:-top-16 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white border border-gray-300 rounded-md shadow-md px-2 py-1 text-center z-50 min-w-[120px]">
                  <p className="text-red-600 font-semibold text-xs">{toothNum}</p>
                  <p className="text-gray-700 text-[10px]">{getToothName(toothNum)}</p>
                  <p
                    className="text-gray-600 text-[10px] font-medium mt-1"
                    style={{ color: getToothColor(toothStatus) }}
                  >
                    Status: {statusDisplayName}
                  </p>
                  {toothNotes && <p className="text-gray-600 text-[10px] mt-1">Notes: {toothNotes}</p>}
                </div>
              </button>

              {!readOnly && openDropdown === toothNum && (
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 min-w-[100px]">
                  {TREATMENT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        onToothStatusChange?.(toothNum, option.value)
                        setOpenDropdown(null)
                      }}
                      className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                        toothStatus === option.value
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "text-foreground hover:bg-muted"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {isTreated && (
              <div
                className="text-white text-[10px] sm:text-[10px] font-medium px-1.5 py-0.5 rounded mt-1 text-center whitespace-nowrap max-w-full"
                style={{ backgroundColor: getToothColor(toothStatus) }}
              >
                {statusDisplayName}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Upper Teeth */}
      <div>
        <h3 className="font-semibold text-foreground mb-2 sm:mb-3 text-sm md:text-base">Upper Teeth</h3>
        {renderTeethRow(
          [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28],
          "bg-blue-50",
          "border-blue-200",
        )}
      </div>

      {/* Lower Teeth */}
      <div>
        <h3 className="font-semibold text-foreground mb-2 sm:mb-3 text-sm md:text-base">Lower Teeth</h3>
        {renderTeethRow(
          [38, 37, 36, 35, 34, 33, 32, 31, 41, 42, 43, 44, 45, 46, 47, 48],
          "bg-green-50",
          "border-green-200",
        )}
      </div>

      {/* Legend - responsive grid */}
      <div className="p-3 sm:p-4 bg-muted rounded-lg border border-border">
        <h3 className="font-semibold text-foreground mb-3 text-sm md:text-base">Tooth Status Legend</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3 text-xs">
          <LegendItem color="#10b981" label="Healthy" />
          <LegendItem color="#ef4444" label="Cavity" indicator="●" />
          <LegendItem color="#9ca3af" label="Missing" dashed indicator="✕" />
          <LegendItem color="#f59e0b" label="Filling" indicator="▓" />
          <LegendItem color="#f97316" label="Root Canal" />
          <LegendItem color="#8b5cf6" label="Crown" />
          <LegendItem color="#3b82f6" label="Implant" indicator="⊙" />
          <LegendItem color="#06b6d4" label="Treated" />
        </div>
      </div>

      {/* Notation Guide - responsive layout */}
      <div className="p-3 sm:p-4 bg-amber-50 rounded-lg border border-amber-200">
        <h3 className="font-semibold text-foreground mb-2 text-sm md:text-base">Dental Notation Guide</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs md:text-sm">
          <div>
            <p className="font-medium mb-1 text-foreground">Upper Teeth:</p>
            <p className="text-muted-foreground">11–18 (Upper Right) / 21–28 (Upper Left)</p>
          </div>
          <div>
            <p className="font-medium mb-1 text-foreground">Lower Teeth:</p>
            <p className="text-muted-foreground">31–38 (Lower Left) / 41–48 (Lower Right)</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function LegendItem({
  color,
  label,
  dashed = false,
  indicator,
}: { color: string; label: string; dashed?: boolean; indicator?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-4 h-4 rounded border-4 ${dashed ? "border-dashed" : ""} flex items-center justify-center`}
        style={{ borderColor: color, backgroundColor: "#f8fafc" }}
      >
        {indicator && (
          <span className="text-[12px] font-bold" style={{ color }}>
            {indicator}
          </span>
        )}
      </div>
      <span className="text-foreground">{label}</span>
    </div>
  )
}
