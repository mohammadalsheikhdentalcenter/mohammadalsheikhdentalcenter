"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { Save, RotateCcw, History } from "lucide-react";
import { ToothChartResultsTable } from "./tooth-chart-results-table";
import { ToothChartModal } from "./tooth-chart-modal";
import { ToothChartVisual } from "./tooth-chart-visual";

interface ToothStatus {
  status:
    | "healthy"
    | "cavity"
    | "filling"
    | "root-canal"
    | "missing"
    | "implant";
  diagnosis: string;
  procedure: string;
  fillingType: string;
  notes: string;
  sides?: string[];
  date?: string;
  lastUpdated: Date;
}

interface ToothChartProps {
  patientId: string;
  token: string;
  onSave?: () => void;
}

const TOOTH_STATUSES = [
  {
    value: "healthy",
    label: "Healthy",
    color: "bg-green-100 border-green-300",
  },
  { value: "cavity", label: "Cavity", color: "bg-red-100 border-red-300" },
  {
    value: "filling",
    label: "Filling",
    color: "bg-yellow-100 border-yellow-300",
  },
  {
    value: "root-canal",
    label: "Root Canal",
    color: "bg-orange-100 border-orange-300",
  },
  { value: "missing", label: "Missing", color: "bg-gray-100 border-gray-300" },
  { value: "implant", label: "Implant", color: "bg-blue-100 border-blue-300" },
];

