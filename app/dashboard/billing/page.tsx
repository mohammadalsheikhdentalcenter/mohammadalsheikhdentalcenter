//@ts-nocheck
"use client";
import { ProtectedRoute } from "@/components/protected-route";
import { Sidebar } from "@/components/sidebar";
import { useAuth } from "@/components/auth-context";
import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { BillingPatientList } from "@/components/billing-patient-list";

export default function BillingPage() {
  const { user, token } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    patientId: "",
    treatments: "",
    totalAmount: "",
    paidAmount: "",
    paymentStatus: "Pending",
    notes: "",
  });
  const [patients, setPatients] = useState([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    pendingAmount: 0,
    totalInvoices: 0,
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [billingToDelete, setBillingToDelete] = useState<any>(null);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [selectedBillingForSplit, setSelectedBillingForSplit] =
    useState<any>(null);
  const [splits, setSplits] = useState<any[]>([]);
  const [splitLoading, setSplitLoading] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedBillingForDetails, setSelectedBillingForDetails] =
    useState<any>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Loading states
  const [loading, setLoading] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(3);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  useEffect(() => {
    if (token) {
      fetchPatients();
    }
  }, [token]);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/patient-stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPatients(data.patients || []);
      } else {
        toast.error("Failed to load patient billing information");
      }
    } catch (error) {
      console.error("Failed to fetch patients:", error);
      toast.error("Error loading patient data");
    } finally {
      setLoading(false);
    }
  };

  // Filter billing records based on search term
  const filteredPatients = patients.filter((patient: any) =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate pagination
  const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentPatients = filteredPatients.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  // Reset to first page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <ProtectedRoute allowedRoles={["admin", "receptionist"]}>
      <div className="flex h-screen bg-background">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 overflow-auto md:pt-0 pt-16">
          <div className="p-4 sm:p-6 lg:p-8">
            {/* Mobile Header */}
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <div className="hidden md:block">
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                  Billing & Invoicing
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                  Manage patient payments and invoices
                </p>
              </div>
              <div className="md:hidden">
                <h1 className="text-2xl font-bold text-foreground">
                  Billing & Invoicing
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                  Manage payments and invoices
                </p>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative w-full mb-8">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <input
                type="text"
                placeholder="Search patients by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm"
              />
            </div>

            {/* Patient List */}
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12">
                <div className="flex flex-col items-center justify-center gap-3">
                  <div className="flex justify-center items-center gap-2">
                    <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce"></div>
                    <div
                      className="w-3 h-3 bg-blue-600 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    ></div>
                    <div
                      className="w-3 h-3 bg-blue-600 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                  </div>
                  <span className="text-gray-600 text-sm">
                    Loading patient billing information...
                  </span>
                </div>
              </div>
            ) : filteredPatients.length > 0 ? (
              <div className="space-y-6">
                <BillingPatientList patients={currentPatients} />

                <div className="flex flex-col sm:flex-row items-center justify-between border-t border-border pt-6 gap-4">
                  <p className="text-sm text-muted-foreground text-center sm:text-left">
                    Showing{" "}
                    <span className="font-medium text-foreground">
                      {startIndex + 1}
                    </span>{" "}
                    to{" "}
                    <span className="font-medium text-foreground">
                      {Math.min(
                        startIndex + itemsPerPage,
                        filteredPatients.length
                      )}
                    </span>{" "}
                    of{" "}
                    <span className="font-medium text-foreground">
                      {filteredPatients.length}
                    </span>{" "}
                    patients
                  </p>

                  <div className="flex items-center justify-center w-full sm:w-auto">
                    {/* Mobile: Dropdown + arrows */}
                    {isMobile ? (
                      <div className="flex items-center gap-2 w-full justify-center">
                        <button
                          onClick={() =>
                            setCurrentPage((p) => Math.max(1, p - 1))
                          }
                          disabled={currentPage === 1}
                          className="p-2 border border-border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                          aria-label="Previous page"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>

                        <div className="flex items-center gap-1 flex-1 justify-center">
                          <select
                            value={currentPage}
                            onChange={(e) =>
                              setCurrentPage(Number(e.target.value))
                            }
                            className="bg-input border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary w-full max-w-[140px]"
                          >
                            {[...Array(totalPages)].map((_, i) => (
                              <option key={i} value={i + 1}>
                                Page {i + 1} of {totalPages}
                              </option>
                            ))}
                          </select>
                        </div>

                        <button
                          onClick={() =>
                            setCurrentPage((p) => Math.min(totalPages, p + 1))
                          }
                          disabled={currentPage === totalPages}
                          className="p-2 border border-border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                          aria-label="Next page"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      // Desktop: Full pagination
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            setCurrentPage((p) => Math.max(1, p - 1))
                          }
                          disabled={currentPage === 1}
                          className="p-2 border border-border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          aria-label="Previous page"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-1">
                          {/* Desktop pagination logic here */}
                          {[...Array(Math.min(totalPages, 7))].map((_, i) => {
                            let pageNum;

                            if (totalPages <= 7) {
                              pageNum = i + 1;
                            } else if (currentPage <= 4) {
                              pageNum = i + 1;
                            } else if (currentPage >= totalPages - 3) {
                              pageNum = totalPages - 6 + i;
                            } else {
                              pageNum = currentPage - 3 + i;
                            }

                            return (
                              <button
                                key={i}
                                onClick={() => setCurrentPage(pageNum)}
                                className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                                  currentPage === pageNum
                                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                                    : "hover:bg-muted text-muted-foreground"
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}

                          {totalPages > 7 && currentPage < totalPages - 3 && (
                            <>
                              <span className="px-1 text-muted-foreground">
                                ...
                              </span>
                              <button
                                onClick={() => setCurrentPage(totalPages)}
                                className="w-10 h-10 rounded-lg text-sm font-medium hover:bg-muted text-muted-foreground transition-colors"
                              >
                                {totalPages}
                              </button>
                            </>
                          )}
                        </div>

                        <button
                          onClick={() =>
                            setCurrentPage((p) => Math.min(totalPages, p + 1))
                          }
                          disabled={currentPage === totalPages}
                          className="p-2 border border-border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          aria-label="Next page"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-card rounded-lg border border-border p-12 text-center">
                <p className="text-muted-foreground text-lg">
                  {searchTerm
                    ? "No patients found matching your search"
                    : "No patients found"}
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
