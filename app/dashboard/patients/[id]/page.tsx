// @ts-nocheck
"use client";

import React from "react";
import { ProtectedRoute } from "@/components/protected-route";
import { Sidebar } from "@/components/sidebar";
import { useAuth } from "@/components/auth-context";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import {
  AlertCircle,
  History,
  Trash2,
  Loader2,
  FileText,
  ArrowLeft,
  User,
  Calendar,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Eye,
  Plus,
  ImageIcon,
  Download,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle,
  Clock,
  XCircle,
  Clock4,
  Hash,
  Stethoscope,
  Type,
  UserCircle,
  X,
  RefreshCw,
} from "lucide-react";
import { ToothChartVisual } from "@/components/tooth-chart-visual";
import { ToothChartModal } from "@/components/tooth-chart-modal";
import { ConfirmDeleteModal } from "@/components/confirm-delete-modal";
import { XrayFileUpload } from "@/components/xray-file-upload";
import { XrayDisplayViewer } from "@/components/xray-display-viewer";
import { MedicalHistorySection } from "@/components/medical-history-section";
import { PatientReportsSection } from "@/components/patient-reports-section";
import { ToothChartResultsTable } from "@/components/tooth-chart-results-table";
import { generateReportPDF } from "@/lib/pdf-generator";