export function ToothChart({ patientId, token, onSave }: ToothChartProps) {
  const [teeth, setTeeth] = useState<Record<number, ToothStatus>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [chartHistory, setChartHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalToothNumber, setModalToothNumber] = useState<number | null>(null);
  const [toothChart, setToothChart] = useState<any>(null);
  const [procedures, setProcedures] = useState<any[]>([]);

  useEffect(() => {
    fetchToothChart();
  }, [patientId]);

  const initializeTeeth = () => {
    const newTeeth: Record<number, ToothStatus> = {};
    // FDI numbering: 1-32
    for (let i = 1; i <= 32; i++) {
      newTeeth[i] = {
        status: "healthy",
        diagnosis: "",
        procedure: "",
        fillingType: "",
        notes: "",
        sides: [],
        date: "",
        lastUpdated: new Date(),
      };
    }
    return newTeeth;
  };

  const fetchToothChart = async () => {
    try {
      // Initialize with empty teeth first
      const initialTeeth = initializeTeeth();

      const res = await fetch(`/api/tooth-chart?patientId=${patientId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.toothChart) {
          // Store the full tooth chart object
          setToothChart(data.toothChart);

          // Store procedures array
          setProcedures(data.toothChart.procedures || []);

          // Merge fetched data with initialized teeth
          if (data.toothChart.teeth) {
            const mergedTeeth = { ...initialTeeth, ...data.toothChart.teeth };
            setTeeth(mergedTeeth);
          } else {
            setTeeth(initialTeeth);
          }
        } else {
          setTeeth(initialTeeth);
          setToothChart(null);
          setProcedures([]);
        }
        setChartHistory(data.chartHistory || []);
      } else {
        // If fetch fails, initialize with empty teeth
        setTeeth(initialTeeth);
        setToothChart(null);
        setProcedures([]);
      }
    } catch (error) {
      console.error("Error fetching tooth chart:", error);
      // Initialize with empty teeth on error
      setTeeth(initializeTeeth());
      setToothChart(null);
      setProcedures([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToothStatusChange = (toothNumber: number, status: string) => {
    setTeeth((prev) => ({
      ...prev,
      [toothNumber]: {
        ...prev[toothNumber],
        status: status as ToothStatus["status"],
        lastUpdated: new Date(),
      },
    }));
  };

  const handleToothNotesChange = (toothNumber: number, notes: string) => {
    setTeeth((prev) => ({
      ...prev,
      [toothNumber]: {
        ...prev[toothNumber],
        notes,
        lastUpdated: new Date(),
      },
    }));
  };

  const handleToothDiagnosisChange = (
    toothNumber: number,
    diagnosis: string,
  ) => {
    setTeeth((prev) => ({
      ...prev,
      [toothNumber]: {
        ...prev[toothNumber],
        diagnosis,
        lastUpdated: new Date(),
      },
    }));
  };

  const handleToothProcedureChange = (
    toothNumber: number,
    procedure: string,
  ) => {
    setTeeth((prev) => ({
      ...prev,
      [toothNumber]: {
        ...prev[toothNumber],
        procedure,
        lastUpdated: new Date(),
      },
    }));
  };

  const handleToothFillingTypeChange = (
    toothNumber: number,
    fillingType: string,
  ) => {
    setTeeth((prev) => ({
      ...prev,
      [toothNumber]: {
        ...prev[toothNumber],
        fillingType,
        lastUpdated: new Date(),
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/tooth-chart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          patientId,
          teeth,
        }),
      });

      if (res.ok) {
        toast.success("Tooth chart saved successfully");
        fetchToothChart();
        onSave?.();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to save tooth chart");
      }
    } catch (error) {
      toast.error("Error saving tooth chart");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset all changes?")) {
      fetchToothChart();
    }
  };

  const handleToothClick = (toothNumber: number) => {
    setModalToothNumber(toothNumber);
    setIsModalOpen(true);
  };

  const handleModalSave = async (data: {
    toothNumber: number;
    toothNumbers?: number[];
    sides: string[];
    procedure: string;
    diagnosis: string;
    comments: string;
    date: string;
    fillingType?: string;
    rootCanalType?: string;
  }) => {
    // Handle multiple teeth if selected
    const teethToUpdate = data.toothNumbers || [data.toothNumber];
    console.log("[ToothChart] handleModalSave called with data:", data);
    console.log("[ToothChart] teethToUpdate:", teethToUpdate);

    setSaving(true);
    try {
      // Get or create tooth chart ID
      let chartId = toothChart?._id || toothChart?.id;

      // If no chart exists, create one first
      if (!chartId) {
        const createRes = await fetch("/api/tooth-chart", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            patientId,
            teeth: {},
            procedures: [],
          }),
        });

        if (createRes.ok) {
          const createData = await createRes.json();
          chartId = createData.chart._id || createData.chart.id;
          setToothChart(createData.chart);
        } else {
          toast.error("Failed to create tooth chart");
          setSaving(false);
          return;
        }
      }

      // Save procedure for each tooth (using atomic operations in API to prevent race conditions)
      console.log("[ToothChart] Saving procedures for teeth:", teethToUpdate);
      for (let i = 0; i < teethToUpdate.length; i++) {
        const toothNum = teethToUpdate[i];
        const procedureData = {
          toothNumber: toothNum,
          sides: data.sides,
          diagnosis: data.diagnosis,
          procedure: data.procedure,
          date: data.date,
          fillingType: data.fillingType || "",
          rootCanalType: data.rootCanalType || "",
          comments: data.comments,
        };

        console.log(
          `[ToothChart] Saving procedure for tooth #${toothNum} (${i + 1}/${teethToUpdate.length})`,
        );
        const res = await fetch(`/api/tooth-chart/${chartId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            procedure: procedureData,
            action: "addProcedure",
          }),
        });

        if (!res.ok) {
          const error = await res.json();
          console.error(
            `[ToothChart] Failed to save procedure for tooth #${toothNum}:`,
            error,
          );
          toast.error(
            error.error || `Failed to save procedure for tooth ${toothNum}`,
          );
          setSaving(false);
          return;
        }

        const result = await res.json();
        console.log(
          `[ToothChart] Successfully saved procedure for tooth #${toothNum}. Total procedures:`,
          result.chart?.procedures?.length,
        );
      }
      console.log("[ToothChart] All procedures saved successfully");

      // Update local state for visual feedback
      setTeeth((prev) => {
        const updated = { ...prev };
        teethToUpdate.forEach((toothNum) => {
          updated[toothNum] = {
            ...prev[toothNum],
            sides: data.sides,
            procedure: data.procedure,
            diagnosis: data.diagnosis,
            notes: data.comments,
            date: data.date,
            fillingType: data.fillingType || "",
            status: "filling", // Mark as having procedure
            lastUpdated: new Date(),
          };
        });
        return updated;
      });

      // Refresh tooth chart data to get updated procedures
      await fetchToothChart();

      setIsModalOpen(false);
      setModalToothNumber(null);

      if (teethToUpdate.length > 1) {
        toast.success(`Procedure saved for ${teethToUpdate.length} teeth`);
      } else {
        toast.success("Tooth procedure saved");
      }
    } catch (error) {
      console.error("Error saving procedure:", error);
      toast.error("Error saving procedure");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Loading tooth chart...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tooth Status Legend */}
      <div className="bg-muted/50 rounded-lg p-4">
        <h3 className="font-semibold text-foreground mb-3">
          Tooth Status Legend
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {TOOTH_STATUSES.map((status) => (
            <div key={status.value} className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded border ${status.color}`} />
              <span className="text-xs text-muted-foreground">
                {status.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {chartHistory.length > 1 && (
        <div className="bg-card border border-border rounded-lg p-4">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 text-primary hover:text-primary/80 font-medium text-sm"
          >
            <History className="w-4 h-4" />
            View Chart History ({chartHistory.length} versions)
          </button>
          {showHistory && (
            <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
              {chartHistory.map((chart, idx) => (
                <div key={chart._id} className="p-2 bg-muted rounded text-sm">
                  <p className="font-medium text-foreground">
                    Version {chartHistory.length - idx}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(chart.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tooth Chart Visual */}
      <div className="space-y-4">
        <h3 className="font-semibold text-foreground">Tooth Chart</h3>
        <ToothChartVisual
          teeth={teeth}
          onToothClick={handleToothClick}
          readOnly={false}
          onToothStatusChange={handleToothStatusChange}
          onToothDiagnosisChange={handleToothDiagnosisChange}
          onToothProcedureChange={handleToothProcedureChange}
          onToothFillingTypeChange={handleToothFillingTypeChange}
          onToothNotesChange={handleToothNotesChange}
        />
      </div>

      {/* Tooth Chart Modal */}
      <ToothChartModal
        isOpen={isModalOpen}
        toothNumber={modalToothNumber}
        existingData={
          modalToothNumber && teeth[modalToothNumber]
            ? {
                sides: teeth[modalToothNumber].sides,
                procedure: teeth[modalToothNumber].procedure,
                diagnosis: teeth[modalToothNumber].diagnosis,
                comments: teeth[modalToothNumber].notes,
                date: teeth[modalToothNumber].date,
              }
            : undefined
        }
        onClose={() => {
          setIsModalOpen(false);
          setModalToothNumber(null);
        }}
        onSave={handleModalSave}
      />

      {/* Tooth Chart Results Table */}

      {/* Action Buttons */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground px-4 py-2 rounded-lg transition-colors text-sm font-medium"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving..." : "Save Chart"}
        </button>
        <button
          onClick={handleReset}
          className="flex items-center gap-2 bg-muted hover:bg-muted/80 text-muted-foreground px-4 py-2 rounded-lg transition-colors text-sm font-medium"
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </button>
      </div>
      <ToothChartResultsTable teeth={teeth} procedures={procedures} />
    </div>
  );
}
