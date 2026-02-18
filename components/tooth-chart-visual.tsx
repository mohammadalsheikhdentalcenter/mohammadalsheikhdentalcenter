//@ts-nocheck
"use client";

import { useState, useEffect, useRef } from "react";

interface ToothStatus {
  status: string;
  diagnosis?: string;
  procedure?: string;
  fillingType?: string;
  notes?: string;
}

interface ToothChartProps {
  teeth: Record<number, ToothStatus>;
  onToothClick: (toothNumber: number) => void;
  readOnly?: boolean;
  onToothStatusChange?: (toothNumber: number, newStatus: string) => void;
  onToothDiagnosisChange?: (toothNumber: number, diagnosis: string) => void;
  onToothProcedureChange?: (toothNumber: number, procedure: string) => void;
  onToothFillingTypeChange?: (toothNumber: number, fillingType: string) => void;
  onToothNotesChange?: (toothNumber: number, notes: string) => void;
}

export function ToothChartVisual({
  teeth,
  onToothClick,
  readOnly = false,
  onToothStatusChange,
  onToothDiagnosisChange,
  onToothProcedureChange,
  onToothFillingTypeChange,
  onToothNotesChange,
}: ToothChartProps) {
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showTooltip, setShowTooltip] = useState<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Check if mobile on mount and window resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Center the scroll position on mount for mobile
  useEffect(() => {
    if (isMobile && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const scrollWidth = container.scrollWidth;
      const containerWidth = container.clientWidth;
      container.scrollLeft = (scrollWidth - containerWidth) / 2;
    }
  }, [isMobile]);

  // Handle touch events for mobile tooltips
  const handleToothTouch = (toothNum: number, e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (readOnly) return;
    
    // Toggle tooltip on touch
    setShowTooltip(prev => prev === toothNum ? null : toothNum);
    
    // Also trigger the click
    setSelectedTooth(toothNum);
    onToothClick(toothNum);
  };

  // Close tooltip when touching outside
  useEffect(() => {
    const handleTouchOutside = () => {
      setShowTooltip(null);
    };

    if (isMobile) {
      document.addEventListener('touchstart', handleTouchOutside);
      return () => document.removeEventListener('touchstart', handleTouchOutside);
    }
  }, [isMobile]);

  // Image mapping
  const getToothImageNumber = (toothNumber: number): number => {
    const toothImageMap: Record<number, number> = {
      18: 1, 17: 2, 16: 3, 15: 4, 14: 5, 13: 6, 12: 7, 11: 8,
      21: 9, 22: 10, 23: 11, 24: 12, 25: 13, 26: 14, 27: 15, 28: 16,
      38: 17, 37: 18, 36: 19, 35: 20, 34: 21, 33: 22, 32: 23, 31: 24,
      41: 25, 42: 26, 43: 27, 44: 28, 45: 29, 46: 30, 47: 31, 48: 32,
    };
    return toothImageMap[toothNumber] || toothNumber;
  };

  const getToothColor = (status: string) => {
    const hasProcedure = status !== "healthy" && status !== "missing";
    if (hasProcedure) {
      return "#3b82f6";
    }
    return "#d1d5db";
  };

  const getStatusDisplayName = (status: string) => {
    if (status !== "healthy" && status !== "missing") {
      return "Procedure Done";
    }
    return status === "healthy" ? "Healthy" : "Missing";
  };

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
    };
    return toothNames[toothNumber] || `Tooth ${toothNumber}`;
  };

  // Tooth image rendering
  const ToothImage = ({
    toothNumber,
    status,
  }: {
    toothNumber: number;
    status: string;
  }) => {
    const [imageError, setImageError] = useState(false);
    const imageNumber = getToothImageNumber(toothNumber);

    return (
      <div className="relative w-full h-full flex items-center justify-center bg-white rounded-lg overflow-hidden">
        {status === "missing" ? (
          <div className="w-full h-full flex items-center justify-center border-2 border-dashed border-gray-400 bg-gray-100">
            <div className="text-gray-600 text-sm sm:text-base md:text-lg font-bold">✕</div>
          </div>
        ) : imageError ? (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <div className="text-gray-600 text-xs sm:text-sm font-bold text-center px-1">
              {toothNumber}
            </div>
          </div>
        ) : (
          <img
            src={`/teeth/teeth${imageNumber}.png`}
            alt={`Tooth ${toothNumber}`}
            className="w-full h-full object-contain p-0.5"
            onError={() => setImageError(true)}
            loading="lazy"
          />
        )}
      </div>
    );
  };

  const renderToothBox = (toothNum: number, isUpper: boolean) => {
    const toothStatus = teeth[toothNum]?.status || "healthy";
    const toothName = getToothName(toothNum);
    const isTreated = toothStatus !== "healthy" && toothStatus !== "missing";
    const isMissing = toothStatus === "missing";
    const showTooltipForThisTooth = showTooltip === toothNum;

    // Responsive sizes
    const getToothSize = () => {
      if (isMobile) {
        return "h-14 w-8"; // Fixed size for mobile
      }
      return "h-16 w-9 sm:h-20 sm:w-11 md:h-24 md:w-12"; // Desktop sizes
    };

    return (
      <div
        key={toothNum}
        className="relative flex flex-col items-center flex-shrink-0 overflow-visible"
      >
        <div className="relative z-40">
          <button
            onClick={() => {
              setSelectedTooth(toothNum);
              onToothClick(toothNum);
              if (isMobile) {
                setShowTooltip(toothNum);
                // Auto-hide tooltip after 2 seconds on mobile
                setTimeout(() => setShowTooltip(null), 2000);
              }
            }}
            onTouchStart={(e) => handleToothTouch(toothNum, e)}
            onTouchEnd={(e) => e.preventDefault()}
            disabled={readOnly}
            className={`relative ${getToothSize()} rounded flex flex-col items-center justify-center transition-all overflow-visible border-2 bg-white group
              ${readOnly ? "cursor-default" : isMobile ? "active:scale-95 active:bg-gray-50" : "hover:shadow-lg cursor-pointer hover:scale-105"}
              ${selectedTooth === toothNum ? "ring-2 ring-offset-1 ring-blue-500 border-blue-500" : "border-gray-300"}
              ${isMobile ? "touch-manipulation" : ""}
            `}
            style={{
              borderColor:
                selectedTooth === toothNum
                  ? "#3b82f6"
                  : getToothColor(toothStatus),
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {/* Tooth number label */}
            <div
              className={`absolute ${isUpper ? "bottom-0.5" : "top-0.5"} left-1/2 transform -translate-x-1/2 z-10 
                ${!isMobile ? "group-hover:opacity-0" : ""} transition-opacity`}
            >
              <span className="font-semibold text-[8px] sm:text-[9px] md:text-[10px] text-gray-700 bg-white/90 px-0.5 rounded shadow-sm">
                {toothNum}
              </span>
            </div>

            {/* Tooth image */}
            <div className="w-full h-full p-0.5">
              <ToothImage toothNumber={toothNum} status={toothStatus} />
            </div>

            {/* Mobile Tooltip */}
            {isMobile && showTooltipForThisTooth && (
              <div className="absolute -top-20 left-1/2 transform -translate-x-1/2 bg-white border border-gray-200 rounded-md shadow-lg px-2 py-1.5 text-center z-[100] min-w-[140px] max-w-[180px]">
                <div className="font-semibold text-[10px] text-gray-800 mb-0.5 whitespace-nowrap">
                  {toothName}
                </div>
                <div className="text-[10px]">
                  {isMissing ? (
                    <span className="font-medium text-amber-600">Missing</span>
                  ) : isTreated ? (
                    <span className="font-medium text-indigo-600">Procedure Done</span>
                  ) : (
                    <span className="font-medium text-green-600">Healthy</span>
                  )}
                </div>
                <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white border-r border-b border-gray-200 rotate-45"></div>
              </div>
            )}

            {/* Desktop Tooltip */}
            {!isMobile && (
              <div className="hidden lg:block absolute -top-14 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white border border-gray-300 rounded-md shadow-lg px-2 py-1.5 text-center z-50 min-w-[140px] max-w-[180px] pointer-events-none">
                <div className="font-semibold text-[10px] text-gray-800 ">
                  {toothName}
                </div>
                <div className="text-[10px] text-gray-600">
                  {isMissing ? (
                    <div className="font-medium text-amber-600">
                      Status: Missing
                    </div>
                  ) : isTreated ? (
                    <div className="font-medium text-indigo-600">
                      Status: Procedure Done
                    </div>
                  ) : (
                    <div className="font-medium text-green-600">
                      Status: Healthy
                    </div>
                  )}
                </div>
              </div>
            )}
          </button>
        </div>
      </div>
    );
  };

  const upperTeeth = [
    18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
  ];
  const lowerTeeth = [
    48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38,
  ];

  // Responsive styles
  const getToothGap = () => {
    if (isMobile) {
      return "gap-0.5"; // Consistent gap on mobile
    }
    return "gap-0.5 sm:gap-1"; // Regular gap on desktop
  };

  const getContainerPadding = () => {
    if (isMobile) {
      return "p-2"; // Smaller padding on mobile
    }
    return "p-3 sm:p-4"; // Regular padding on desktop
  };

  const getLabelSize = () => {
    if (isMobile) {
      return "w-4 text-base"; // Fixed size for mobile
    }
    return "w-6 sm:w-8 text-lg sm:text-xl"; // Regular labels on desktop
  };

  const getSeparatorHeight = () => {
    if (isMobile) {
      return "h-14"; // Match tooth height on mobile
    }
    return "h-20 sm:h-24 md:h-28"; // Regular separator on desktop
  };

  return (
    <div className="space-y-2 sm:space-y-3 md:space-y-4">
      {/* Dental Chart */}
      <div className={`bg-gray-50 border border-gray-300 rounded-lg ${getContainerPadding()}`}>
        {/* Mobile Scroll Indicators - Only visible on mobile */}
        {isMobile && (
          <div className="flex justify-center mb-2">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Scroll to see all teeth</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </div>
          </div>
        )}

        <div className="flex items-center gap-1 sm:gap-2">
          {/* R Label - Sticky only on mobile */}
          <div className={`flex-shrink-0 ${getLabelSize()} flex items-center justify-center
            ${isMobile ? 'sticky left-0 z-10 bg-gray-50' : ''}`}
          >
            <span className="font-bold text-red-600">R</span>
          </div>

          {/* Teeth Container - Scroll only on mobile */}
          <div 
            ref={scrollContainerRef}
            className={`flex-1 min-w-0 ${isMobile ? 'overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent [-webkit-overflow-scrolling:touch]' : 'overflow-visible'}`}
            style={{
              scrollbarWidth: isMobile ? 'thin' : 'auto',
              msOverflowStyle: isMobile ? 'auto' : 'hidden',
            }}
          >
            <div className={`${isMobile ? 'inline-block min-w-full' : 'w-full'}`}>
              <div className="space-y-0">
                {/* Upper Teeth Row */}
                <div className={`flex items-center ${isMobile ? 'justify-start' : 'justify-center'}`}>
                  <div className={`flex ${getToothGap()}`}>
                    {upperTeeth
                      .slice(0, 8)
                      .map((toothNum) => renderToothBox(toothNum, true))}
                  </div>

                  {/* Center red separator */}
                  <div className={`w-0.5 ${getSeparatorHeight()} bg-red-500 mx-0.5 sm:mx-1 flex-shrink-0`} />

                  <div className={`flex ${getToothGap()}`}>
                    {upperTeeth
                      .slice(8)
                      .map((toothNum) => renderToothBox(toothNum, true))}
                  </div>
                </div>

                {/* Horizontal line between upper and lower */}
                <div className="h-0.5 bg-red-500 my-0.5 sm:my-1" />

                {/* Lower Teeth Row */}
                <div className={`flex items-center ${isMobile ? 'justify-start' : 'justify-center'}`}>
                  <div className={`flex ${getToothGap()}`}>
                    {lowerTeeth
                      .slice(0, 8)
                      .map((toothNum) => renderToothBox(toothNum, false))}
                  </div>

                  <div className={`w-0.5 ${getSeparatorHeight()} bg-red-500 mx-0.5 sm:mx-1 flex-shrink-0`} />

                  <div className={`flex ${getToothGap()}`}>
                    {lowerTeeth
                      .slice(8)
                      .map((toothNum) => renderToothBox(toothNum, false))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* L Label - Sticky only on mobile */}
          <div className={`flex-shrink-0 ${getLabelSize()} flex items-center justify-center
            ${isMobile ? 'sticky right-0 z-10 bg-gray-50' : ''}`}
          >
            <span className="font-bold text-red-600">L</span>
          </div>
        </div>
      </div>

      {/* Mobile Status Legend - Only visible on mobile */}
      {isMobile && (
        <div className="flex items-center justify-center gap-4 text-xs text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-200">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-[#3b82f6] rounded-full"></div>
            <span>Procedure</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-[#d1d5db] rounded-full"></div>
            <span>Healthy</span>
          </div>
          
        </div>
      )}

      {/* Desktop Status Legend - Only visible on desktop */}
      {!isMobile && (
        <div className="hidden sm:flex items-center justify-end gap-4 text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-[#3b82f6] rounded-full"></div>
            <span>Procedure</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-[#d1d5db] rounded-full"></div>
            <span>Healthy</span>
          </div>
         
        </div>
      )}
    </div>
  );
}