export default function PatientDetailPage() {
  const { user, token } = useAuth();
  const params = useParams();
  const router = useRouter();
  const patientId = params?.id as string;

  const [selectedPatient, setSelectedPatient] = useState(null);
  const [toothChart, setToothChart] = useState(null);
  const [patientImages, setPatientImages] = useState([]);
  const [loading, setLoading] = useState({
    patient: true,
    toothChart: false,
    medicalHistory: false,
    patientImages: false,
    createChart: false,
    saveChart: false,
    addMedical: false,
    uploadImage: false,
    deleteImage: false,
    reports: false,
  });
  const [showHistory, setShowHistory] = useState(false);
  const [doctorHistory, setDoctorHistory] = useState([]);
  const [activeTab, setActiveTab] = useState("tooth-chart");
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState({
    notes: "",
    findings: "",
    treatment: "",
    medications: "",
  });
  const [imageUpload, setImageUpload] = useState({
    type: "xray",
    title: "",
    description: "",
    imageUrl: "",
    notes: "",
  });
  const [imageErrors, setImageErrors] = useState<Record<string, string>>({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<any>(null);
  const [showMedicalDeleteModal, setShowMedicalDeleteModal] = useState(false);
  const [medicalEntryToDelete, setMedicalEntryToDelete] = useState<
    number | null
  >(null);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [showCreateReportModal, setShowCreateReportModal] = useState(false);
  const [patientAppointments, setPatientAppointments] = useState<any[]>([]);
  const [selectedAppointmentId, setSelectedAppointmentId] =
    useState<string>("");
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [reportFormData, setReportFormData] = useState({
    procedures: [] as string[],
    findings: "",
    notes: "",
    nextVisitDate: "",
    nextVisitTime: "",
    followUpDetails: "",
  });
  const [reportFormErrors, setReportFormErrors] = useState<
    Record<string, string>
  >({});
  const [reportLoading, setReportLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalToothNumber, setModalToothNumber] = useState<number | null>(null);
  const [toothProcedures, setToothProcedures] = useState<any[]>([]);
  const [editingProcedure, setEditingProcedure] = useState<any>(null);

  // New states for image management
  const [showAddImageModal, setShowAddImageModal] = useState(false);
  const [viewImageModal, setViewImageModal] = useState(false);
  const [selectedImageForView, setSelectedImageForView] = useState<any>(null);

  // New states for reports
  const [reports, setReports] = useState<any[]>([]);
  const [filteredReports, setFilteredReports] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState("all");
  const [uniqueDoctors, setUniqueDoctors] = useState<string[]>([]);

  // States for view report modal
  const [showViewReportModal, setShowViewReportModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [selectedReportAppointment, setSelectedReportAppointment] =
    useState<any>(null);
  const [patientDetails, setPatientDetails] = useState<any>(null);
  const [fetchingPatient, setFetchingPatient] = useState(false);
  const [isAppointmentLoading, setIsAppointmentLoading] = useState(false);

  // Fetch patient data when patientId changes
  useEffect(() => {
    if (token && patientId) {
      fetchPatientData(patientId);
    }
  }, [token, patientId]);

  // Fetch reports when active tab changes to reports
  useEffect(() => {
    if (activeTab === "reports" && token && selectedPatient) {
      fetchPatientReports();
    }
  }, [activeTab, token, selectedPatient]);

  // Filter reports when filter changes
  useEffect(() => {
    if (selectedDoctorFilter === "all") {
      setFilteredReports(reports);
    } else {
      setFilteredReports(
        reports.filter((report) => report.doctorName === selectedDoctorFilter),
      );
    }
    setCurrentPage(1); // Reset to first page when filter changes
  }, [selectedDoctorFilter, reports]);

  // Helper function for appointment status colors
  const getAppointmentStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case "scheduled":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      case "in-progress":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
      case "referred":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
    }
  };

  const fetchPatientData = async (id: string) => {
    setLoading((prev) => ({ ...prev, patient: true }));

    try {
      // Fetch patient details
      const patientRes = await fetch(`/api/patients/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (patientRes.ok) {
        const patientData = await patientRes.json();
        setSelectedPatient(patientData.patient);
        setDoctorHistory(patientData.patient?.doctorHistory || []);
      } else {
        toast.error("Patient not found");
        router.push("/dashboard/patients");
        return;
      }

      // Fetch tooth chart
      setLoading((prev) => ({ ...prev, toothChart: true }));
      try {
        const toothChartRes = await fetch(`/api/tooth-chart?patientId=${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (toothChartRes.ok) {
          const data = await toothChartRes.json();
          const chart = data.toothChart || (data.charts && data.charts[0]);
          if (chart && chart.patientId.toString() === id) {
            console.log(
              "Loaded chart with procedures:",
              chart.procedures?.length || 0,
            );

            // Build teeth object from procedures
            const teethFromProcedures: Record<number, any> = {};
            if (
              Array.isArray(chart.procedures) &&
              chart.procedures.length > 0
            ) {
              chart.procedures.forEach((proc: any) => {
                const toothNum = proc.toothNumber;
                if (toothNum) {
                  teethFromProcedures[toothNum] = {
                    status: "filling", // Set non-healthy status for teeth with procedures
                    procedure: proc.procedure,
                    diagnosis: proc.diagnosis,
                    notes: proc.comments,
                    date: proc.date,
                    fillingType: proc.fillingType,
                  };
                }
              });
            }

            const updatedChart = {
              ...chart,
              teeth: {
                ...(chart.teeth || {}),
                ...teethFromProcedures,
              },
            };

            console.log(
              "Teeth with procedures:",
              Object.keys(teethFromProcedures),
            );
            setToothChart(updatedChart);
            setToothProcedures(
              Array.isArray(chart.procedures) ? chart.procedures : [],
            );
          }
        }
      } catch (error) {
        console.error("Error fetching tooth chart:", error);
      } finally {
        setLoading((prev) => ({ ...prev, toothChart: false }));
      }

      // Fetch patient images
      setLoading((prev) => ({ ...prev, patientImages: true }));
      try {
        const imagesRes = await fetch(`/api/patient-images?patientId=${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (imagesRes.ok) {
          const data = await imagesRes.json();
          setPatientImages(data.images || []);
        }
      } catch (error) {
        console.error("Error fetching patient images:", error);
      } finally {
        setLoading((prev) => ({ ...prev, patientImages: false }));
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to fetch patient data");
    } finally {
      setLoading((prev) => ({ ...prev, patient: false }));
    }
  };

  // Fetch reports for the patient
  const fetchPatientReports = async () => {
    if (!selectedPatient || !token) return;

    setLoading((prev) => ({ ...prev, reports: true }));

    try {
      const res = await fetch(
        `/api/appointment-reports?patientId=${selectedPatient._id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (res.ok) {
        const data = await res.json();
        const reportsData = data.reports || [];
        setReports(reportsData);
        setFilteredReports(reportsData);

        // Extract unique doctor names
        const doctors = Array.from(
          new Set(
            reportsData
              .filter((report: any) => report.doctorName)
              .map((report: any) => report.doctorName),
          ),
        ) as string[];
        setUniqueDoctors(doctors);
      }
    } catch (error) {
      console.error("Error fetching reports:", error);
      toast.error("Failed to fetch reports");
    } finally {
      setLoading((prev) => ({ ...prev, reports: false }));
    }
  };

  // Fetch appointments for the selected patient
  const fetchPatientAppointments = async (patientId: string) => {
    setAppointmentsLoading(true);
    try {
      const res = await fetch(`/api/appointments?patientId=${patientId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        let appointments = data.appointments || [];

        const activeAppointments = appointments.filter((apt: any) => {
          const status = (apt.status || "").toLowerCase().trim();
          return (
            status !== "completed" &&
            status !== "cancelled" &&
            status !== "closed" &&
            status !== "refer_back"
          );
        });

        const doctorFilter =
          user?.role === "doctor" ? `&doctorId=${user.id}` : "";
        const reportsRes = await fetch(
          `/api/appointment-reports?patientId=${patientId}${doctorFilter}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        if (reportsRes.ok) {
          const reportsData = await reportsRes.json();
          const reports = reportsData.reports || [];

          const appointmentIdsWithReports = new Set(
            reports
              .filter((report: any) => report.appointmentId)
              .map((report: any) =>
                String(report.appointmentId._id || report.appointmentId),
              ),
          );

          const filteredAppointments = activeAppointments.filter((apt: any) => {
            const appointmentId = String(apt._id || apt.id);
            return !appointmentIdsWithReports.has(appointmentId);
          });

          setPatientAppointments(filteredAppointments);
        } else {
          setPatientAppointments(activeAppointments);
        }
      }
    } catch (error) {
      console.error("[v0] Failed to fetch appointments:", error);
      toast.error("Failed to fetch appointments");
    } finally {
      setAppointmentsLoading(false);
    }
  };

  // Handle view report
  const handleViewReport = async (report: any) => {
    setSelectedReport(report);
    setShowViewReportModal(true);
    setIsAppointmentLoading(true);
    setFetchingPatient(true);

    try {
      // Fetch appointment details if report has appointmentId
      if (report.appointmentId) {
        const appointmentId =
          typeof report.appointmentId === "object"
            ? report.appointmentId._id
            : report.appointmentId;

        const appointmentRes = await fetch(
          `/api/appointments/${appointmentId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        if (appointmentRes.ok) {
          const appointmentData = await appointmentRes.json();
          setSelectedReportAppointment(
            appointmentData.appointment || appointmentData,
          );
        }
      }

      // Fetch patient details
      if (report.patientId) {
        const patientId =
          typeof report.patientId === "string"
            ? report.patientId
            : report.patientId._id || report.patientId.id;

        const patientRes = await fetch(`/api/patients/${patientId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (patientRes.ok) {
          const patientData = await patientRes.json();
          setPatientDetails(patientData.patient);
        }
      }
    } catch (error) {
      console.error("Error fetching report details:", error);
      toast.error("Failed to load report details");
    } finally {
      setIsAppointmentLoading(false);
      setFetchingPatient(false);
    }
  };

  // Handle download report
  const handleDownloadReport = (report: any) => {
    try {
      generateReportPDF(report);
      toast.success("Report downloaded successfully");
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      toast.error("Failed to download report");
    }
  };

  const validateReportForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (
      !reportFormData.procedures ||
      reportFormData.procedures.length === 0 ||
      reportFormData.procedures.every((p) => !p.trim())
    ) {
      errors.procedures = "At least one procedure is required";
    }
    if (!reportFormData.findings.trim()) {
      errors.findings = "Findings are required";
    }
    setReportFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return toast.error("Please select a patient first");

    if (!selectedAppointmentId || !selectedAppointmentId.trim()) {
      toast.error("Please select an appointment for this report");
      return;
    }

    if (!validateReportForm()) {
      toast.error("Please fix the errors in the form");
      return;
    }

    setReportLoading(true);
    try {
      const appointmentIdTrimmed = selectedAppointmentId
        ? selectedAppointmentId.trim()
        : "";
      if (!appointmentIdTrimmed) {
        toast.error("Please select a valid appointment");
        setReportLoading(false);
        return;
      }

      const proceduresArray = Array.isArray(reportFormData.procedures)
        ? reportFormData.procedures.filter((p) => p && p.trim())
        : reportFormData.procedures
            .split("\n")
            .map((p) => p.trim())
            .filter(Boolean);

      const reportPayload: any = {
        patientId: selectedPatient._id || selectedPatient.id,
        procedures: proceduresArray,
        findings: reportFormData.findings.trim(),
        notes: reportFormData.notes.trim(),
        nextVisitDate: reportFormData.nextVisitDate || null,
        nextVisitTime: reportFormData.nextVisitTime || null,
        followUpDetails: reportFormData.followUpDetails || "",
      };

      if (appointmentIdTrimmed && appointmentIdTrimmed !== "undefined") {
        reportPayload.appointmentId = appointmentIdTrimmed;
      }

      console.log("[v0] Creating report with payload:", reportPayload);

      const res = await fetch("/api/appointment-reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(reportPayload),
      });

      const responseData = await res.json();

      if (res.ok) {
        toast.success("Report created successfully");
        setShowCreateReportModal(false);
        setReportFormErrors({});
        setSelectedAppointmentId("");
        setReportFormData({
          procedures: [],
          findings: "",
          notes: "",
          nextVisitDate: "",
          nextVisitTime: "",
          followUpDetails: "",
        });

        // Refresh reports list
        await fetchPatientReports();

        if (selectedPatient) {
          await fetchPatientAppointments(
            selectedPatient._id || selectedPatient.id,
          );
        }
      } else {
        console.error("[v0] Report creation error:", responseData);
        toast.error(responseData.error || "Failed to create report");
      }
    } catch (error) {
      console.error("[v0] Failed to create report:", error);
      toast.error("Error creating report");
    } finally {
      setReportLoading(false);
    }
  };

  const handleCreateToothChart = async () => {
    if (!selectedPatient) return toast.error("Please select a patient first");
    setLoading((prev) => ({ ...prev, createChart: true }));

    try {
      const patientId = selectedPatient._id || selectedPatient.id;
      const res = await fetch("/api/tooth-chart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          patientId,
          overallNotes: "",
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setToothChart(data.chart);
        toast.success("Tooth chart created successfully!");
      } else {
        toast.error(data.error || "Failed to create tooth chart");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to create tooth chart");
    } finally {
      setLoading((prev) => ({ ...prev, createChart: false }));
    }
  };

  const handleToothClick = (toothNumber: number) => {
    console.log("[v0] Tooth clicked:", toothNumber);
    console.log("[v0] Current editingProcedure:", editingProcedure);

    // Reset any previous editing state
    setEditingProcedure(null);

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
    console.log("[v0] Modal save data received:", data);
    console.log("[v0] Editing procedure:", editingProcedure);

    if (!toothChart) {
      toast.error("No tooth chart found");
      return;
    }

    const chartId = toothChart._id || toothChart.id;
    if (!chartId) {
      toast.error("Chart ID not found");
      return;
    }

    const isEditing =
      !!editingProcedure?._id && !editingProcedure._id.startsWith("temp-");

    try {
      setLoading((prev) => ({ ...prev, saveChart: true }));

      if (isEditing) {
        console.log("[v0] Editing existing procedure(s)");

        // For grouped procedures, delete all old procedures first
        const procedureIdsToDelete = editingProcedure._ids || [
          editingProcedure._id,
        ];
        console.log("[v0] Deleting old procedure(s):", procedureIdsToDelete);

        for (const procId of procedureIdsToDelete) {
          const deleteRes = await fetch(`/api/tooth-chart/${chartId}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              procedureId: procId,
              action: "deleteProcedure",
            }),
          });

          if (!deleteRes.ok) {
            const errorData = await deleteRes.json();
            console.error("[v0] Failed to delete old procedure:", errorData);
            toast.error("Failed to update procedure");
            setLoading((prev) => ({ ...prev, saveChart: false }));
            return;
          }
        }

        console.log(
          "[v0] Old procedure(s) deleted, now adding updated procedure(s)",
        );
      }

      // Handle multiple teeth if selected (for both new and edited procedures)
      const teethToUpdate = data.toothNumbers || [data.toothNumber];
      console.log("[v0] Adding procedures for teeth:", teethToUpdate);

      // Add new procedure for each tooth
      for (let i = 0; i < teethToUpdate.length; i++) {
        const toothNum = teethToUpdate[i];
        const procedureDataForTooth = {
          toothNumber: toothNum,
          sides: data.sides,
          procedure: data.procedure,
          diagnosis: data.diagnosis,
          comments: data.comments,
          date: data.date,
          fillingType: data.fillingType || "",
          rootCanalType: data.rootCanalType || "",
        };

        console.log(
          `[v0] Adding procedure for tooth #${toothNum} (${i + 1}/${teethToUpdate.length})`,
        );
        console.log(`[v0] Procedure data being sent:`, procedureDataForTooth);
        const requestBody = {
          procedure: procedureDataForTooth,
          action: "addProcedure",
        };
        console.log(
          `[v0] Request body JSON:`,
          JSON.stringify(requestBody, null, 2),
        );
        const res = await fetch(`/api/tooth-chart/${chartId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(requestBody),
        });

        const responseData = await res.json();
        if (res.ok) {
          console.log(
            `[v0] Procedure added successfully for tooth #${toothNum}`,
          );
        } else {
          console.error(
            `[v0] Failed to add procedure for tooth #${toothNum}:`,
            responseData,
          );
          toast.error(
            responseData.error ||
              `Failed to add procedure for tooth ${toothNum}`,
          );
          setLoading((prev) => ({ ...prev, saveChart: false }));
          return;
        }
      }

      // Show success message
      if (isEditing) {
        if (teethToUpdate.length > 1) {
          toast.success(`Procedure updated for ${teethToUpdate.length} teeth`);
        } else {
          toast.success("Procedure updated successfully");
        }
      } else {
        if (teethToUpdate.length > 1) {
          toast.success(`Procedure added for ${teethToUpdate.length} teeth`);
        } else {
          toast.success("Procedure added successfully");
        }
      }

      // Close modal IMMEDIATELY before refresh
      setIsModalOpen(false);
      setModalToothNumber(null);
      setEditingProcedure(null);

      // Refresh data from database
      await refreshToothChart();
    } catch (error) {
      console.error("[v0] Error saving procedure:", error);
      toast.error("Error saving procedure");
    } finally {
      setLoading((prev) => ({ ...prev, saveChart: false }));
    }
  };

  const handleDeleteProcedure = async (procedureId: string) => {
    console.log("[v0] Deleting procedure ID:", procedureId);

    if (!toothChart) {
      toast.error("No tooth chart found");
      return;
    }

    const chartId = toothChart._id || toothChart.id;
    if (!chartId) {
      toast.error("Chart ID not found");
      return;
    }

    try {
      setLoading((prev) => ({ ...prev, saveChart: true }));

      console.log("[v0] Calling API to delete procedure from database");
      // Call API to delete procedure directly from database
      const res = await fetch(`/api/tooth-chart/${chartId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          procedureId: procedureId,
          action: "deleteProcedure",
        }),
      });

      const data = await res.json();
      if (res.ok) {
        console.log("[v0] Procedure deleted from database successfully");
        toast.success("Procedure deleted successfully");
        // Refresh from server to get updated data
        await refreshToothChart();
      } else {
        console.error("[v0] Failed to delete procedure:", data);
        toast.error(data.error || "Failed to delete procedure");
      }
    } catch (error) {
      console.error("[v0] Delete procedure error:", error);
      toast.error("Failed to delete procedure");
    } finally {
      setLoading((prev) => ({ ...prev, saveChart: false }));
    }
  };

  const handleEditProcedure = (procedure: any) => {
    console.log("Editing procedure:", procedure);
    setEditingProcedure(procedure);
    // Use first tooth number from array, or single toothNumber
    setModalToothNumber(procedure.toothNumbers?.[0] || procedure.toothNumber);
    setIsModalOpen(true);
  };

  const refreshToothChart = async () => {
    if (!selectedPatient || !token) return;

    try {
      setLoading((prev) => ({ ...prev, toothChart: true }));
      const toothChartRes = await fetch(
        `/api/tooth-chart?patientId=${selectedPatient._id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (toothChartRes.ok) {
        const data = await toothChartRes.json();
        const chart = data.toothChart || (data.charts && data.charts[0]);
        if (chart && chart.patientId.toString() === selectedPatient._id) {
          console.log(
            "[v0] Refreshed chart with procedures:",
            chart.procedures?.length || 0,
          );

          // Build teeth object from procedures to ensure visual updates
          const teethFromProcedures: Record<number, any> = {};
          if (Array.isArray(chart.procedures) && chart.procedures.length > 0) {
            chart.procedures.forEach((proc: any) => {
              const toothNum = proc.toothNumber;
              if (toothNum) {
                teethFromProcedures[toothNum] = {
                  status: "filling", // This is the key - set a non-healthy status
                  procedure: proc.procedure,
                  diagnosis: proc.diagnosis,
                  notes: proc.comments,
                  date: proc.date,
                  fillingType: proc.fillingType,
                };
              }
            });
          }

          // Merge with existing teeth object, prioritizing procedures
          const updatedChart = {
            ...chart,
            teeth: {
              ...(chart.teeth || {}), // Start with existing teeth
              ...teethFromProcedures, // Override with procedure teeth
            },
          };

          console.log(
            "[v0] Updated teeth from procedures, total teeth with procedures:",
            Object.keys(teethFromProcedures).length,
          );
          console.log("[v0] Chart procedures from API:", chart.procedures);
          setToothChart(updatedChart);
          setToothProcedures(
            Array.isArray(chart.procedures) ? chart.procedures : [],
          );
        }
      }
    } catch (error) {
      console.error("[v0] Error refreshing tooth chart:", error);
    } finally {
      setLoading((prev) => ({ ...prev, toothChart: false }));
    }
  };

  const handleSaveToothChart = async () => {
    if (!toothChart) {
      toast.error("No tooth chart found");
      return;
    }

    setLoading((prev) => ({ ...prev, saveChart: true }));

    try {
      const chartId = toothChart._id || toothChart.id;
      if (!chartId) {
        toast.error("Chart ID not found");
        setLoading((prev) => ({ ...prev, saveChart: false }));
        return;
      }

      const res = await fetch(`/api/tooth-chart/${chartId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          teeth: toothChart.teeth,
          procedures: toothProcedures,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        console.log("Chart saved successfully");
        toast.success("Tooth chart saved successfully!");

        // Refresh the chart data from server
        await refreshToothChart();
      } else {
        console.error("Failed to save chart:", data);
        toast.error(data.error || "Failed to save tooth chart");
      }
    } catch (error) {
      console.error("Error saving tooth chart:", error);
      toast.error("Failed to save tooth chart");
    } finally {
      setLoading((prev) => ({ ...prev, saveChart: false }));
    }
  };

  const handleFileUploadSuccess = (fileUrl: string, fileName: string) => {
    setImageUpload({
      ...imageUpload,
      imageUrl: fileUrl,
      title: imageUpload.title || fileName.split(".")[0],
    });
    setShowFileUpload(false);
  };

  // Handle upload image form
  const handleUploadImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;

    const validateImageUpload = (): boolean => {
      const errors: Record<string, string> = {};
      if (!imageUpload.title.trim()) errors.title = "Image title is required";
      if (!imageUpload.imageUrl.trim())
        errors.imageUrl = "Image URL is required";
      setImageErrors(errors);
      return Object.keys(errors).length === 0;
    };

    if (!validateImageUpload()) {
      toast.error("Please fix the errors in the form");
      return;
    }

    setLoading((prev) => ({ ...prev, uploadImage: true }));
    try {
      const res = await fetch("/api/patient-images", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          patientId: selectedPatient._id,
          ...imageUpload,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setPatientImages([...patientImages, data.image]);
        setImageUpload({
          type: "xray",
          title: "",
          description: "",
          imageUrl: "",
          notes: "",
        });
        setImageErrors({});
        setShowAddImageModal(false);
        toast.success("Image uploaded successfully");
      } else {
        toast.error(data.error || "Failed to upload image");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error uploading image");
    } finally {
      setLoading((prev) => ({ ...prev, uploadImage: false }));
    }
  };

  // Handle delete image
  const handleDeleteImage = async () => {
    if (!imageToDelete || !token) return;

    setLoading((prev) => ({ ...prev, deleteImage: true }));

    try {
      const res = await fetch(`/api/patient-images/${imageToDelete._id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        // Remove the deleted image from state
        setPatientImages(
          patientImages.filter((img) => img._id !== imageToDelete._id),
        );
        toast.success("Image deleted successfully");

        // Also close the view modal if it's open
        if (
          selectedImageForView &&
          selectedImageForView._id === imageToDelete._id
        ) {
          setViewImageModal(false);
          setSelectedImageForView(null);
        }
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete image");
      }
    } catch (error) {
      console.error("Error deleting image:", error);
      toast.error("Error deleting image");
    } finally {
      setLoading((prev) => ({ ...prev, deleteImage: false }));
      setShowDeleteModal(false);
      setImageToDelete(null);
    }
  };

  // Handle view details
  const handleViewDetails = (image: any) => {
    setSelectedImageForView(image);
    setViewImageModal(true);
  };

  // Format date function
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleBack = () => {
    router.push("/dashboard/patients");
  };

  // Pagination calculations
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentReports = filteredReports.slice(
    indexOfFirstItem,
    indexOfLastItem,
  );
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  // Loading state while fetching patient
  if (loading.patient) {
    return (
      <ProtectedRoute allowedRoles={["admin", "doctor"]}>
        <div className="flex h-screen bg-background">
          <Sidebar />
          <main className="flex-1 overflow-auto md:pt-0 pt-16">
            <div className="p-6 flex flex-col items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">
                Loading patient details...
              </p>
            </div>
          </main>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={["admin", "doctor"]}>
      <div className="flex h-screen bg-background">
        <Sidebar />
        <main className="flex-1 overflow-auto md:pt-0 pt-16 ">
          <div className="p-3 sm:p-4 md:p-6 lg:p-8">
            {/* Back Button and Header */}
            <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-1">
                <button
                  onClick={handleBack}
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground pt-2 rounded-lg transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-6 h-5" />
                </button>
                <div>
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
                    Patient Clinical Tools
                  </h1>
                  <p className="text-xs sm:text-sm mt-1 text-muted-foreground">
                    Manage patient records, tooth charts, and medical history
                  </p>
                </div>
              </div>
            </div>
            {/* Patient Information Card */}
            {selectedPatient && (
              <div className="bg-card rounded-lg shadow-md border border-border p-3 sm:p-4 md:p-6 mb-6">
                <div className="flex flex-col md:flex-row gap-4 md:items-start">
                  {/* Patient Photo and Basic Info */}
                  <div className="flex items-start gap-4">
                    {selectedPatient.photoUrl ? (
                      <img
                        src={selectedPatient.photoUrl || "/placeholder.svg"}
                        alt={selectedPatient.name}
                        className="w-20 h-20 md:w-24 md:h-24 rounded-lg object-cover border-2 border-primary/20"
                      />
                    ) : (
                      <div className="w-20 h-20 md:w-24 md:h-24 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 border-2 border-primary/20 flex items-center justify-center">
                        <span className="text-2xl md:text-3xl font-bold text-primary">
                          {selectedPatient.name?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">
                        {selectedPatient.name}
                      </h2>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            selectedPatient.credentialStatus === "complete"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                          }`}
                        >
                          {selectedPatient.credentialStatus === "complete" ? (
                            <>
                              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                              Complete
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-3 h-3" />
                              Incomplete
                            </>
                          )}
                        </span>
                        {selectedPatient.assignedDoctorId && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-full text-xs font-medium">
                            <User className="w-3 h-3" />
                            {selectedPatient.assignedDoctorId.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Patient Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 flex-1">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Date of Birth
                        </p>
                        <p className="font-medium text-foreground">
                          {selectedPatient.dob || "Not provided"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Phone</p>
                        <p className="font-medium text-foreground">
                          {selectedPatient.phones?.find((p: any) => p.isPrimary)
                            ?.number || "Not provided"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Email</p>
                        <p className="font-medium text-foreground truncate">
                          {selectedPatient.email || "Not provided"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CreditCard className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">
                          ID Number
                        </p>
                        <p className="font-medium text-foreground">
                          {selectedPatient.idNumber || "Not provided"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Address</p>
                        <p className="font-medium text-foreground line-clamp-1">
                          {selectedPatient.address || "Not provided"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Insurance
                        </p>
                        <p className="font-medium text-foreground">
                          {selectedPatient.insuranceProvider || "Not provided"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Doctor History */}
                <div className="mt-4 pt-4 border-t border-border">
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <History className="w-4 h-4" />
                    <span>Doctor History {showHistory ? "▲" : "▼"}</span>
                  </button>

                  {showHistory && doctorHistory.length > 0 && (
                    <div className="mt-3 p-3 bg-muted rounded-lg">
                      <div className="space-y-2">
                        {doctorHistory.map((history, idx) => (
                          <div key={idx} className="text-sm">
                            <span className="font-medium">
                              {history.doctorName}
                            </span>{" "}
                            - From{" "}
                            {new Date(history.startDate).toLocaleDateString()}
                            {history.endDate &&
                              ` to ${new Date(history.endDate).toLocaleDateString()}`}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Main Clinical Tools */}
            <div>
              {selectedPatient ? (
                <div className="bg-card rounded-lg shadow-md border border-border p-3 sm:p-4 md:p-6">
                  {/* Tabs */}
                  <div className="flex gap-1 sm:gap-2 mb-4 sm:mb-6 border-b border-border overflow-x-auto">
                    {["tooth-chart", "history", "reports", "images"].map(
                      (tab) => (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          disabled={loading.toothChart || loading.patientImages}
                          className={`px-2 sm:px-4 py-2 font-medium text-xs sm:text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap ${
                            activeTab === tab
                              ? "text-primary border-b-2 border-primary"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {tab === "tooth-chart" && "Teeth"}
                          {tab === "history" && "Medical History"}
                          {tab === "reports" && "Reports"}
                          {tab === "images" && "Images"}
                        </button>
                      ),
                    )}
                  </div>
                  {/* Tooth Chart Tab */}
                  {activeTab === "tooth-chart" && (
                    <>
                      {loading.toothChart ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : !toothChart ? (
                        <div className="text-center py-12">
                          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                          <p className="text-muted-foreground mb-4 text-sm sm:text-base">
                            No tooth chart created yet
                          </p>
                          <button
                            onClick={handleCreateToothChart}
                            disabled={loading.createChart}
                            className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground px-4 sm:px-6 py-2 rounded-lg transition-colors font-medium text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                          >
                            {loading.createChart && (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            )}
                            {loading.createChart
                              ? "Creating..."
                              : "Create Tooth Chart"}
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-3 sm:mb-4">
                            <p className="text-xs sm:text-sm text-green-600 dark:text-green-400">
                              ✓ Auto-saving all changes
                            </p>
                          </div>

                          <ToothChartVisual
                            teeth={toothChart?.teeth || {}}
                            onToothClick={handleToothClick}
                            readOnly={false}
                          />
                          <ToothChartResultsTable
                            teeth={toothChart?.teeth || {}}
                            procedures={toothProcedures}
                            onEdit={handleEditProcedure}
                            onDelete={handleDeleteProcedure}
                            {...(user?.role === "doctor" && {
                              onViewDetails: () => {},
                            })}
                          />
                        </>
                      )}
                    </>
                  )}
                  {/* Tooth Chart Modal */}
                  <ToothChartModal
                    isOpen={isModalOpen}
                    toothNumber={modalToothNumber}
                    existingData={editingProcedure || undefined}
                    onClose={() => {
                      console.log("Closing modal");
                      setIsModalOpen(false);
                      setModalToothNumber(null);
                      setEditingProcedure(null);
                    }}
                    onSave={handleModalSave}
                  />
                  {/* Medical History Tab */}
                  {activeTab === "history" && (
                    <MedicalHistorySection
                      patientId={selectedPatient._id || selectedPatient.id}
                      token={token}
                      isDoctor={user?.role === "doctor"}
                      currentDoctorId={user?.id}
                    />
                  )}
                  {/* Reports Tab */}
                  {activeTab === "reports" && (
                    <div className="space-y-4 sm:space-y-6">
                      {/* Header with Create Report Button */}
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">
                            Patient Reports
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            View and manage clinical reports
                          </p>
                        </div>
                        {user?.role === "doctor" && (
                          <button
                            onClick={() => setShowCreateReportModal(true)}
                            className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                          >
                            <FileText className="w-4 h-4" />
                            Create Report
                          </button>
                        )}
                      </div>

                      {/* Filter Section */}
                      {reports.length > 0 && (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-muted rounded-lg">
                          <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-foreground">
                              Filter by Doctor:
                            </span>
                          </div>
                          <select
                            value={selectedDoctorFilter}
                            onChange={(e) =>
                              setSelectedDoctorFilter(e.target.value)
                            }
                            className="px-3 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-sm cursor-pointer"
                          >
                            <option value="all">All Doctors</option>
                            {uniqueDoctors.map((doctor) => (
                              <option key={doctor} value={doctor}>
                                {doctor}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {loading.reports ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : filteredReports.length > 0 ? (
                        <>
                          {/* Reports List */}
                          <div className="space-y-4">
                            {currentReports.map((report) => {
                              // Safely extract procedures as strings
                              const procedures = Array.isArray(
                                report.procedures,
                              )
                                ? report.procedures.map((proc: any) => {
                                    if (typeof proc === "string") return proc;
                                    if (proc && typeof proc === "object")
                                      return (
                                        proc.name ||
                                        proc.description ||
                                        JSON.stringify(proc)
                                      );
                                    return String(proc || "");
                                  })
                                : [];

                              return (
                                <div
                                  key={report._id}
                                  className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow"
                                >
                                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-lg font-bold text-foreground">
                                          Report #
                                          {report.reportNumber ||
                                            report._id?.slice(-6)}
                                        </h4>
                                        <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                                          {report.doctorName || "Unknown"}
                                        </span>
                                      </div>

                                      <div className="space-y-1 text-sm">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span className="text-muted-foreground">
                                            Created Date:
                                          </span>
                                          <span className="font-medium text-foreground">
                                            {report.createdAt
                                              ? formatDate(report.createdAt)
                                              : "N/A"}
                                          </span>
                                        </div>

                                        {report.appointmentId && (
                                          <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-muted-foreground">
                                              Appointment:
                                            </span>
                                            <span className="font-medium text-foreground">
                                              {typeof report.appointmentId ===
                                              "object"
                                                ? formatDate(
                                                    report.appointmentId.date,
                                                  )
                                                : "N/A"}
                                            </span>
                                          </div>
                                        )}
                                      </div>

                                      {procedures.length > 0 && (
                                        <div className="mt-3">
                                          <p className="text-sm font-medium text-foreground mb-1">
                                            Procedures ({procedures.length}):
                                          </p>
                                          <div className="flex flex-wrap gap-1">
                                            {procedures
                                              .slice(0, 3)
                                              .map(
                                                (proc: string, idx: number) => (
                                                  <span
                                                    key={idx}
                                                    className="px-2 py-1 bg-muted text-xs rounded-md"
                                                  >
                                                    {proc.length > 20
                                                      ? proc.substring(0, 20) +
                                                        "..."
                                                      : proc}
                                                  </span>
                                                ),
                                              )}
                                            {procedures.length > 3 && (
                                              <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-md">
                                                +{procedures.length - 3} more
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      )}

                                      {report.findings && (
                                        <div className="mt-3">
                                          <p className="text-sm font-medium text-foreground mb-1">
                                            Findings:
                                          </p>
                                          <p className="text-sm text-muted-foreground line-clamp-2">
                                            {report.findings}
                                          </p>
                                        </div>
                                      )}
                                    </div>

                                    <div className="flex flex-row gap-2">
                                      <button
                                        onClick={() => handleViewReport(report)}
                                        className="inline-flex items-center justify-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors cursor-pointer px-3 py-2 border border-primary/20 rounded-lg hover:bg-primary/5"
                                      >
                                        <Eye className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() =>
                                          handleDownloadReport(report)
                                        }
                                        className="inline-flex items-center justify-center gap-2 text-sm text-accent hover:text-accent/80 transition-colors cursor-pointer px-3 py-2 border border-accent/20 rounded-lg hover:bg-accent/5"
                                      >
                                        <Download className="w-4 h-4" />
                                      </button>
                                      {user?.role === "doctor" &&
                                        report.doctorId === user.id && (
                                          <button
                                            onClick={() => {
                                              // You can implement edit report feature here
                                              toast.success(
                                                "Edit report feature coming soon",
                                              );
                                            }}
                                            className="inline-flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer px-3 py-2 border border-border rounded-lg hover:bg-muted"
                                          >
                                            <FileText className="w-4 h-4" />
                                            Edit
                                          </button>
                                        )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Pagination */}
                          {totalPages > 1 && (
                            <div className="flex items-center justify-between pt-4 border-t border-border">
                              <div className="text-sm text-muted-foreground">
                                Showing {indexOfFirstItem + 1} to{" "}
                                {Math.min(
                                  indexOfLastItem,
                                  filteredReports.length,
                                )}{" "}
                                of {filteredReports.length} reports
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() =>
                                    handlePageChange(currentPage - 1)
                                  }
                                  disabled={currentPage === 1}
                                  className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                                >
                                  <ChevronLeft className="w-4 h-4" />
                                </button>

                                {Array.from(
                                  { length: Math.min(5, totalPages) },
                                  (_, i) => {
                                    let pageNum;
                                    if (totalPages <= 5) {
                                      pageNum = i + 1;
                                    } else if (currentPage <= 3) {
                                      pageNum = i + 1;
                                    } else if (currentPage >= totalPages - 2) {
                                      pageNum = totalPages - 4 + i;
                                    } else {
                                      pageNum = currentPage - 2 + i;
                                    }

                                    return (
                                      <button
                                        key={pageNum}
                                        onClick={() =>
                                          handlePageChange(pageNum)
                                        }
                                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                                          currentPage === pageNum
                                            ? "bg-primary text-primary-foreground"
                                            : "border border-border hover:bg-muted"
                                        }`}
                                      >
                                        {pageNum}
                                      </button>
                                    );
                                  },
                                )}

                                <button
                                  onClick={() =>
                                    handlePageChange(currentPage + 1)
                                  }
                                  disabled={currentPage === totalPages}
                                  className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
                          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                          <p className="text-muted-foreground mb-4">
                            No reports found
                          </p>
                          {user?.role === "doctor" && (
                            <button
                              onClick={() => setShowCreateReportModal(true)}
                              className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg transition-colors font-medium text-sm"
                            >
                              <FileText className="w-4 h-4" />
                              Create First Report
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {/* Images Tab */}
                  {activeTab === "images" && (
                    <div className="space-y-4 sm:space-y-6">
                      {/* Header with Add Button */}
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">
                            Patient Images & X-Rays
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Upload and manage patient images, X-rays, and scans
                          </p>
                        </div>
                        <button
                          onClick={() => setShowAddImageModal(true)}
                          className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer w-full sm:w-auto justify-center"
                        >
                          <Plus className="w-4 h-4" />
                          Add Image
                        </button>
                      </div>

                      {loading.patientImages ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : patientImages.length > 0 ? (
                        <div className="overflow-x-auto rounded-lg border border-border">
                          <table className="min-w-full divide-y divide-border">
                            <thead className="bg-muted">
                              <tr>
                                <th
                                  scope="col"
                                  className="px-4 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider"
                                >
                                  Image
                                </th>
                                <th
                                  scope="col"
                                  className="px-4 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider"
                                >
                                  Title & Type
                                </th>
                                <th
                                  scope="col"
                                  className="px-4 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider"
                                >
                                  Upload Date
                                </th>
                                <th
                                  scope="col"
                                  className="px-4 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider"
                                >
                                  Uploaded By
                                </th>
                                <th
                                  scope="col"
                                  className="px-4 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider"
                                >
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-card divide-y divide-border">
                              {patientImages.map((image) => {
                                const canDeleteImage = () => {
                                  if (user?.role !== "doctor") return false;
                                  if (!image.uploadedBy) return false;
                                  const uploadedById = String(
                                    image.uploadedBy._id || image.uploadedBy,
                                  );
                                  const currentUserId = String(user.id);
                                  return uploadedById === currentUserId;
                                };

                                return (
                                  <tr
                                    key={image._id}
                                    className="hover:bg-muted/50 transition-colors"
                                  >
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      <div className="flex items-center">
                                        {image.imageUrl
                                          ?.toLowerCase()
                                          .includes(".pdf") ? (
                                          <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                                            <FileText className="w-6 h-6 text-red-600 dark:text-red-400" />
                                          </div>
                                        ) : (
                                          <img
                                            src={
                                              image.imageUrl ||
                                              "/placeholder.svg" ||
                                              "/placeholder.svg"
                                            }
                                            alt={image.title}
                                            className="w-12 h-12 object-cover rounded-lg"
                                          />
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3">
                                      <div>
                                        <p className="text-sm font-medium text-foreground">
                                          {image.title}
                                        </p>
                                        <p className="text-xs text-muted-foreground capitalize">
                                          {image.type}
                                        </p>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      <p className="text-sm text-foreground">
                                        {formatDate(image.uploadedAt)}
                                      </p>
                                    </td>
                                    <td className="px-4 py-3">
                                      <p className="text-sm text-foreground">
                                        {image.uploadedBy?.name || "Unknown"}
                                      </p>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() =>
                                            handleViewDetails(image)
                                          }
                                          className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors cursor-pointer"
                                        >
                                          <Eye className="w-4 h-4" />
                                          View
                                        </button>
                                        {canDeleteImage() && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              e.preventDefault();
                                              setImageToDelete(image);
                                              setShowDeleteModal(true);
                                            }}
                                            disabled={loading.deleteImage}
                                            className="inline-flex items-center gap-1 text-sm text-destructive hover:text-destructive/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                            Delete
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
                          <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                          <p className="text-muted-foreground mb-4">
                            No images uploaded yet
                          </p>
                          <button
                            onClick={() => setShowAddImageModal(true)}
                            className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg transition-colors font-medium text-sm"
                          >
                            <Plus className="w-4 h-4" />
                            Upload First Image
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-card rounded-lg shadow-md border border-border p-6 sm:p-8 text-center">
                  <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground text-sm sm:text-base">
                    Patient not found or loading...
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Add Image Modal */}
        {showAddImageModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-card rounded-lg shadow-lg border border-border p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-foreground">
                  Upload New Image
                </h2>
                <button
                  onClick={() => setShowAddImageModal(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer text-xl"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleUploadImage} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Image Type
                  </label>
                  <select
                    value={imageUpload.type}
                    onChange={(e) =>
                      setImageUpload({
                        ...imageUpload,
                        type: e.target.value,
                      })
                    }
                    disabled={loading.uploadImage}
                    className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="xray">X-Ray</option>
                    <option value="photo">Photo</option>
                    <option value="scan">Scan</option>
                  </select>
                </div>

                {!imageUpload.imageUrl && (
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Upload File
                    </label>
                    <XrayFileUpload
                      onUploadSuccess={handleFileUploadSuccess}
                      isLoading={loading.uploadImage}
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Max file size: 10MB
                    </p>
                  </div>
                )}

                {imageUpload.imageUrl && (
                  <div className="p-3 bg-accent/10 border border-accent rounded-lg">
                    <p className="text-sm text-foreground">
                      <span className="font-medium">File uploaded:</span>{" "}
                      {imageUpload.title}
                    </p>
                    <button
                      onClick={() =>
                        setImageUpload({
                          ...imageUpload,
                          imageUrl: "",
                          title: "",
                        })
                      }
                      className="text-sm text-accent hover:underline mt-2 cursor-pointer"
                      type="button"
                    >
                      Change file
                    </button>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Image Title *
                  </label>
                  <input
                    type="text"
                    placeholder="Enter image title"
                    value={imageUpload.title}
                    onChange={(e) => {
                      setImageUpload({
                        ...imageUpload,
                        title: e.target.value,
                      });
                      setImageErrors({ ...imageErrors, title: "" });
                    }}
                    disabled={loading.uploadImage}
                    className={`w-full px-4 py-2 bg-input border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                      imageErrors.title ? "border-destructive" : "border-border"
                    }`}
                  />
                  {imageErrors.title && (
                    <p className="text-xs text-destructive mt-1">
                      {imageErrors.title}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Notes
                  </label>
                  <textarea
                    placeholder="Add any notes about this image..."
                    value={imageUpload.notes}
                    onChange={(e) =>
                      setImageUpload({
                        ...imageUpload,
                        notes: e.target.value,
                      })
                    }
                    disabled={loading.uploadImage}
                    className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    rows={3}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={loading.uploadImage || !imageUpload.imageUrl}
                    className="flex-1 inline-flex justify-center items-center gap-2 bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground px-4 py-2 rounded-lg transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {loading.uploadImage && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                    {loading.uploadImage ? "Uploading..." : "Upload Image"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddImageModal(false)}
                    disabled={loading.uploadImage}
                    className="flex-1 inline-flex justify-center items-center gap-2 bg-muted hover:bg-muted/80 disabled:bg-muted/50 text-foreground px-4 py-2 rounded-lg transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View Image Details Modal */}
        {viewImageModal && selectedImageForView && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-card rounded-lg shadow-lg border border-border p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-foreground">
                  Image Details
                </h2>
                <button
                  onClick={() => setViewImageModal(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer text-xl"
                >
                  ✕
                </button>
              </div>

              <div className="flex flex-col gap-6">
                {/* Image Preview */}
                <div>
                  {selectedImageForView.imageUrl
                    ?.toLowerCase()
                    .includes(".pdf") ? (
                    <div className="bg-muted rounded-lg p-8 flex flex-col items-center justify-center">
                      <FileText className="w-16 h-16 text-red-600 dark:text-red-400 mb-4" />
                      <p className="text-lg font-medium text-foreground mb-2">
                        PDF Document
                      </p>
                      <p className="text-sm text-muted-foreground mb-4">
                        {selectedImageForView.title}
                      </p>
                      <a
                        href={selectedImageForView.imageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg transition-colors font-medium text-sm"
                      >
                        <Download className="w-4 h-4" />
                        Download PDF
                      </a>
                    </div>
                  ) : (
                    <img
                      src={selectedImageForView.imageUrl || "/placeholder.svg"}
                      alt={selectedImageForView.title}
                      className="w-full h-auto max-h-[400px] object-contain rounded-lg border border-border"
                    />
                  )}
                </div>

                {/* Details */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {selectedImageForView.title}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          selectedImageForView.type === "xray"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                            : selectedImageForView.type === "photo"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                              : "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                        }`}
                      >
                        {selectedImageForView.type.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Upload Date
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(selectedImageForView.uploadedAt)}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Uploaded By
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedImageForView.uploadedBy?.name || "Unknown"}
                      </p>
                    </div>

                    {selectedImageForView.notes && (
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Notes
                        </p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {selectedImageForView.notes}
                        </p>
                      </div>
                    )}

                    {selectedImageForView.description && (
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Description
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {selectedImageForView.description}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-border">
                    <div className="flex gap-3">
                      <a
                        href={selectedImageForView.imageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 inline-flex justify-center items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg transition-colors font-medium text-sm"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </a>
                      {user?.role === "doctor" &&
                        selectedImageForView.uploadedBy &&
                        String(
                          selectedImageForView.uploadedBy._id ||
                            selectedImageForView.uploadedBy,
                        ) === String(user.id) && (
                          <button
                            onClick={() => {
                              setViewImageModal(false);
                              setImageToDelete(selectedImageForView);
                              setShowDeleteModal(true);
                            }}
                            className="flex-1 inline-flex justify-center items-center gap-2 bg-destructive hover:bg-destructive/90 text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Image Viewer Modal */}
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

        {/* Delete Modals */}
        <ConfirmDeleteModal
          isOpen={showMedicalDeleteModal}
          title="Delete Medical Entry"
          description="Are you sure you want to delete this medical history entry? This action cannot be undone."
          itemName="Medical Entry"
          onConfirm={() => {
            setShowMedicalDeleteModal(false);
            setMedicalEntryToDelete(null);
          }}
          onCancel={() => {
            setShowMedicalDeleteModal(false);
            setMedicalEntryToDelete(null);
          }}
          isLoading={loading.addMedical}
        />
        <ConfirmDeleteModal
          isOpen={showDeleteModal}
          title="Delete Image"
          description="Are you sure you want to delete this image? This action cannot be undone."
          itemName={imageToDelete?.title || "Untitled Image"}
          onConfirm={handleDeleteImage}
          onCancel={() => {
            setShowDeleteModal(false);
            setImageToDelete(null);
          }}
          isLoading={loading.deleteImage}
        />

        {/* Create Report Modal */}
        {showCreateReportModal &&
          selectedPatient &&
          user?.role === "doctor" && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-3 sm:p-4 z-50">
              <div className="bg-card rounded-lg shadow-lg border border-border p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto mx-2">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <h2 className="text-lg sm:text-xl font-bold text-foreground">
                    Create Clinical Report
                  </h2>
                  <button
                    onClick={() => setShowCreateReportModal(false)}
                    className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer text-xl"
                  >
                    ✕
                  </button>
                </div>

                <p className="text-xs sm:text-sm text-muted-foreground mb-4">
                  Patient:{" "}
                  <span className="font-medium text-foreground">
                    {selectedPatient.name}
                  </span>
                </p>

                <form
                  onSubmit={handleCreateReport}
                  className="space-y-3 sm:space-y-4"
                >
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-foreground mb-2">
                      Select Appointment *
                    </label>
                    {appointmentsLoading ? (
                      <div className="w-full px-3 sm:px-4 py-2 bg-input border border-border rounded-lg text-xs sm:text-sm text-muted-foreground">
                        Loading appointments...
                      </div>
                    ) : patientAppointments.length === 0 ? (
                      <div className="w-full px-3 sm:px-4 py-2 bg-input border border-border rounded-lg text-xs sm:text-sm text-muted-foreground">
                        No appointments found for this patient
                      </div>
                    ) : (
                      <select
                        value={selectedAppointmentId}
                        onChange={(e) =>
                          setSelectedAppointmentId(e.target.value)
                        }
                        disabled={reportLoading}
                        className="w-full px-3 sm:px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <option value="">-- Select an appointment --</option>
                        {patientAppointments.map((apt) => {
                          const appointmentDate = apt.date
                            ? new Date(apt.date).toLocaleDateString()
                            : "N/A";
                          const appointmentType = apt.type || "Consultation";
                          const appointmentStatus = apt.status || "Scheduled";
                          return (
                            <option
                              key={apt._id || apt.id}
                              value={apt._id || apt.id}
                            >
                              {appointmentDate} at {apt.time} -{" "}
                              {appointmentType} ({appointmentStatus})
                            </option>
                          );
                        })}
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-foreground mb-2">
                      Procedures *
                    </label>
                    <textarea
                      placeholder="List procedures performed (one per line)..."
                      value={reportFormData.procedures.join("\n")}
                      onChange={(e) => {
                        setReportFormData({
                          ...reportFormData,
                          procedures: e.target.value
                            .split("\n")
                            .filter(Boolean),
                        });
                        setReportFormErrors({
                          ...reportFormErrors,
                          procedures: "",
                        });
                      }}
                      disabled={reportLoading}
                      className={`w-full px-3 sm:px-4 py-2 bg-input border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-text ${
                        reportFormErrors.procedures
                          ? "border-destructive"
                          : "border-border"
                      }`}
                      rows={3}
                    />
                    {reportFormErrors.procedures && (
                      <p className="text-xs text-destructive mt-1">
                        {reportFormErrors.procedures}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-foreground mb-2">
                      Findings *
                    </label>
                    <textarea
                      placeholder="Findings..."
                      value={reportFormData.findings}
                      onChange={(e) => {
                        setReportFormData({
                          ...reportFormData,
                          findings: e.target.value,
                        });
                        setReportFormErrors({
                          ...reportFormErrors,
                          findings: "",
                        });
                      }}
                      disabled={reportLoading}
                      className={`w-full px-3 sm:px-4 py-2 bg-input border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-text ${
                        reportFormErrors.findings
                          ? "border-destructive"
                          : "border-border"
                      }`}
                      rows={3}
                    />
                    {reportFormErrors.findings && (
                      <p className="text-xs text-destructive mt-1">
                        {reportFormErrors.findings}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-foreground mb-2">
                      Notes
                    </label>
                    <textarea
                      placeholder="Additional notes..."
                      value={reportFormData.notes}
                      onChange={(e) =>
                        setReportFormData({
                          ...reportFormData,
                          notes: e.target.value,
                        })
                      }
                      disabled={reportLoading}
                      className="w-full px-3 sm:px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-text"
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <div>
                      <label className="block text-xs sm:text-sm font-semibold text-foreground mb-1">
                        Next Visit Date
                      </label>
                      <input
                        type="date"
                        value={reportFormData.nextVisitDate}
                        onChange={(e) =>
                          setReportFormData({
                            ...reportFormData,
                            nextVisitDate: e.target.value,
                          })
                        }
                        disabled={reportLoading}
                        className="w-full px-3 sm:px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-semibold text-foreground mb-1">
                        Next Visit Time
                      </label>
                      <input
                        type="time"
                        value={reportFormData.nextVisitTime}
                        onChange={(e) =>
                          setReportFormData({
                            ...reportFormData,
                            nextVisitTime: e.target.value,
                          })
                        }
                        disabled={reportLoading}
                        className="w-full px-3 sm:px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-foreground mb-2">
                      Follow-up Details
                    </label>
                    <textarea
                      placeholder="Follow-up instructions..."
                      value={reportFormData.followUpDetails}
                      onChange={(e) =>
                        setReportFormData({
                          ...reportFormData,
                          followUpDetails: e.target.value,
                        })
                      }
                      disabled={reportLoading}
                      className="w-full px-3 sm:px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-text"
                      rows={2}
                    />
                  </div>

                  <div className="flex gap-2 sm:gap-3 pt-2 sm:pt-4">
                    <button
                      type="submit"
                      disabled={reportLoading}
                      className="flex-1 inline-flex justify-center items-center gap-2 bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground px-3 sm:px-4 py-2 rounded-lg transition-colors font-medium text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {reportLoading && (
                        <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                      )}
                      {reportLoading ? "Creating..." : "Create Report"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateReportModal(false)}
                      disabled={reportLoading}
                      className="flex-1 inline-flex justify-center items-center gap-2 bg-muted hover:bg-muted/80 disabled:bg-muted/50 text-foreground px-3 sm:px-4 py-2 rounded-lg transition-colors font-medium text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        {/* View Report Modal - WITH COMPLETE APPOINTMENT DETAILS */}
        {showViewReportModal && selectedReport && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 sm:p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-card rounded-xl shadow-2xl border border-border w-full max-w-4xl max-h-[95vh] overflow-y-auto animate-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="flex justify-between items-start p-6 sm:p-8 border-b border-border sticky top-0 bg-gradient-to-r from-card to-muted/30">
                <div className="min-w-0 pr-4">
                  <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
                    Medical Report
                  </h2>
                  <p className="text-sm text-muted-foreground mt-2">
                    Generated on{" "}
                    {new Date(selectedReport.createdAt).toLocaleDateString(
                      "en-US",
                      {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      },
                    )}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowViewReportModal(false);
                    setSelectedReportAppointment(null);
                    setPatientDetails(null);
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer p-2 hover:bg-muted rounded-lg flex-shrink-0"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>

              <div className="p-6 sm:p-8 space-y-6 sm:space-y-8">
                {/* Appointment Information - COMPREHENSIVE DETAILS */}
                {selectedReportAppointment && (
                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50/50 dark:from-indigo-950/20 dark:to-purple-950/10 rounded-xl p-5 sm:p-6 border border-indigo-200 dark:border-indigo-800">
                    <h3 className="font-bold text-foreground mb-4 text-base sm:text-lg flex items-center gap-2">
                      <span className="w-1 h-6 bg-indigo-600 rounded-full"></span>
                      <Calendar className="w-4 h-4" />
                      Appointment Details
                    </h3>

                    <div className="space-y-6">
                      {/* Main Appointment Info Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Left Column - Date, Time, Duration */}
                        <div className="space-y-4">
                          {/* Date */}
                          <div className="flex items-start gap-3">
                            <div className="bg-indigo-100 dark:bg-indigo-900/30 p-2 rounded-lg">
                              <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div className="flex-1">
                              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                                Appointment Date
                              </p>
                              <p className="text-foreground font-semibold mt-1 text-sm sm:text-base">
                                {selectedReportAppointment.date
                                  ? new Date(
                                      selectedReportAppointment.date,
                                    ).toLocaleDateString("en-US", {
                                      weekday: "long",
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                    })
                                  : "N/A"}
                              </p>
                            </div>
                          </div>

                          {/* Time */}
                          <div className="flex items-start gap-3">
                            <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                              <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="flex-1">
                              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                                Time Slot
                              </p>
                              <p className="text-foreground font-semibold mt-1 text-sm sm:text-base">
                                {selectedReportAppointment.time
                                  ? new Date(
                                      `2000-01-01T${selectedReportAppointment.time}`,
                                    ).toLocaleTimeString("en-US", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      hour12: true,
                                    })
                                  : "N/A"}
                              </p>
                            </div>
                          </div>

                          {/* Duration */}
                          <div className="flex items-start gap-3">
                            <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg">
                              <Clock4 className="w-5 h-5 text-green-600 dark:text-green-400" />
                            </div>
                            <div className="flex-1">
                              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                                Duration
                              </p>
                              <p className="text-foreground font-semibold mt-1 text-sm sm:text-base">
                                {selectedReportAppointment.duration || 30}{" "}
                                minutes
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Right Column - Type, Room, Status */}
                        <div className="space-y-4">
                          {/* Appointment Type */}
                          <div className="flex items-start gap-3">
                            <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg">
                              <Type className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div className="flex-1">
                              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                                Appointment Type
                              </p>
                              <p className="text-foreground font-semibold mt-1 text-sm sm:text-base">
                                {selectedReportAppointment.type ||
                                  "Consultation"}
                              </p>
                            </div>
                          </div>

                          {/* Room Number */}
                          <div className="flex items-start gap-3">
                            <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-lg">
                              <Hash className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div className="flex-1">
                              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                                Room Number
                              </p>
                              <p className="text-foreground font-semibold mt-1 text-sm sm:text-base">
                                {selectedReportAppointment.roomNumber || "N/A"}
                              </p>
                            </div>
                          </div>

                          {/* Status */}
                          <div className="flex items-start gap-3">
                            <div className="bg-rose-100 dark:bg-rose-900/30 p-2 rounded-lg">
                              <Stethoscope className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                            </div>
                            <div className="flex-1">
                              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                                Appointment Status
                              </p>
                              <div className="mt-1">
                                <span
                                  className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${getAppointmentStatusColor(
                                    selectedReportAppointment.status,
                                  )}`}
                                >
                                  {selectedReportAppointment.status
                                    ? selectedReportAppointment.status
                                        .charAt(0)
                                        .toUpperCase() +
                                      selectedReportAppointment.status.slice(1)
                                    : "Unknown"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Doctor Information */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-indigo-200 dark:border-indigo-800">
                        {/* Current Doctor */}
                        <div className="flex items-start gap-3">
                          <div className="bg-cyan-100 dark:bg-cyan-900/30 p-2 rounded-lg">
                            <UserCircle className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                          </div>
                          <div className="flex-1">
                            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                              Doctor
                            </p>
                            <p className="text-foreground font-semibold mt-1 text-sm sm:text-base">
                              {selectedReportAppointment.isReferred
                                ? selectedReportAppointment.originalDoctorName
                                : selectedReportAppointment.doctorName || "N/A"}
                            </p>
                          </div>
                        </div>

                        {/* Created Information */}
                        <div className="flex items-start gap-3">
                          <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-lg">
                            <svg
                              className="w-5 h-5 text-gray-600 dark:text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                              Created
                            </p>
                            <div className="mt-1">
                              <p className="text-foreground text-sm">
                                {selectedReportAppointment.createdAt
                                  ? new Date(
                                      selectedReportAppointment.createdAt,
                                    ).toLocaleDateString()
                                  : "N/A"}
                              </p>
                              {selectedReportAppointment.createdByName && (
                                <p className="text-foreground text-xs text-muted-foreground mt-1">
                                  By: {selectedReportAppointment.createdByName}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Referral Information (if applicable) */}
                      {selectedReportAppointment.isReferred && (
                        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 mt-4 border border-purple-200 dark:border-purple-800">
                          <div className="flex items-center gap-2 mb-3">
                            <svg
                              className="w-4 h-4 text-purple-600 dark:text-purple-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                              />
                            </svg>
                            <h4 className="font-semibold text-foreground text-sm">
                              Referral Information
                            </h4>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="bg-white/50 dark:bg-black/20 p-3 rounded-lg">
                              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                                Original Doctor
                              </p>
                              <p className="text-foreground font-medium text-sm mt-1">
                                {selectedReportAppointment.originalDoctorName ||
                                  "N/A"}
                              </p>
                            </div>
                            <div className="bg-white/50 dark:bg-black/20 p-3 rounded-lg">
                              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                                Referred Doctor
                              </p>
                              <p className="text-foreground font-medium text-sm mt-1">
                                {selectedReportAppointment.doctorName || "N/A"}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Additional Information */}
                      {(selectedReportAppointment.reason ||
                        selectedReportAppointment.notes) && (
                        <div className="pt-4 border-t border-indigo-200 dark:border-indigo-800">
                          <h4 className="font-semibold text-foreground mb-3 text-sm">
                            Additional Information
                          </h4>
                          <div className="space-y-3">
                            {selectedReportAppointment.reason && (
                              <div>
                                <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide mb-1">
                                  Appointment Reason
                                </p>
                                <p className="text-foreground text-sm bg-white/50 dark:bg-black/20 p-3 rounded-lg">
                                  {selectedReportAppointment.reason}
                                </p>
                              </div>
                            )}

                            {selectedReportAppointment.notes && (
                              <div>
                                <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide mb-1">
                                  Additional Notes
                                </p>
                                <p className="text-foreground text-sm bg-white/50 dark:bg-black/20 p-3 rounded-lg whitespace-pre-wrap">
                                  {selectedReportAppointment.notes}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Patient Info */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-50/50 dark:from-blue-950/20 dark:to-blue-950/10 rounded-xl p-5 sm:p-6 border border-blue-200 dark:border-blue-800">
                  <h3 className="font-bold text-foreground mb-4 text-base sm:text-lg flex items-center gap-2">
                    <span className="w-1 h-6 bg-blue-600 rounded-full"></span>
                    <UserCircle className="w-4 h-4" />
                    Patient Information
                  </h3>
                  {fetchingPatient ? (
                    <div className="flex items-center justify-center p-4">
                      <RefreshCw className="w-5 h-5 animate-spin text-primary" />
                      <span className="ml-2 text-sm text-muted-foreground">
                        Loading patient details...
                      </span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                      <div>
                        <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                          Full Name
                        </p>
                        <p className="text-foreground font-semibold mt-2 text-sm sm:text-base truncate">
                          {selectedPatient?.name || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                          Email
                        </p>
                        <p className="text-foreground font-semibold mt-2 text-sm sm:text-base truncate">
                          {selectedPatient?.email || "Not provided"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                          Phone
                        </p>
                        <p className="text-foreground font-semibold mt-2 text-sm sm:text-base truncate">
                          {selectedPatient?.phones?.find(
                            (p: any) => p.isPrimary,
                          )?.number ||
                            selectedPatient?.phones?.[0]?.number ||
                            "Not provided"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Doctor Info */}
                <div className="bg-gradient-to-br from-green-50 to-green-50/50 dark:from-green-950/20 dark:to-green-950/10 rounded-xl p-5 sm:p-6 border border-green-200 dark:border-green-800">
                  <h3 className="font-bold text-foreground mb-4 text-base sm:text-lg flex items-center gap-2">
                    <span className="w-1 h-6 bg-green-600 rounded-full"></span>
                    <Stethoscope className="w-4 h-4" />
                    Attending Physician
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                        Name
                      </p>
                      <p className="text-foreground font-semibold mt-2 text-sm sm:text-base truncate">
                        {selectedReport.doctorName || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                        Specialty
                      </p>
                      <p className="text-foreground font-semibold mt-2 text-sm sm:text-base truncate">
                        {selectedReport.doctorId?.specialty ||
                          "General Dentistry"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Report Details */}
                <div className="space-y-5">
                  <h3 className="font-bold text-foreground text-base sm:text-lg flex items-center gap-2">
                    <span className="w-1 h-6 bg-primary rounded-full"></span>
                    <FileText className="w-4 h-4" />
                    Clinical Findings
                  </h3>

                  {selectedReport.procedures &&
                    selectedReport.procedures.length > 0 && (
                      <div className="bg-muted/40 rounded-xl p-5 sm:p-6 border border-border">
                        <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide mb-3">
                          Procedures Performed
                        </p>
                        <ul className="text-foreground space-y-2">
                          {selectedReport.procedures.map(
                            (p: any, idx: number) => (
                              <li
                                key={idx}
                                className="flex items-start gap-3 text-sm sm:text-base"
                              >
                                <span className="text-primary font-bold flex-shrink-0 mt-0.5">
                                  ✓
                                </span>
                                <span className="break-words font-medium">
                                  {typeof p === "object"
                                    ? p.name || p.description
                                    : p}
                                </span>
                              </li>
                            ),
                          )}
                        </ul>
                      </div>
                    )}

                  {selectedReport.findings && (
                    <div className="bg-muted/40 rounded-xl p-5 sm:p-6 border border-border">
                      <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide mb-3">
                        Clinical Findings
                      </p>
                      <p className="text-foreground text-sm sm:text-base whitespace-pre-wrap break-words leading-relaxed">
                        {selectedReport.findings}
                      </p>
                    </div>
                  )}

                  {selectedReport.notes && (
                    <div className="bg-muted/40 rounded-xl p-5 sm:p-6 border border-border">
                      <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide mb-3">
                        Additional Notes
                      </p>
                      <p className="text-foreground text-sm sm:text-base whitespace-pre-wrap break-words leading-relaxed">
                        {selectedReport.notes}
                      </p>
                    </div>
                  )}

                  {selectedReport.nextVisitDate && (
                    <div className="bg-amber-50 dark:bg-amber-950/20 rounded-xl p-5 sm:p-6 border border-amber-200 dark:border-amber-800">
                      <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide mb-2">
                        Recommended Next Visit
                      </p>
                      <p className="text-foreground font-semibold text-sm sm:text-base">
                        {new Date(
                          selectedReport.nextVisitDate,
                        ).toLocaleDateString("en-US", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                        {selectedReport.nextVisitTime && (
                          <>
                            <span className="text-muted-foreground mx-2">
                              •
                            </span>
                            <span className="text-foreground font-semibold">
                              {new Date(
                                `2000-01-01T${selectedReport.nextVisitTime}`,
                              ).toLocaleTimeString("en-US", {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: true,
                              })}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                  )}

                  {selectedReport.followUpDetails && (
                    <div className="bg-purple-50 dark:bg-purple-950/20 rounded-xl p-5 sm:p-6 border border-purple-200 dark:border-purple-800">
                      <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide mb-3">
                        Follow-up Instructions
                      </p>
                      <p className="text-foreground text-sm sm:text-base whitespace-pre-wrap break-words leading-relaxed">
                        {selectedReport.followUpDetails}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex flex-col xs:flex-row gap-3 p-6 sm:p-8 border-t border-border bg-muted/30">
                <button
                  onClick={() => handleDownloadReport(selectedReport)}
                  className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-3 rounded-lg transition-colors font-semibold cursor-pointer text-sm sm:text-base"
                >
                  <Download className="w-4 h-4" />
                  Download Report
                </button>
                <button
                  onClick={() => {
                    setShowViewReportModal(false);
                    setSelectedReportAppointment(null);
                    setPatientDetails(null);
                  }}
                  className="flex-1 bg-muted hover:bg-muted/80 text-muted-foreground px-4 py-3 rounded-lg transition-colors font-semibold cursor-pointer text-sm sm:text-base"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
