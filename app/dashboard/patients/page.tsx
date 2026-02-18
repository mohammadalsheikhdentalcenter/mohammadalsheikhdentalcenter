//@ts-nocheck
"use client";
import type React from "react";
import { ProtectedRoute } from "@/components/protected-route";
import { Sidebar } from "@/components/sidebar";
import { useAuth } from "@/components/auth-context";
import { ConfirmDeleteModal } from "@/components/confirm-delete-modal";
import { SearchableDropdown } from "@/components/searchable-dropdown";
import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import {
  AlertCircle,
  Plus,
  Edit2,
  Trash2,
  Eye,
  X,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  Upload,
  User,
  AlertTriangle,
  CreditCard,
  FileText,
  RefreshCw,
} from "lucide-react";
import {
  formatPhoneForDisplay,
  formatPhoneForDatabase,
} from "@/lib/validation";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { PatientPhotoUpload } from "@/components/patient-photo-upload";
import { useRouter } from "next/navigation";

const formErrors = {
  assignedDoctorId: "Assigned Doctor is required",
};

// Patient Row Component
const PatientRow = ({
  patient,
  onView,
  onEdit,
  onDelete,
  loading,
  user,
}: {
  patient: any;
  onView: (patient: any) => void;
  onEdit: (patient: any) => void;
  onDelete: (patient: any) => void;
  loading: any;
  user: any;
}) => {
  const router = useRouter();

  const handleRowClick = (e: React.MouseEvent) => {
    // Only make row clickable for doctors
    if (user?.role !== "doctor") {
      return;
    }

    // Don't navigate if clicking on buttons or interactive elements
    if (
      (e.target as HTMLElement).closest("button") ||
      (e.target as HTMLElement).closest("a") ||
      (e.target as HTMLElement).closest("input") ||
      (e.target as HTMLElement).closest("select")
    ) {
      return;
    }
    // Navigate to patient detail page with patient ID
    router.push(`/dashboard/patients/${patient._id || patient.id}`);
  };

  return (
    <tr
      className="border-b border-border hover:bg-muted/50 transition-colors"
      style={{
        cursor: user?.role === "doctor" ? "pointer" : "default",
      }}
      onClick={handleRowClick}
    >
      <td className="px-4 sm:px-6 py-3">
        {patient.photoUrl ? (
          <img
            src={patient.photoUrl || "/placeholder.svg"}
            alt={patient.name}
            className="w-10 h-10 rounded-full object-cover border border-border"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center text-xs font-semibold text-muted-foreground">
            {patient.name?.charAt(0).toUpperCase()}
          </div>
        )}
      </td>
      <td className="px-4 sm:px-6 py-3 font-medium text-foreground">
        <div>
          <div className="sm:hidden text-xs text-muted-foreground mb-1">
            Name
          </div>
          {patient.name}
        </div>
      </td>
      <td className="px-4 sm:px-6 py-3 text-muted-foreground hidden sm:table-cell">
        <div>
          <div className="md:hidden text-xs text-muted-foreground mb-1">
            Phone
          </div>
          {formatPhoneForDisplay(
            patient.phones?.find((p: any) => p.isPrimary)?.number,
          )}
        </div>
      </td>
      <td className="px-4 sm:px-6 py-3 text-muted-foreground hidden md:table-cell">
        <div>
          <div className="lg:hidden text-xs text-muted-foreground mb-1">
            Doctor
          </div>
          {patient.assignedDoctorId?.name || "Unassigned"}
        </div>
      </td>
      <td className="px-4 sm:px-6 py-3">
        <div>
          <div className="sm:hidden text-xs text-muted-foreground mb-1">
            Credentials
          </div>
          {patient.credentialStatus === "incomplete" ? (
            <span className="flex items-center gap-1 text-destructive text-xs font-medium">
              <AlertCircle className="w-4 h-4" />
              Incomplete
            </span>
          ) : (
            <span className="text-accent text-xs font-medium">Complete</span>
          )}
        </div>
      </td>
      <td className="px-4 sm:px-6 py-3">
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onView(patient);
            }}
            disabled={
              loading.deletePatient ||
              loading.addPatient ||
              loading.updatePatient
            }
            className="text-primary hover:text-primary/80 disabled:text-primary/50 transition-colors cursor-pointer disabled:cursor-not-allowed p-1 hover:bg-primary/10 rounded"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          {user?.role !== "doctor" && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(patient);
                }}
                disabled={
                  loading.deletePatient ||
                  loading.addPatient ||
                  loading.updatePatient
                }
                className="text-accent hover:text-accent/80 disabled:text-accent/50 transition-colors cursor-pointer disabled:cursor-not-allowed p-1 hover:bg-accent/10 rounded"
                title="Edit"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(patient);
                }}
                disabled={
                  loading.deletePatient ||
                  loading.addPatient ||
                  loading.updatePatient
                }
                className="text-destructive hover:text-destructive/80 disabled:text-destructive/50 transition-colors cursor-pointer disabled:cursor-not-allowed p-1 hover:bg-destructive/10 rounded"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
};

