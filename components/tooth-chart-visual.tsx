"use client"

import { useState } from "react"

interface ToothStatus {
  status: string
  diagnosis?: string
  procedure?: string
  fillingType?: string
  notes?: string
}

interface ToothChartProps {
  teeth: Record<number, ToothStatus>
  onToothClick: (toothNumber: number) => void
  readOnly?: boolean
  onToothStatusChange?: (toothNumber: number, newStatus: string) => void
  onToothDiagnosisChange?: (toothNumber: number, diagnosis: string) => void
  onToothProcedureChange?: (toothNumber: number, procedure: string) => void
  onToothFillingTypeChange?: (toothNumber: number, fillingType: string) => void
  onToothNotesChange?: (toothNumber: number, notes: string) => void
}

export function ToothChartVisual({ 
  teeth, 
  onToothClick, 
  readOnly = false, 
  onToothStatusChange,
  onToothDiagnosisChange,
  onToothProcedureChange,
  onToothFillingTypeChange,
  onToothNotesChange
}: ToothChartProps) {
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null)

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
    // Blue (#3b82f6) for all treated teeth (has procedure)
    // Gray for healthy/no procedure
    const hasProcedure = status !== "healthy" && status !== "missing"
    if (hasProcedure) {
      return "#3b82f6" // Blue color for all procedures
    }
    return "#d1d5db" // Light gray for healthy/no procedure
  }

  const getStatusDisplayName = (status: string) => {
    // Unified display name for all procedures
    if (status !== "healthy" && status !== "missing") {
      return "Procedure Done"
    }
    return status === "healthy" ? "Healthy" : "Missing"
  }

  const getToothIndicator = (status: string) => {
    // No indicators needed - single color indicates procedures
    return ""
  }

  // Tooth names based on FDI numbering
  const getToothName = (toothNumber: number): string => {
    const toothNames: Record<number, string> = {
      11: "Upper Right Central Incisor",
      12: "Upper Right Lateral Incisor",
      13: "Upper Right Canine",
      14: "Upper Right First Premolar",
      15: "Upper Right Second Premolar",
      16: "Upper Right First Molar",
      17: "Upper Right Second Molar",
      18: "Upper Right Third Molar",
      21: "Upper Left Central Incisor",
      22: "Upper Left Lateral Incisor",
      23: "Upper Left Canine",
      24: "Upper Left First Premolar",
      25: "Upper Left Second Premolar",
      26: "Upper Left First Molar",
      27: "Upper Left Second Molar",
      28: "Upper Left Third Molar",
      31: "Lower Left Central Incisor",
      32: "Lower Left Lateral Incisor",
      33: "Lower Left Canine",
      34: "Lower Left First Premolar",
      35: "Lower Left Second Premolar",
      36: "Lower Left First Molar",
      37: "Lower Left Second Molar",
      38: "Lower Left Third Molar",
      41: "Lower Right Central Incisor",
      42: "Lower Right Lateral Incisor",
      43: "Lower Right Canine",
      44: "Lower Right First Premolar",
      45: "Lower Right Second Premolar",
      46: "Lower Right First Molar",
      47: "Lower Right Second Molar",
      48: "Lower Right Third Molar",
    }
    return toothNames[toothNumber] || `Tooth ${toothNumber}`
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
        const toothName = getToothName(toothNum)
        const statusDisplayName = getStatusDisplayName(toothStatus)
        const indicator = getToothIndicator(toothStatus)
        const isTreated = toothStatus !== "healthy" && toothStatus !== "missing"
        const isMissing = toothStatus === "missing"
        const isHealthy = toothStatus === "healthy"

        return (
          <div key={toothNum} className="relative flex flex-col items-center">
            <div className="relative w-full">
              <button
                onClick={() => {
                  setSelectedTooth(toothNum)
                  onToothClick(toothNum)
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
                {/* Tooth number label - placed in top left corner */}
                <div className="absolute top-0 left-0 transform -translate-y-1/2 -translate-x-1/4 z-10">
                  <div className="font-bold text-gray-700 bg-white rounded-full w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 flex items-center justify-center text-xs sm:text-xs shadow-sm border border-gray-300">
                    {toothNum}
                  </div>
                </div>

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

                {/* Tooltip for all teeth - responsive positioning */}
                <div className="hidden sm:block absolute -top-12 sm:-top-14 md:-top-16 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white border border-gray-300 rounded-md shadow-md px-3 py-2 text-center z-50 min-w-[180px] max-w-[220px]">
                  <div className="font-semibold text-xs text-gray-800 mb-1">
                    {toothName}
                  </div>
                  <div className="text-xs text-gray-600">
                    {isMissing ? (
                      <div className="font-medium text-amber-600">Status: Missing</div>
                    ) : isTreated ? (
                      <>
                        <div className="font-medium text-indigo-600 mb-1">Status: Procedure Done</div>
                      </>
                    ) : (
                      <div className="font-medium text-green-600">Status: Healthy</div>
                    )}
                  </div>
                </div>
              </button>
            </div>
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