export default function PatientsPage() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [patients, setPatients] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [editingPatient, setEditingPatient] = useState(null);
  const [showExtraChargesModal, setShowExtraChargesModal] = useState(false);
  const [extraChargesForm, setExtraChargesForm] = useState({
    amount: "",
    treatment: "",
    reason: "",
  });
  const [loadingExtraCharges, setLoadingExtraCharges] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    phones: [{ number: "", isPrimary: true }],
    email: "",
    dob: "",
    nationality: "",
    idNumber: "",
    address: "",
    insuranceProvider: "",
    insuranceNumber: "",
    allergies: "",
    medicalConditions: "",
    assignedDoctorId: "",
    photoUrl: "",
  });
  const [doctors, setDoctors] = useState([]);
  const [editingMedicalInfo, setEditingMedicalInfo] = useState(false);
  const [medicalFormData, setMedicalFormData] = useState({
    medicalHistory: "",
    allergies: "",
    medicalConditions: "",
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState<any>(null);

  // New state for credential warning modal
  const [showCredentialWarning, setShowCredentialWarning] = useState(false);
  const [credentialWarnings, setCredentialWarnings] = useState<string[]>([]);
  const [pendingSubmit, setPendingSubmit] = useState<(() => void) | null>(null);

  // Search and pagination state
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Loading states
  const [loading, setLoading] = useState({
    patients: false,
    doctors: false,
    addPatient: false,
    updatePatient: false,
    deletePatient: false,
    updateMedicalInfo: false,
  });

  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Initialize showPhotoUpload state
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);

  const [medicalHistoryEntries, setMedicalHistoryEntries] = useState<any[]>([]);
  const [loadingMedicalHistory, setLoadingMedicalHistory] = useState(false);

  useEffect(() => {
    if (token) {
      fetchPatients();
      if (user?.role !== "doctor") {
        fetchDoctors();
      }
    }
  }, [token, user?.role]);

  const fetchPatients = async () => {
    setLoading((prev) => ({ ...prev, patients: true }));
    try {
      const res = await fetch("/api/patients", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPatients(data.patients || []);
      } else {
        try {
          const error = await res.json();
          toast.error(error.error || "Failed to fetch patients");
        } catch {
          toast.error("Failed to fetch patients");
        }
      }
    } catch (error) {
      toast.error("Error fetching patients");
    } finally {
      setLoading((prev) => ({ ...prev, patients: false }));
    }
  };

  const fetchDoctors = async () => {
    setLoading((prev) => ({ ...prev, doctors: true }));
    try {
      const res = await fetch("/api/users?role=doctor", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDoctors(data.users || []);
      } else {
        try {
          const error = await res.json();
          toast.error(error.error || "Failed to fetch doctors");
        } catch {
          toast.error("Failed to fetch doctors");
        }
      }
    } catch (error) {
      toast.error("Error fetching doctors");
    } finally {
      setLoading((prev) => ({ ...prev, doctors: false }));
    }
  };

  // Filter patients based on search term
  const filteredPatients = patients.filter((patient) => {
    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();
    return (
      patient.name?.toLowerCase().includes(searchLower) ||
      patient.phones?.some((p: any) =>
        p.number?.toLowerCase().includes(searchLower),
      ) ||
      patient.email?.toLowerCase().includes(searchLower) ||
      patient.idNumber?.toLowerCase().includes(searchLower) ||
      patient.assignedDoctorId?.name?.toLowerCase().includes(searchLower) ||
      patient.allergies?.some((allergy: string) =>
        allergy.toLowerCase().includes(searchLower),
      ) ||
      patient.medicalConditions?.some((condition: string) =>
        condition.toLowerCase().includes(searchLower),
      )
    );
  });

  // Calculate pagination
  const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPatients = filteredPatients.slice(startIndex, endIndex);

  // Reset to first page when search term or items per page changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, itemsPerPage]);

  const addPhoneField = () => {
    setFormData({
      ...formData,
      phones: [...formData.phones, { number: "", isPrimary: false }],
    });
  };

  const removePhoneField = (index: number) => {
    const updatedPhones = formData.phones.filter((_, i) => i !== index);
    if (updatedPhones.length > 0 && formData.phones[index].isPrimary) {
      updatedPhones[0].isPrimary = true;
    }
    setFormData({
      ...formData,
      phones:
        updatedPhones.length > 0
          ? updatedPhones
          : [{ number: "", isPrimary: true }],
    });
  };

  const updatePhoneField = (
    index: number,
    value: string,
    isPrimary?: boolean,
  ) => {
    const updatedPhones = [...formData.phones];
    updatedPhones[index].number = value;
    if (isPrimary !== undefined) {
      updatedPhones[index].isPrimary = isPrimary;
      if (isPrimary) {
        updatedPhones.forEach((phone, i) => {
          if (i !== index) phone.isPrimary = false;
        });
      }
    }
    setFormData({
      ...formData,
      phones: updatedPhones,
    });
  };

  const validatePhoneInput = (
    phone: string,
  ): { valid: boolean; error?: string } => {
    if (!phone) {
      return { valid: false, error: "Phone number is required" };
    }

    const phoneStr = String(phone).trim();

    if (phoneStr === "") {
      return { valid: false, error: "Phone number is required" };
    }

    // Check if it starts with +
    if (!phoneStr.startsWith("+")) {
      return {
        valid: false,
        error: "Phone must start with + (country code, e.g., +1234567890)",
      };
    }

    // Get digits after +
    const digitsOnly = phoneStr.slice(1);

    // Check if contains only digits
    if (!/^\d+$/.test(digitsOnly)) {
      return { valid: false, error: "Phone must contain only digits after +" };
    }

    return { valid: true };
  };

  const validatePhoneInputStrict = (
    phone: string,
  ): { valid: boolean; error?: string } => {
    const basicValidation = validatePhoneInput(phone);
    if (!basicValidation.valid) {
      return basicValidation;
    }

    const phoneStr = String(phone).trim();
    const digitsOnly = phoneStr.slice(1);

    // Check length only on form submission
    if (digitsOnly.length < 10 || digitsOnly.length > 15) {
      return { valid: false, error: "Phone must be 10-15 digits after +" };
    }

    return { valid: true };
  };

  const validatePatientCredentials = (data: any) => {
    const criticalCredentials: string[] = [];
    const warningCredentials: string[] = [];

    if (!data.idNumber?.trim()) criticalCredentials.push("ID Number");

    // Check if phones array exists and has at least one valid phone
    const hasValidPhone =
      data.phones &&
      Array.isArray(data.phones) &&
      data.phones.some((p: any) => {
        const phoneNumber = p?.number?.trim();
        return (
          phoneNumber &&
          phoneNumber !== "" &&
          validatePhoneInputStrict(phoneNumber).valid
        );
      });

    if (!hasValidPhone) criticalCredentials.push("Phone Number");

    if (!data.dob?.trim()) criticalCredentials.push("Date of Birth");
    if (!data.name?.trim()) criticalCredentials.push("Name");

    if (!data.insuranceProvider?.trim())
      warningCredentials.push("Insurance Provider");
    if (!data.insuranceNumber?.trim())
      warningCredentials.push("Insurance Number");
    if (!data.address?.trim()) warningCredentials.push("Address");

    return {
      isComplete: criticalCredentials.length === 0,
      criticalCredentials,
      warningCredentials,
    };
  };

  const checkIdNumberExists = async (
    idNumber: string,
    excludePatientId?: string,
  ): Promise<boolean> => {
    try {
      let checkUrl = `/api/patients/check-id?idNumber=${encodeURIComponent(idNumber)}`;
      if (excludePatientId) {
        checkUrl += `&excludeId=${excludePatientId}`;
      }

      const res = await fetch(checkUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        return data.exists;
      }
      return false;
    } catch (error) {
      console.error("Error checking ID number:", error);
      return false;
    }
  };

  // Enhanced handleAddPatient function with credential warnings modal
  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();

    const loadingKey = editingPatient ? "updatePatient" : "addPatient";
    setLoading((prev) => ({ ...prev, [loadingKey]: true }));

    if (formData.idNumber?.trim()) {
      const idExists = await checkIdNumberExists(
        formData.idNumber,
        editingPatient || undefined,
      );
      if (idExists) {
        toast.error(
          `Patient ID number "${formData.idNumber}" already exists. Please use a different ID number.`,
        );
        setLoading((prev) => ({ ...prev, [loadingKey]: false }));
        return;
      }
    }

    // Validate credentials
    const validation = validatePatientCredentials({
      ...formData,
    });

    // Log for debugging
    console.log("Form data before validation:", formData);
    console.log("Validation result:", validation);

    // Block if critical credentials are missing
    if (validation.criticalCredentials.length > 0) {
      toast.error(
        `Missing critical credentials: ${validation.criticalCredentials.join(", ")}`,
      );
      setLoading((prev) => ({ ...prev, [loadingKey]: false }));
      return;
    }

    if (!formData.assignedDoctorId) {
      toast.error(formErrors.assignedDoctorId);
      setLoading((prev) => ({ ...prev, [loadingKey]: false }));
      return;
    }

    const selectedDoctor = doctors.find(
      (doc) => doc.id === formData.assignedDoctorId,
    );
    if (!selectedDoctor) {
      toast.error(
        "Invalid doctor selection. Please select a doctor from the list.",
      );
      setLoading((prev) => ({ ...prev, [loadingKey]: false }));
      return;
    }

    // Show modal for missing non-critical credentials - DON'T reset loading here
    if (validation.warningCredentials.length > 0) {
      setCredentialWarnings(validation.warningCredentials);
      setPendingSubmit(() => () => submitPatientData(loadingKey));
      setShowCredentialWarning(true);
      // DON'T reset loading state here - keep it true so the button shows loading
      return;
    }

    // If no warnings, proceed directly
    await submitPatientData(loadingKey);
  };

  // Separate function to handle the actual submission
  const submitPatientData = async (loadingKey: string) => {
    try {
      // Filter out empty phones and validate each phone
      const validPhones = formData.phones
        .filter((p) => {
          const phoneNumber = p.number?.trim();
          if (!phoneNumber) return false;

          const validation = validatePhoneInputStrict(phoneNumber);
          if (!validation.valid) {
            toast.error(`Invalid phone number: ${validation.error}`);
            return false;
          }
          return true;
        })
        .map((p) => ({
          number: formatPhoneForDatabase(p.number),
          isPrimary: p.isPrimary || false,
        }));

      // Ensure at least one phone
      if (validPhones.length === 0) {
        toast.error("At least one valid phone number is required");
        setLoading((prev) => ({ ...prev, [loadingKey]: false }));
        return;
      }

      // Ensure exactly one primary phone
      if (!validPhones.some((p) => p.isPrimary)) {
        validPhones[0].isPrimary = true;
      }

      const method = editingPatient ? "PUT" : "POST";
      const url = editingPatient
        ? `/api/patients/${editingPatient}`
        : "/api/patients";

      // Calculate age from DOB
      const calculateAge = (dob: string): number => {
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();

        if (
          monthDiff < 0 ||
          (monthDiff === 0 && today.getDate() < birthDate.getDate())
        ) {
          age--;
        }

        return Math.max(0, age);
      };

      // Prepare the data for API
      const patientData = {
        name: formData.name.trim(),
        phones: validPhones,
        email: formData.email?.trim() || "",
        dob: formData.dob,
        age: calculateAge(formData.dob),
        nationality: formData.nationality?.trim() || "",
        idNumber: formData.idNumber?.trim() || "",
        address: formData.address?.trim() || "",
        insuranceProvider: formData.insuranceProvider?.trim() || "",
        insuranceNumber: formData.insuranceNumber?.trim() || "",
        allergies: formData.allergies
          .split(",")
          .map((a) => a.trim())
          .filter(Boolean),
        medicalConditions: formData.medicalConditions
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean),
        assignedDoctorId: formData.assignedDoctorId,
        photoUrl: formData.photoUrl || null,
      };

      console.log("Sending patient data:", patientData);

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(patientData),
      });

      const responseText = await res.text();
      console.log("API Response:", responseText);

      if (res.ok) {
        const data = JSON.parse(responseText);
        if (editingPatient) {
          setPatients(
            patients.map((p) => (p._id === editingPatient ? data.patient : p)),
          );
        } else {
          setPatients([...patients, data.patient]);
        }

        setFormData({
          name: "",
          phones: [{ number: "", isPrimary: true }],
          email: "",
          dob: "",
          nationality: "",
          idNumber: "",
          address: "",
          insuranceProvider: "",
          insuranceNumber: "",
          allergies: "",
          medicalConditions: "",
          assignedDoctorId: "",
          photoUrl: "",
        });

        setShowForm(false);
        setEditingPatient(null);
        toast.success(
          editingPatient
            ? "Patient updated successfully"
            : "Patient added successfully",
        );
      } else {
        try {
          const error = JSON.parse(responseText);
          toast.error(error.error || "Failed to save patient");
        } catch {
          toast.error("Failed to save patient");
        }
      }
      setLoading((prev) => ({ ...prev, [loadingKey]: false }));
      setShowCredentialWarning(false);
      setPendingSubmit(null);
    } catch (error: any) {
      console.error("Submit error:", error);
      toast.error(error.message || "Failed to save patient");
      setLoading((prev) => ({ ...prev, [loadingKey]: false }));
    }
  };

  // Handle proceed with warnings
  const handleProceedWithWarnings = () => {
    setShowCredentialWarning(false);
    if (pendingSubmit) {
      // Re-enable loading state when proceeding with warnings
      const loadingKey = editingPatient ? "updatePatient" : "addPatient";
      setLoading((prev) => ({ ...prev, [loadingKey]: true }));
      pendingSubmit();
    }
    setPendingSubmit(null);
    setCredentialWarnings([]);
  };

  // Handle cancel with warnings
  const handleCancelWithWarnings = () => {
    setShowCredentialWarning(false);
    setPendingSubmit(null);
    setCredentialWarnings([]);
  };

  const handleDeletePatient = async (patientId: string) => {
    setLoading((prev) => ({ ...prev, deletePatient: true }));
    try {
      const res = await fetch(`/api/patients/${patientId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setPatients(patients.filter((p) => p._id !== patientId));
        toast.success(`Patient deleted successfully.`);
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to delete patient");
      }
    } catch (error) {
      toast.error("Error deleting patient");
    } finally {
      setLoading((prev) => ({ ...prev, deletePatient: false }));
    }
  };

  const handleEditPatient = (patient: any) => {
    setEditingPatient(patient._id);

    let doctorId = "";
    if (patient.assignedDoctorId) {
      const assignedDoctor = doctors.find(
        (doc) =>
          doc.id === patient.assignedDoctorId._id?.toString() ||
          doc._id === patient.assignedDoctorId._id?.toString(),
      );
      doctorId =
        assignedDoctor?.id || patient.assignedDoctorId._id?.toString() || "";
    }

    // Map phones from patient data - handle both old and new structure
    const phones =
      patient.phones && Array.isArray(patient.phones)
        ? patient.phones.map((p: any) => ({
            number: p.number || "",
            isPrimary: p.isPrimary || false,
          }))
        : [{ number: patient.phone || "", isPrimary: true }];

    setFormData({
      name: patient.name || "",
      phones: phones,
      email: patient.email || "",
      dob: patient.dob || "",
      nationality: patient.nationality || "",
      idNumber: patient.idNumber || "",
      address: patient.address || "",
      insuranceProvider: patient.insuranceProvider || "",
      insuranceNumber: patient.insuranceNumber || "",
      allergies: patient.allergies?.join(", ") || "",
      medicalConditions: patient.medicalConditions?.join(", ") || "",
      assignedDoctorId:
        patient.assignedDoctorId?._id || patient.assignedDoctorId || "",
      photoUrl: patient.photoUrl || "",
    });
    setShowForm(true);
  };

  // Update the handlePhotoUpload function
  const handlePhotoUpload = (url: string) => {
    setFormData((prev) => ({
      ...prev,
      photoUrl: url,
    }));
    setShowPhotoUpload(false);
  };

  const handleUpdateMedicalInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;

    setLoading((prev) => ({ ...prev, updateMedicalInfo: true }));

    try {
      const res = await fetch(`/api/patients/${selectedPatient._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          medicalHistory: medicalFormData.medicalHistory,
          allergies: medicalFormData.allergies
            .split(",")
            .map((a) => a.trim())
            .filter(Boolean),
          medicalConditions: medicalFormData.medicalConditions
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setPatients(
          patients.map((p) =>
            p._id === selectedPatient._id ? data.patient : p,
          ),
        );
        setSelectedPatient(data.patient);
        setEditingMedicalInfo(false);
        toast.success("Medical info updated successfully");
      } else {
        let errorMessage = "Failed to update medical info";
        try {
          const error = await res.json();
          errorMessage = error.error || error.message || errorMessage;
        } catch (parseError) {
          errorMessage = `Failed to update medical info (${res.status})`;
        }
        toast.error(errorMessage);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error updating medical info",
      );
    } finally {
      setLoading((prev) => ({ ...prev, updateMedicalInfo: false }));
    }
  };

  const fetchMedicalHistory = async (patientId: string) => {
    setLoadingMedicalHistory(true);
    console.log("[v0] Fetching medical history for patient:", patientId);
    try {
      const res = await fetch(`/api/medical-history?patientId=${patientId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        console.log("[v0] Medical history response:", data);
        const entries = data.history?.entries || [];
        console.log("[v0] Extracted entries:", entries);
        setMedicalHistoryEntries(entries);
      } else {
        console.error(
          "[v0] Failed to fetch medical history, status:",
          res.status,
        );
        const errorData = await res.json().catch(() => ({}));
        console.error("[v0] Error response:", errorData);
        setMedicalHistoryEntries([]);
      }
    } catch (error) {
      console.error("[v0] Error fetching medical history:", error);
      setMedicalHistoryEntries([]);
    } finally {
      setLoadingMedicalHistory(false);
    }
  };

  const handleExtraChargesRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !selectedPatient ||
      !extraChargesForm.amount ||
      !extraChargesForm.treatment
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoadingExtraCharges(true);
    try {
      const res = await fetch(
        `/api/billing/${selectedPatient._id}/extra-charges`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            amount: Number.parseFloat(extraChargesForm.amount),
            treatment: extraChargesForm.treatment,
            reason: extraChargesForm.reason,
            patientId: selectedPatient._id,
            patientName: selectedPatient.name,
          }),
        },
      );

      if (res.ok) {
        toast.success("Extra charges request sent to admin for approval");
        setShowExtraChargesModal(false);
        setExtraChargesForm({
          amount: "",
          treatment: "",
          reason: "",
        });
        setSelectedPatient(null);
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to send charges request");
      }
    } catch (error) {
      toast.error("Error sending charges request");
    } finally {
      setLoadingExtraCharges(false);
    }
  };

  const incompleteCredentials = patients.filter(
    (p) => p.credentialStatus === "incomplete",
  );

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-background">
        <Sidebar />
        <main className="flex-1 overflow-auto md:pt-0 pt-16">
          <div className="p-3 sm:p-4 md:p-6 lg:p-8">
            <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">
                  Patients
                </h1>
                <p className="text-muted-foreground text-xs sm:text-sm mt-1">
                  Manage patient records and medical information
                </p>
              </div>
              <div className="flex gap-2 flex-col xs:flex-row">
                {user?.role !== "doctor" && (
                  <button
                    onClick={() => {
                      setEditingPatient(null);
                      setShowForm(!showForm);
                      if (!showForm) {
                        setFormData({
                          name: "",
                          phones: [{ number: "", isPrimary: true }],
                          email: "",
                          dob: "",
                          nationality: "",
                          idNumber: "",
                          address: "",
                          insuranceProvider: "",
                          insuranceNumber: "",
                          allergies: "",
                          medicalConditions: "",
                          assignedDoctorId: "",
                          photoUrl: "",
                        });
                        setShowPhotoUpload(false);
                      }
                    }}
                    disabled={
                      loading.patients ||
                      loading.doctors ||
                      loading.addPatient ||
                      loading.updatePatient
                    }
                    className="flex items-center gap-2 bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground px-4 py-2 rounded-lg transition-colors text-sm sm:text-base font-medium cursor-pointer disabled:cursor-not-allowed w-fit"
                  >
                    {loading.addPatient || loading.updatePatient ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    {showForm ? "Cancel" : "Add Patient"}
                  </button>
                )}
              </div>
            </div>

            {incompleteCredentials.length > 0 && (
              <div className="mb-6 bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-destructive mb-1">
                    Incomplete Patient Credentials
                  </h3>
                  <p className="text-sm text-destructive/80">
                    {incompleteCredentials.length} patient(s) have missing
                    critical information. Please update their records.
                  </p>
                </div>
              </div>
            )}

            {showForm && user?.role !== "doctor" && (
              <div className="bg-card rounded-lg shadow-md border border-border p-6 mb-8">
                <h2 className="text-lg sm:text-xl font-bold mb-6 text-foreground">
                  {editingPatient ? "Edit Patient" : "Add New Patient"}
                </h2>
                <form onSubmit={handleAddPatient} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Patient Photo
                      </label>
                      <div className="flex items-center gap-4">
                        {formData.photoUrl && (
                          <img
                            src={formData.photoUrl || "/placeholder.svg"}
                            alt="Patient"
                            className="w-20 h-20 rounded-lg object-cover border border-border"
                          />
                        )}
                        {showPhotoUpload ? (
                          <div className="space-y-4">
                            <h3 className="font-semibold text-foreground">
                              Upload Patient Photo
                            </h3>
                            <PatientPhotoUpload
                              onUploadSuccess={handlePhotoUpload}
                              isLoading={
                                loading.addPatient || loading.updatePatient
                              }
                            />
                            <button
                              onClick={() => setShowPhotoUpload(false)}
                              className="w-full px-4 py-2 border border-border hover:bg-muted rounded-lg transition-colors text-sm font-medium"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <label
                            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors text-sm font-medium cursor-pointer disabled:cursor-not-allowed"
                            style={{
                              pointerEvents:
                                loading.addPatient || loading.updatePatient
                                  ? "none"
                                  : "auto",
                              opacity:
                                loading.addPatient || loading.updatePatient
                                  ? 0.5
                                  : 1,
                            }}
                            onClick={() => setShowPhotoUpload(true)}
                          >
                            <Upload className="w-4 h-4" />
                            {formData.photoUrl
                              ? "Change Photo"
                              : "Upload Photo"}
                          </label>
                        )}
                      </div>
                    </div>

                    <input
                      type="text"
                      placeholder="Full Name *"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm cursor-text"
                      required
                      disabled={loading.addPatient || loading.updatePatient}
                    />
                    <input
                      type="text"
                      placeholder="ID Number *"
                      value={formData.idNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, idNumber: e.target.value })
                      }
                      className="px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm cursor-text"
                      required
                      disabled={loading.addPatient || loading.updatePatient}
                    />
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Phone Numbers *
                      </label>
                      <div className="space-y-2">
                        {formData.phones.map((phone, index) => (
                          <div key={index} className="flex gap-2 items-center">
                            <div className="flex-1">
                              <PhoneInput
                                international
                                countryCallingCodeEditable={false}
                                defaultCountry="JO"
                                value={phone.number}
                                onChange={(value) =>
                                  updatePhoneField(
                                    index,
                                    value || "",
                                    phone.isPrimary,
                                  )
                                }
                                onBlur={() => {
                                  if (phone.number && phone.number.trim()) {
                                    const validation = validatePhoneInput(
                                      phone.number,
                                    );
                                    if (!validation.valid) {
                                      toast.error(validation.error);
                                    }
                                  }
                                }}
                                className="phone-input-wrapper"
                                disabled={
                                  loading.addPatient || loading.updatePatient
                                }
                              />
                            </div>
                            <label className="flex items-center gap-2 text-sm whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={phone.isPrimary}
                                onChange={(e) =>
                                  updatePhoneField(
                                    index,
                                    phone.number,
                                    e.target.checked,
                                  )
                                }
                                disabled={
                                  loading.addPatient || loading.updatePatient
                                }
                                className="w-4 h-4"
                              />
                              Primary
                            </label>
                            {formData.phones.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removePhoneField(index)}
                                className="p-2 text-red-500 bg-red-50 rounded cursor-pointer"
                                disabled={
                                  loading.addPatient || loading.updatePatient
                                }
                              >
                                <X size={18} />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={addPhoneField}
                          className="mt-2 px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:opacity-90 cursor-pointer disabled:cursor-not-allowed rounded-md"
                          disabled={loading.addPatient || loading.updatePatient}
                        >
                          <Plus size={16} className="inline mr-1" /> Add Phone
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Format: + followed by country code and number. Mark one
                        as primary for WhatsApp.
                      </p>
                    </div>
                    <input
                      type="email"
                      placeholder="Email"
                      value={formData.email || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm cursor-text"
                      disabled={loading.addPatient || loading.updatePatient}
                    />
                    <input
                      type="date"
                      placeholder="Date of Birth *"
                      value={formData.dob}
                      onChange={(e) =>
                        setFormData({ ...formData, dob: e.target.value })
                      }
                      className="px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm cursor-text"
                      required
                      disabled={loading.addPatient || loading.updatePatient}
                    />
                    <input
                      type="text"
                      placeholder="Nationality (optional)"
                      value={formData.nationality}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          nationality: e.target.value,
                        })
                      }
                      className="px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm cursor-text"
                      disabled={loading.addPatient || loading.updatePatient}
                    />
                    <input
                      type="text"
                      placeholder="Address"
                      value={formData.address}
                      onChange={(e) =>
                        setFormData({ ...formData, address: e.target.value })
                      }
                      className="px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm cursor-text"
                      disabled={loading.addPatient || loading.updatePatient}
                    />
                    <input
                      type="text"
                      placeholder="Insurance Provider"
                      value={formData.insuranceProvider}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          insuranceProvider: e.target.value,
                        })
                      }
                      className="px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm cursor-text"
                      disabled={loading.addPatient || loading.updatePatient}
                    />
                    <input
                      type="text"
                      placeholder="Insurance Number"
                      value={formData.insuranceNumber}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          insuranceNumber: e.target.value,
                        })
                      }
                      className="px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm cursor-text"
                      disabled={loading.addPatient || loading.updatePatient}
                    />
                    <SearchableDropdown
                      items={doctors.map((doc) => ({
                        id: doc.id,
                        name: doc.name,
                        ...doc,
                      }))}
                      selectedItem={
                        formData.assignedDoctorId
                          ? doctors.find(
                              (doc) => doc.id === formData.assignedDoctorId,
                            )
                          : null
                      }
                      onSelect={(doctor) => {
                        console.log("[v0] Doctor selected:", doctor?.name);
                        setFormData({
                          ...formData,
                          assignedDoctorId: doctor ? doctor.id : "",
                        });
                      }}
                      placeholder="Select Doctor *"
                      searchPlaceholder="Search doctors..."
                      label="Assigned Doctor"
                      required
                      disabled={
                        loading.addPatient ||
                        loading.updatePatient ||
                        loading.doctors
                      }
                    />
                  </div>
                  <textarea
                    placeholder="Allergies (comma-separated)"
                    value={formData.allergies}
                    onChange={(e) =>
                      setFormData({ ...formData, allergies: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm cursor-text disabled:cursor-not-allowed"
                    rows={2}
                    disabled={loading.addPatient || loading.updatePatient}
                  />
                  <textarea
                    placeholder="Medical Conditions (comma-separated)"
                    value={formData.medicalConditions}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        medicalConditions: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm cursor-text disabled:cursor-not-allowed"
                    rows={2}
                    disabled={loading.addPatient || loading.updatePatient}
                  />
                  <div className="flex gap-2 flex-wrap">
                    <button
                      type="submit"
                      disabled={loading.addPatient || loading.updatePatient}
                      className="flex items-center gap-2 bg-accent hover:bg-accent/90 disabled:bg-accent/50 text-accent-foreground px-4 py-2 rounded-lg transition-colors text-sm font-medium cursor-pointer disabled:cursor-not-allowed"
                    >
                      {(loading.addPatient || loading.updatePatient) && (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      )}
                      {editingPatient ? "Update Patient" : "Add Patient"}
                    </button>
                    {editingPatient && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPatient(null);
                          setShowForm(false);
                        }}
                        disabled={loading.addPatient || loading.updatePatient}
                        className="bg-muted hover:bg-muted/80 disabled:bg-muted/50 text-muted-foreground px-4 py-2 rounded-lg transition-colors text-sm font-medium cursor-pointer disabled:cursor-not-allowed"
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>
                </form>
              </div>
            )}

            {/* Search and Controls */}
            <div className="bg-card rounded-lg shadow-md border border-border p-4 mb-6">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search patients..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm"
                  />
                </div>

                {/* Controls */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="itemsPerPage"
                      className="text-sm text-muted-foreground whitespace-nowrap"
                    >
                      Rows:
                    </label>
                    <select
                      id="itemsPerPage"
                      value={itemsPerPage}
                      onChange={(e) => setItemsPerPage(Number(e.target.value))}
                      className="px-2 py-1 bg-input border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary text-foreground text-sm"
                    >
                      <option value="5">5</option>
                      <option value="10">10</option>
                      <option value="20">20</option>
                      <option value="50">50</option>
                    </select>
                  </div>

                  <button
                    onClick={fetchPatients}
                    disabled={loading.patients}
                    className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg transition-colors font-medium text-sm disabled:opacity-50 cursor-pointer"
                  >
                    <Loader2
                      className={`w-4 h-4 ${loading.patients ? "animate-spin" : ""}`}
                    />
                    {loading.patients ? "Loading..." : "Refresh"}
                  </button>
                </div>
              </div>
            </div>

            {/* Patients Table */}
            <div className="bg-card rounded-lg shadow-md border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted border-b border-border">
                    <tr>
                      <th className="text-left px-4 sm:px-6 py-3 font-semibold text-muted-foreground">
                        Photo
                      </th>
                      <th className="text-left px-4 sm:px-6 py-3 font-semibold text-muted-foreground">
                        Name
                      </th>
                      <th className="text-left px-4 sm:px-6 py-3 font-semibold text-muted-foreground hidden sm:table-cell">
                        Phone
                      </th>
                      <th className="text-left px-4 sm:px-6 py-3 font-semibold text-muted-foreground hidden md:table-cell">
                        Doctor
                      </th>
                      <th className="text-left px-4 sm:px-6 py-3 font-semibold text-muted-foreground">
                        Credentials
                      </th>
                      <th className="text-left px-4 sm:px-6 py-3 font-semibold text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading.patients ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 sm:px-6 py-8 text-center"
                        >
                          <div className="flex flex-col items-center justify-center gap-3">
                            <div className="flex justify-center items-center gap-2">
                              <div className="w-3 h-3 bg-primary rounded-full animate-bounce"></div>
                              <div
                                className="w-3 h-3 bg-primary rounded-full animate-bounce"
                                style={{ animationDelay: "0.1s" }}
                              ></div>
                              <div
                                className="w-3 h-3 bg-primary rounded-full animate-bounce"
                                style={{ animationDelay: "0.2s" }}
                              ></div>
                            </div>
                            <span className="text-muted-foreground text-sm">
                              Loading patients...
                            </span>
                          </div>
                        </td>
                      </tr>
                    ) : currentPatients.length > 0 ? (
                      currentPatients.map((patient) => (
                        <PatientRow
                          key={patient._id}
                          patient={patient}
                          onView={(patient) => {
                            setSelectedPatient(patient);
                            setMedicalFormData({
                              medicalHistory: patient.medicalHistory || "",
                              allergies: patient.allergies?.join(", ") || "",
                              medicalConditions:
                                patient.medicalConditions?.join(", ") || "",
                            });
                            fetchMedicalHistory(patient._id);
                          }}
                          onEdit={handleEditPatient}
                          onDelete={(patient) => {
                            setPatientToDelete(patient);
                            setShowDeleteModal(true);
                          }}
                          loading={loading}
                          user={user}
                        />
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 sm:px-6 py-8 text-center text-muted-foreground"
                        >
                          {searchTerm
                            ? "No patients found matching your search"
                            : "No patients found"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {filteredPatients.length > 0 && (
                <div className="px-4 sm:px-6 py-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-muted-foreground">
                    Showing{" "}
                    <span className="font-medium">
                      {filteredPatients.length === 0 ? 0 : startIndex + 1}
                    </span>{" "}
                    to{" "}
                    <span className="font-medium">
                      {Math.min(endIndex, filteredPatients.length)}
                    </span>{" "}
                    of{" "}
                    <span className="font-medium">
                      {filteredPatients.length}
                    </span>{" "}
                    results
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={currentPage === 1}
                      className="p-2 rounded border border-border bg-background hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(
                          (page) =>
                            page === 1 ||
                            page === totalPages ||
                            Math.abs(page - currentPage) <= 1,
                        )
                        .map((page, index, array) => {
                          const showEllipsis =
                            index < array.length - 1 &&
                            array[index + 1] - page > 1;
                          return (
                            <div key={page} className="flex items-center">
                              <button
                                onClick={() => setCurrentPage(page)}
                                className={`min-w-[2rem] h-8 px-2 rounded text-sm font-medium transition-colors ${
                                  currentPage === page
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-background text-foreground hover:bg-muted border border-border"
                                }`}
                              >
                                {page}
                              </button>
                              {showEllipsis && (
                                <span className="px-1 text-muted-foreground">
                                  ...
                                </span>
                              )}
                            </div>
                          );
                        })}
                    </div>

                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                      }
                      disabled={currentPage === totalPages || totalPages === 0}
                      className="p-2 rounded border border-border bg-background hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Credential Warning Modal */}
            {showCredentialWarning && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                <div className="bg-card rounded-lg shadow-lg border border-border p-6 max-w-md w-full">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-warning/20 rounded-full flex items-center justify-center">
                      <AlertCircle className="w-6 h-6 text-warning" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">
                        Missing Patient Information
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        The following information is missing:
                      </p>
                    </div>
                  </div>

                  <div className="mb-6">
                    <ul className="space-y-2">
                      {credentialWarnings.map((warning, index) => (
                        <li
                          key={index}
                          className="flex items-center gap-2 text-warning"
                        >
                          <AlertCircle className="w-4 h-4 flex-shrink-0" />
                          <span className="text-sm">{warning}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-sm text-muted-foreground mt-4">
                      You can proceed to save the patient record, but it's
                      recommended to complete all information for better patient
                      management.
                    </p>
                  </div>

                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={handleCancelWithWarnings}
                      className="px-4 py-2 bg-muted hover:bg-muted/80 text-muted-foreground rounded-lg transition-colors text-sm font-medium cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleProceedWithWarnings}
                      className="px-4 py-2 bg-warning hover:bg-warning/90 text-warning-foreground rounded-lg transition-colors text-sm font-medium cursor-pointer"
                    >
                      Proceed Anyway
                    </button>
                  </div>
                </div>
              </div>
            )}

            {selectedPatient && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-3 sm:p-4 z-50">
                <div className="bg-card rounded-xl shadow-2xl border border-border p-4 sm:p-6 max-w-2xl w-full max-h-[95vh] overflow-y-auto mx-auto">
                  {/* Compact Header */}
                  <div className="flex items-start justify-between mb-4 sm:mb-6">
                    <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                      {selectedPatient.photoUrl ? (
                        <img
                          src={selectedPatient.photoUrl || "/placeholder.svg"}
                          alt={selectedPatient.name}
                          className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg sm:rounded-xl object-cover border-2 border-primary/20 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 border-2 border-primary/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-lg sm:text-xl font-bold text-primary">
                            {selectedPatient.name?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="space-y-1 sm:space-y-2 min-w-0 flex-1">
                        <h2 className="text-lg sm:text-xl font-bold text-foreground leading-tight truncate">
                          {selectedPatient.name}
                        </h2>
                        <div className="flex flex-wrap gap-1 sm:gap-2">
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
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-full text-xs font-medium truncate max-w-[120px] sm:max-w-none">
                              <User className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">
                                {selectedPatient.assignedDoctorId.name}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedPatient(null);
                        setMedicalHistoryEntries([]);
                      }}
                      className="text-muted-foreground hover:text-foreground hover:bg-muted p-1 sm:p-2 rounded-lg transition-all cursor-pointer flex-shrink-0 ml-2"
                    >
                      <X className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>

                  {/* Compact Stats Bar */}
                  {/* <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2 sm:p-3 text-center">
                      <div className="text-base sm:text-lg font-bold text-blue-600 dark:text-blue-400">
                        {medicalHistoryEntries.length}
                      </div>
                      <div className="text-xs text-blue-600/80 dark:text-blue-400/80 font-medium">Visits</div>
                    </div>

                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-2 sm:p-3 text-center">
                      <div className="text-base sm:text-lg font-bold text-green-600 dark:text-green-400">
                        {selectedPatient.allergies?.length || 0}
                      </div>
                      <div className="text-xs text-green-600/80 dark:text-green-400/80 font-medium">Allergies</div>
                    </div>

                    <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-2 sm:p-3 text-center">
                      <div className="text-base sm:text-lg font-bold text-purple-600 dark:text-purple-400">
                        {selectedPatient.medicalConditions?.length || 0}
                      </div>
                      <div className="text-xs text-purple-600/80 dark:text-purple-400/80 font-medium">Conditions</div>
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-2 sm:p-3 text-center">
                      <div className="text-base sm:text-lg font-bold text-amber-600 dark:text-amber-400">
                        {selectedPatient.insuranceProvider ? "✓" : "✗"}
                      </div>
                      <div className="text-xs text-amber-600/80 dark:text-amber-400/80 font-medium">Insurance</div>
                    </div>
                  </div> */}

                  {/* Single Column Layout */}
                  <div className="space-y-3 sm:space-y-4">
                    {/* Contact Information */}
                    <div className="bg-muted/30 rounded-lg p-3 sm:p-4 border border-border">
                      <h3 className="font-semibold text-foreground mb-2 sm:mb-3 flex items-center gap-2 text-sm">
                        <User className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        Contact Information
                      </h3>
                      <div className="space-y-2 sm:space-y-3 text-sm">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 py-1">
                          <span className="text-muted-foreground font-medium text-xs sm:text-sm">
                            Phone:
                          </span>
                          <span className="text-foreground font-semibold text-sm sm:text-base">
                            {formatPhoneForDisplay(
                              selectedPatient.phones?.find(
                                (p: any) => p.isPrimary,
                              )?.number,
                            ) || "Not provided"}
                          </span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 py-1">
                          <span className="text-muted-foreground font-medium text-xs sm:text-sm">
                            Email:
                          </span>
                          <span className="text-foreground font-semibold truncate text-sm sm:text-base max-w-[200px] sm:max-w-[250px]">
                            {selectedPatient.email || "Not provided"}
                          </span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 py-1">
                          <span className="text-muted-foreground font-medium text-xs sm:text-sm">
                            Address:
                          </span>
                          <span className="text-foreground font-semibold text-right text-sm sm:text-base max-w-[200px] sm:max-w-[250px] break-words">
                            {selectedPatient.address || "Not provided"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Personal Details */}
                    <div className="bg-muted/30 rounded-lg p-3 sm:p-4 border border-border">
                      <h3 className="font-semibold text-foreground mb-2 sm:mb-3 flex items-center gap-2 text-sm">
                        <CreditCard className="w-4 h-4 text-green-600 flex-shrink-0" />
                        Personal Details
                      </h3>
                      <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 sm:gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground font-medium mb-1 text-xs sm:text-sm">
                            Date of Birth
                          </p>
                          <p className="text-foreground font-semibold text-sm sm:text-base">
                            {selectedPatient.dob || "Not provided"}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground font-medium mb-1 text-xs sm:text-sm">
                            Age
                          </p>
                          <p className="text-foreground font-semibold text-sm sm:text-base">
                            {selectedPatient.age
                              ? `${selectedPatient.age} years`
                              : "Not provided"}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground font-medium mb-1 text-xs sm:text-sm">
                            Nationality
                          </p>
                          <p className="text-foreground font-semibold text-sm sm:text-base">
                            {selectedPatient.nationality || "Not provided"}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground font-medium mb-1 text-xs sm:text-sm">
                            ID Number
                          </p>
                          <p className="text-foreground font-semibold text-sm sm:text-base">
                            {selectedPatient.idNumber || "Not provided"}
                          </p>
                        </div>
                        <div className="xs:col-span-2 sm:col-span-1">
                          <p className="text-muted-foreground font-medium mb-1 text-xs sm:text-sm">
                            Insurance Provider
                          </p>
                          <p className="text-foreground font-semibold text-sm sm:text-base truncate">
                            {selectedPatient.insuranceProvider ||
                              "Not provided"}
                          </p>
                        </div>
                        <div className="xs:col-span-2 sm:col-span-1">
                          <p className="text-muted-foreground font-medium mb-1 text-xs sm:text-sm">
                            Insurance Number
                          </p>
                          <p className="text-foreground font-semibold text-sm sm:text-base truncate">
                            {selectedPatient.insuranceNumber || "Not provided"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Medical Overview */}
                    <div className="bg-muted/30 rounded-lg p-3 sm:p-4 border border-border">
                      <h3 className="font-semibold text-foreground mb-2 sm:mb-3 flex items-center gap-2 text-sm">
                        <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                        Medical Overview
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <p className="text-muted-foreground font-medium mb-2 text-xs sm:text-sm">
                            Allergies
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {selectedPatient.allergies?.length > 0 ? (
                              selectedPatient.allergies.map(
                                (allergy: string, index: number) => (
                                  <span
                                    key={index}
                                    className="inline-block bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 px-2 py-1 rounded text-xs font-medium break-words max-w-full"
                                  >
                                    {allergy}
                                  </span>
                                ),
                              )
                            ) : (
                              <span className="text-muted-foreground text-sm">
                                None reported
                              </span>
                            )}
                          </div>
                        </div>

                        <div>
                          <p className="text-muted-foreground font-medium mb-2 text-xs sm:text-sm">
                            Conditions
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {selectedPatient.medicalConditions?.length > 0 ? (
                              selectedPatient.medicalConditions.map(
                                (condition: string, index: number) => (
                                  <span
                                    key={index}
                                    className="inline-block bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-1 rounded text-xs font-medium break-words max-w-full"
                                  >
                                    {condition}
                                  </span>
                                ),
                              )
                            ) : (
                              <span className="text-muted-foreground text-sm">
                                None reported
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Medical History */}
                    <div className="bg-muted/30 rounded-lg p-3 sm:p-4 border border-border">
                      <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm">
                          <FileText className="w-4 h-4 text-purple-600 flex-shrink-0" />
                          Medical History
                        </h3>
                        <button
                          onClick={() =>
                            fetchMedicalHistory(selectedPatient._id)
                          }
                          disabled={loadingMedicalHistory}
                          className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <RefreshCw
                            className={`w-3 h-3 ${loadingMedicalHistory ? "animate-spin" : ""}`}
                          />
                          <span className="hidden xs:inline">Refresh</span>
                        </button>
                      </div>

                      {loadingMedicalHistory ? (
                        <div className="flex justify-center items-center py-4 sm:py-6">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                            <div
                              className="w-2 h-2 bg-primary rounded-full animate-bounce"
                              style={{ animationDelay: "0.1s" }}
                            ></div>
                            <div
                              className="w-2 h-2 bg-primary rounded-full animate-bounce"
                              style={{ animationDelay: "0.2s" }}
                            ></div>
                          </div>
                        </div>
                      ) : medicalHistoryEntries.length > 0 ? (
                        <div className="space-y-2 sm:space-y-3 max-h-48 sm:max-h-64 overflow-y-auto pr-1 sm:pr-2">
                          {medicalHistoryEntries.map(
                            (entry: any, index: number) => (
                              <div
                                key={index}
                                className="bg-background rounded-lg p-2 sm:p-3 border border-border"
                              >
                                <div className="flex items-start justify-between mb-1 sm:mb-2">
                                  <div className="min-w-0 flex-1">
                                    <p className="font-medium text-foreground text-sm truncate">
                                      {entry.date
                                        ? new Date(
                                            entry.date,
                                          ).toLocaleDateString()
                                        : "N/A"}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">
                                      By {entry.createdByName || "Unknown"}
                                    </p>
                                  </div>
                                  <span className="inline-flex items-center px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium flex-shrink-0 ml-2">
                                    #{medicalHistoryEntries.length - index}
                                  </span>
                                </div>

                                <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm">
                                  {entry.findings && (
                                    <div>
                                      <p className="text-xs font-semibold text-muted-foreground">
                                        Findings
                                      </p>
                                      <p className="text-foreground line-clamp-2">
                                        {entry.findings}
                                      </p>
                                    </div>
                                  )}
                                  {entry.treatment && (
                                    <div>
                                      <p className="text-xs font-semibold text-muted-foreground">
                                        Treatment
                                      </p>
                                      <p className="text-foreground line-clamp-2">
                                        {entry.treatment}
                                      </p>
                                    </div>
                                  )}
                                  {entry.medications &&
                                    entry.medications.length > 0 && (
                                      <div>
                                        <p className="text-xs font-semibold text-muted-foreground">
                                          Medications
                                        </p>
                                        <p className="text-foreground text-xs line-clamp-1">
                                          {entry.medications.join(", ")}
                                        </p>
                                      </div>
                                    )}
                                  {entry.notes && (
                                    <div>
                                      <p className="text-xs font-semibold text-muted-foreground">
                                        Notes
                                      </p>
                                      <p className="text-foreground text-xs line-clamp-2">
                                        {entry.notes}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-4 sm:py-6">
                          <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-muted-foreground text-sm">
                            No medical history entries
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Compact Action Footer */}
                  <div className="flex flex-col gap-2 sm:gap-3 mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-border">
                    <div className="flex flex-col xs:flex-row gap-2 justify-between">
                      {user?.role !== "doctor" && (
                        <button
                          onClick={() => {
                            handleEditPatient(selectedPatient);
                            setSelectedPatient(null);
                          }}
                          className="flex items-center gap-2 bg-accent hover:bg-accent/90 text-accent-foreground px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm font-medium cursor-pointer flex-1 justify-center order-2 xs:order-1"
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit Patient
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedPatient(null);
                          setMedicalHistoryEntries([]);
                        }}
                        className="flex items-center gap-2 bg-muted hover:bg-muted/80 text-muted-foreground px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm font-medium cursor-pointer flex-1 justify-center order-1 xs:order-2"
                      >
                        Close
                      </button>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground break-words">
                        Patient ID: {selectedPatient.idNumber || "Not assigned"}{" "}
                        • Last updated:{" "}
                        {new Date(
                          selectedPatient.updatedAt ||
                            selectedPatient.createdAt,
                        ).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* Modal for adding billing request */}
            {showExtraChargesModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                <div className="bg-card rounded-xl shadow-2xl border border-border p-6 max-w-md w-full">
                  <h2 className="text-xl font-bold text-foreground mb-4">
                    Add Billing Request
                  </h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    Select a patient and add a billing request
                  </p>

                  <form
                    onSubmit={handleExtraChargesRequest}
                    className="space-y-4"
                  >
                    {/* Patient selection dropdown */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Patient *
                      </label>
                      <select
                        value={selectedPatient?._id || ""}
                        onChange={(e) => {
                          const patient = patients.find(
                            (p) => p._id === e.target.value,
                          );
                          setSelectedPatient(patient || null);
                        }}
                        className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm cursor-pointer"
                        required
                        disabled={loadingExtraCharges}
                      >
                        <option value="">Select a patient...</option>
                        {patients.map((patient) => (
                          <option key={patient._id} value={patient._id}>
                            {patient.name} (
                            {formatPhoneForDisplay(
                              patient.phones?.find((p: any) => p.isPrimary)
                                ?.number,
                            )}
                            )
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Treatment/Service *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., Root Canal, Special Procedure"
                        value={extraChargesForm.treatment}
                        onChange={(e) =>
                          setExtraChargesForm({
                            ...extraChargesForm,
                            treatment: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm"
                        required
                        disabled={loadingExtraCharges}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Amount ($) *
                      </label>
                      <input
                        type="number"
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        value={extraChargesForm.amount}
                        onChange={(e) =>
                          setExtraChargesForm({
                            ...extraChargesForm,
                            amount: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm"
                        required
                        disabled={loadingExtraCharges}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Reason for Charges
                      </label>
                      <textarea
                        placeholder="Explain why these additional charges are needed..."
                        value={extraChargesForm.reason}
                        onChange={(e) =>
                          setExtraChargesForm({
                            ...extraChargesForm,
                            reason: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm"
                        rows={3}
                        disabled={loadingExtraCharges}
                      />
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setShowExtraChargesModal(false);
                          setExtraChargesForm({
                            amount: "",
                            treatment: "",
                            reason: "",
                          });
                          setSelectedPatient(null);
                        }}
                        disabled={loadingExtraCharges}
                        className="flex-1 px-4 py-2 bg-muted hover:bg-muted/80 text-muted-foreground rounded-lg transition-colors text-sm font-medium cursor-pointer disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={loadingExtraCharges || !selectedPatient}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 disabled:bg-accent/50 text-accent-foreground rounded-lg transition-colors text-sm font-medium cursor-pointer disabled:cursor-not-allowed"
                      >
                        {loadingExtraCharges && (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        )}
                        Send Request
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
            <ConfirmDeleteModal
              isOpen={showDeleteModal}
              title="Delete Patient"
              description="Are you sure you want to delete this patient? This action cannot be undone and will remove all associated records including tooth charts, x-rays, medical reports, and appointments."
              itemName={patientToDelete?.name}
              onConfirm={() => {
                handleDeletePatient(patientToDelete._id);
                setShowDeleteModal(false);
                setPatientToDelete(null);
              }}
              onCancel={() => {
                setShowDeleteModal(false);
                setPatientToDelete(null);
              }}
              isLoading={loading.deletePatient}
            />
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
