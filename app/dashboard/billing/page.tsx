//@ts-nocheck
"use client";

import type React from "react";
import { ProtectedRoute } from "@/components/protected-route";
import { Sidebar } from "@/components/sidebar";
import { useAuth } from "@/components/auth-context";
import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import {
  Plus,
  Edit2,
  Trash2,
  DollarSign,
  Clock,
  FileText,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
  Menu,
} from "lucide-react";
import { ConfirmDeleteModal } from "@/components/confirm-delete-modal";
import { SearchableDropdown } from "@/components/searchable-dropdown";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function BillingPage() {
  const { user, token } = useAuth();
  const [billing, setBilling] = useState([]);
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
  const [loading, setLoading] = useState({
    billing: false,
    patients: false,
    submit: false,
    delete: false,
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");

  // Check for mobile viewport
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
      fetchBilling();
      fetchPatients();
    }
  }, [token]);

  const fetchBilling = async () => {
    setLoading((prev) => ({ ...prev, billing: true }));
    try {
      const res = await fetch("/api/billing", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const billingData = data.billing || [];
        setBilling(billingData);

        const totalRevenue = billingData.reduce(
          (sum: number, b: any) => sum + (b.totalAmount || 0),
          0
        );
        const pendingAmount = billingData
          .filter((b: any) => b.paymentStatus !== "Paid")
          .reduce(
            (sum: number, b: any) =>
              sum + ((b.totalAmount || 0) - (b.paidAmount || 0)),
            0
          );

        setStats({
          totalRevenue,
          pendingAmount,
          totalInvoices: billingData.length,
        });
      }
    } catch (error) {
      console.error("Failed to fetch billing:", error);
      toast.error("Failed to load billing records");
    } finally {
      setLoading((prev) => ({ ...prev, billing: false }));
    }
  };

  const fetchPatients = async () => {
    setLoading((prev) => ({ ...prev, patients: true }));
    try {
      const res = await fetch("/api/patients", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPatients(data.patients || []);
      }
    } catch (error) {
      console.error("Failed to fetch patients:", error);
      toast.error("Failed to load patients");
    } finally {
      setLoading((prev) => ({ ...prev, patients: false }));
    }
  };

  const handleDeleteBilling = async (billingId: string) => {
    setLoading((prev) => ({ ...prev, delete: true }));
    try {
      const res = await fetch(`/api/billing/${billingId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setBilling(billing.filter((b) => b._id !== billingId));
        toast.success("Billing record deleted successfully");
        fetchBilling();
      } else {
        toast.error("Failed to delete billing record");
      }
    } catch (error) {
      console.error("Failed to delete billing:", error);
      toast.error("Error deleting billing record");
    } finally {
      setLoading((prev) => ({ ...prev, delete: false }));
    }
  };

  const handleEditBilling = (bill: any) => {
    setEditingId(bill._id);
    setFormData({
      patientId: bill.patientId,
      treatments: bill.treatments?.map((t: any) => t.name).join(", ") || "",
      totalAmount: bill.totalAmount.toString(),
      paidAmount: bill.paidAmount.toString(),
      paymentStatus: bill.paymentStatus,
      notes: bill.notes || "",
    });
    setShowForm(true);
  };

  const handleAddBilling = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading((prev) => ({ ...prev, submit: true }));

    try {
      const method = editingId ? "PUT" : "POST";
      const url = editingId ? `/api/billing/${editingId}` : "/api/billing";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          totalAmount: Number.parseFloat(formData.totalAmount),
          paidAmount: Number.parseFloat(formData.paidAmount) || 0,
          treatments: formData.treatments
            .split(",")
            .map((t) => ({ name: t.trim(), cost: 0, quantity: 1 })),
        }),
      });

      if (res.ok) {
        if (editingId) {
          toast.success("Billing record updated successfully");
          setEditingId(null);
        } else {
          toast.success("Billing record added successfully");
        }
        setShowForm(false);
        setFormData({
          patientId: "",
          treatments: "",
          totalAmount: "",
          paidAmount: "",
          paymentStatus: "Pending",
          notes: "",
        });
        fetchBilling();
      } else {
        toast.error("Failed to save billing record");
      }
    } catch (error) {
      console.error("Failed to add billing:", error);
      toast.error("Error saving billing record");
    } finally {
      setLoading((prev) => ({ ...prev, submit: false }));
    }
  };

  // Filter billing records based on search term
  const filteredBilling = billing.filter((bill) => {
    if (!searchTerm) return true;

    const patientName =
      patients.find((p) => p._id === bill.patientId)?.name || "Unknown";
    return patientName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Calculate pagination
  const totalPages = Math.ceil(filteredBilling.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentBilling = filteredBilling.slice(startIndex, endIndex);

  // Reset to first page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, itemsPerPage]);

  const openSplitModal = (bill: any) => {
    setSelectedBillingForSplit(bill);
    setSplits(bill.paymentSplits || []);
    setShowSplitModal(true);
  };

  const addSplit = () => {
    setSplits([
      ...splits,
      {
        paymentType: "",
        amount: "",
        _id: Date.now().toString(),
      },
    ]);
  };

  const updateSplit = (index: number, field: string, value: any) => {
    const newSplits = [...splits];
    newSplits[index] = { ...newSplits[index], [field]: value };
    setSplits(newSplits);
  };

  const removeSplit = (index: number) => {
    setSplits(splits.filter((_, i) => i !== index));
  };

  const saveSplits = async () => {
    if (!selectedBillingForSplit) return;

    setSplitLoading(true);
    try {
      const totalSplit = splits.reduce(
        (sum, s) => sum + (Number(s.amount) || 0),
        0
      );
      if (totalSplit !== Number(selectedBillingForSplit.totalAmount)) {
        toast.error(
          `Total split amount ($${totalSplit.toFixed(
            2
          )}) must equal bill amount ($${selectedBillingForSplit.totalAmount.toFixed(
            2
          )})`
        );
        setSplitLoading(false);
        return;
      }

      const res = await fetch(
        `/api/billing/${selectedBillingForSplit._id}/splits`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ splits }),
        }
      );

      if (res.ok) {
        toast.success("Payment splits saved successfully");
        setShowSplitModal(false);
        fetchBilling();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save payment splits");
      }
    } catch (error) {
      console.error("Failed to save splits:", error);
      toast.error("Error saving payment splits");
    } finally {
      setSplitLoading(false);
    }
  };

  const openDetailsModal = (bill: any) => {
    setSelectedBillingForDetails(bill);
    setShowDetailsModal(true);
  };

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
              <button
                onClick={() => {
                  setEditingId(null);
                  setShowForm(!showForm);
                  if (!showForm) {
                    setFormData({
                      patientId: "",
                      treatments: "",
                      totalAmount: "",
                      paidAmount: "",
                      paymentStatus: "Pending",
                      notes: "",
                    });
                  }
                }}
                disabled={loading.billing || loading.patients || loading.submit}
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground px-4 py-2 rounded-lg transition-colors text-sm sm:text-base font-medium cursor-pointer disabled:cursor-not-allowed w-full sm:w-auto justify-center"
              >
                {loading.submit ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {showForm ? "Cancel" : "Add Billing"}
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-8">
              <div className="stat-card p-4 sm:p-5">
                <div className="stat-icon bg-gradient-to-br from-accent/20 to-accent/10 w-10 h-10 sm:w-12 sm:h-12">
                  <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
                </div>
                <div>
                  <p className="stat-label text-xs sm:text-sm">Total Revenue</p>
                  <p className="stat-value text-lg sm:text-xl">
                    ${stats.totalRevenue.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="stat-card p-4 sm:p-5">
                <div className="stat-icon bg-gradient-to-br from-destructive/20 to-destructive/10 w-10 h-10 sm:w-12 sm:h-12">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-destructive" />
                </div>
                <div>
                  <p className="stat-label text-xs sm:text-sm">
                    Pending Amount
                  </p>
                  <p className="stat-value text-lg sm:text-xl">
                    ${stats.pendingAmount.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="stat-card p-4 sm:p-5">
                <div className="stat-icon bg-gradient-to-br from-primary/20 to-primary/10 w-10 h-10 sm:w-12 sm:h-12">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                <div>
                  <p className="stat-label text-xs sm:text-sm">
                    Total Invoices
                  </p>
                  <p className="stat-value text-lg sm:text-xl">
                    {stats.totalInvoices}
                  </p>
                </div>
              </div>
            </div>

            {/* Add/Edit Form */}
            {showForm && (
              <div className="bg-card rounded-lg shadow-md border border-border p-4 sm:p-6 mb-6 sm:mb-8">
                <h2 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 text-foreground">
                  {editingId ? "Edit Billing Record" : "Add Billing Record"}
                </h2>
                <form onSubmit={handleAddBilling} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {/* Searchable Dropdown for Patient */}
                    <div className="sm:col-span-2">
                      <SearchableDropdown
                        label="Patient"
                        items={patients.map((p) => ({
                          id: p._id,
                          name: p.name,
                        }))}
                        selectedItem={
                          patients.find((p) => p._id === formData.patientId) ||
                          null
                        }
                        onSelect={(item) =>
                          setFormData({
                            ...formData,
                            patientId: item ? item.id : "",
                          })
                        }
                        placeholder="Select Patient"
                        searchPlaceholder="Search patients..."
                        required
                        disabled={loading.submit}
                      />
                    </div>

                    <input
                      type="number"
                      placeholder="Total Amount"
                      value={formData.totalAmount}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          totalAmount: e.target.value,
                        })
                      }
                      className="px-3 sm:px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm cursor-text disabled:cursor-not-allowed"
                      required
                      disabled={loading.submit}
                    />
                    <input
                      type="number"
                      placeholder="Paid Amount"
                      value={formData.paidAmount}
                      onChange={(e) =>
                        setFormData({ ...formData, paidAmount: e.target.value })
                      }
                      className="px-3 sm:px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm cursor-text disabled:cursor-not-allowed"
                      disabled={loading.submit}
                    />
                    <select
                      value={formData.paymentStatus}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          paymentStatus: e.target.value,
                        })
                      }
                      className="px-3 sm:px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-sm cursor-text disabled:cursor-not-allowed"
                      disabled={loading.submit}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Paid">Paid</option>
                      <option value="Partially Paid">Partially Paid</option>
                    </select>
                    <div className="sm:col-span-2">
                      <textarea
                        placeholder="Treatments (comma-separated)"
                        value={formData.treatments}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            treatments: e.target.value,
                          })
                        }
                        className="w-full px-3 sm:px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm cursor-text disabled:cursor-not-allowed"
                        rows={2}
                        disabled={loading.submit}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <textarea
                        placeholder="Notes"
                        value={formData.notes}
                        onChange={(e) =>
                          setFormData({ ...formData, notes: e.target.value })
                        }
                        className="w-full px-3 sm:px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm cursor-text disabled:cursor-not-allowed"
                        rows={2}
                        disabled={loading.submit}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <button
                      type="submit"
                      disabled={loading.submit}
                      className="flex items-center gap-2 bg-accent hover:bg-accent/90 disabled:bg-accent/50 text-accent-foreground px-4 py-2 rounded-lg transition-colors text-sm font-medium cursor-pointer disabled:cursor-not-allowed flex-1 sm:flex-none justify-center"
                    >
                      {loading.submit && (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      )}
                      {editingId ? "Update Record" : "Add Billing Record"}
                    </button>
                    {editingId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(null);
                          setShowForm(false);
                        }}
                        disabled={loading.submit}
                        className="bg-muted hover:bg-muted/80 disabled:bg-muted/50 text-muted-foreground px-4 py-2 rounded-lg transition-colors text-sm font-medium cursor-pointer disabled:cursor-not-allowed flex-1 sm:flex-none justify-center"
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>
                </form>
              </div>
            )}

            {/* Billing Table */}
            <div className="bg-card rounded-lg shadow-md border border-border overflow-hidden">
              {/* Search and Controls */}
              <div className="p-3 sm:p-4 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search patients..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm"
                  />
                </div>

                <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto justify-between sm:justify-normal">
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="itemsPerPage"
                      className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap hidden sm:block"
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
                    onClick={fetchBilling}
                    disabled={loading.billing}
                    className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-3 sm:px-4 py-2 rounded-lg transition-colors font-medium text-sm disabled:opacity-50 cursor-pointer"
                  >
                    <Loader2
                      className={`w-4 h-4 ${
                        loading.billing ? "animate-spin" : ""
                      }`}
                    />
                    <span className="hidden sm:inline">
                      {loading.billing ? "Loading..." : "Refresh"}
                    </span>
                    <span className="sm:hidden">
                      {loading.billing ? "" : "Refresh"}
                    </span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted border-b border-border">
                    <tr>
                      <th className="text-left px-3 sm:px-4 lg:px-6 py-3 font-semibold text-muted-foreground text-xs sm:text-sm">
                        Patient
                      </th>
                      <th className="text-left px-3 sm:px-4 lg:px-6 py-3 font-semibold text-muted-foreground text-xs sm:text-sm hidden sm:table-cell">
                        Total
                      </th>
                      <th className="text-left px-3 sm:px-4 lg:px-6 py-3 font-semibold text-muted-foreground text-xs sm:text-sm hidden md:table-cell">
                        Paid
                      </th>
                      <th className="text-left px-3 sm:px-4 lg:px-6 py-3 font-semibold text-muted-foreground text-xs sm:text-sm">
                        Status
                      </th>
                      <th className="text-left px-3 sm:px-4 lg:px-6 py-3 font-semibold text-muted-foreground text-xs sm:text-sm hidden lg:table-cell">
                        Date
                      </th>
                      <th className="text-left px-3 sm:px-4 lg:px-6 py-3 font-semibold text-muted-foreground text-xs sm:text-sm">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading.billing ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-3 sm:px-4 lg:px-6 py-8 text-center"
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
                              Loading billing records...
                            </span>
                          </div>
                        </td>
                      </tr>
                    ) : currentBilling.length > 0 ? (
                      currentBilling.map((bill) => (
                        <tr
                          key={bill._id}
                          className="border-b border-border hover:bg-muted/50 transition-colors"
                        >
                          <td className="px-3 sm:px-4 lg:px-6 py-3 font-medium text-foreground text-xs sm:text-sm">
                            <div>
                              <div className="sm:hidden text-xs text-muted-foreground mb-1">
                                Patient
                              </div>
                              {patients.find((p) => p._id === bill.patientId)
                                ?.name || "Unknown"}
                              <div className="sm:hidden text-xs text-muted-foreground mt-1">
                                ${bill.totalAmount.toFixed(2)} •{" "}
                                {bill.paymentStatus}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 sm:px-4 lg:px-6 py-3 text-muted-foreground text-xs sm:text-sm hidden sm:table-cell">
                            <div>
                              <div className="md:hidden text-xs text-muted-foreground mb-1">
                                Total
                              </div>
                              ${bill.totalAmount.toFixed(2)}
                            </div>
                          </td>
                          <td className="px-3 sm:px-4 lg:px-6 py-3 text-muted-foreground text-xs sm:text-sm hidden md:table-cell">
                            <div>
                              <div className="lg:hidden text-xs text-muted-foreground mb-1">
                                Paid
                              </div>
                              ${bill.paidAmount.toFixed(2)}
                            </div>
                          </td>
                          <td className="px-3 sm:px-4 lg:px-6 py-3 text-xs sm:text-sm">
                            <div>
                              <div className="sm:hidden text-xs text-muted-foreground mb-1">
                                Status
                              </div>
                              <span
                                className={`px-2 py-1 rounded text-xs font-semibold ${
                                  bill.paymentStatus === "Paid"
                                    ? "bg-accent/20 text-accent"
                                    : bill.paymentStatus === "Partially Paid"
                                    ? "bg-secondary/20 text-secondary"
                                    : "bg-destructive/20 text-destructive"
                                }`}
                              >
                                {bill.paymentStatus}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 sm:px-4 lg:px-6 py-3 text-muted-foreground text-xs hidden lg:table-cell">
                            <div>
                              <div className="xl:hidden text-xs text-muted-foreground mb-1">
                                Date
                              </div>
                              {new Date(bill.createdAt).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="px-3 sm:px-4 lg:px-6 py-3">
                            <div className="flex gap-1 sm:gap-2 flex-wrap">
                              <button
                                onClick={() => openDetailsModal(bill)}
                                disabled={
                                  loading.submit ||
                                  loading.delete ||
                                  splitLoading
                                }
                                className="text-secondary hover:text-secondary/80 disabled:text-secondary/50 transition-colors cursor-pointer disabled:cursor-not-allowed p-1 sm:p-0"
                                title="View Details"
                              >
                                <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                              </button>
                              <button
                                onClick={() => handleEditBilling(bill)}
                                disabled={
                                  loading.submit ||
                                  loading.delete ||
                                  splitLoading
                                }
                                className="text-primary hover:text-primary/80 disabled:text-primary/50 transition-colors cursor-pointer disabled:cursor-not-allowed p-1 sm:p-0"
                                title="Edit"
                              >
                                <Edit2 className="w-3 h-3 sm:w-4 sm:h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setBillingToDelete(bill);
                                  setShowDeleteModal(true);
                                }}
                                disabled={
                                  loading.submit ||
                                  loading.delete ||
                                  splitLoading
                                }
                                className="text-destructive hover:text-destructive/80 disabled:text-destructive/50 transition-colors cursor-pointer disabled:cursor-not-allowed p-1 sm:p-0"
                                title="Delete"
                              >
                                <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                              </button>
                              <button
                                onClick={() => openSplitModal(bill)}
                                disabled={
                                  loading.submit ||
                                  loading.delete ||
                                  splitLoading
                                }
                                className="text-accent hover:text-accent/80 disabled:text-accent/50 transition-colors cursor-pointer disabled:cursor-not-allowed p-1 sm:p-0"
                                title="Add Payment Splits"
                              >
                                <DollarSign className="w-3 h-3 sm:w-4 sm:h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-3 sm:px-4 lg:px-6 py-8 text-center text-muted-foreground text-sm"
                        >
                          {searchTerm
                            ? "No billing records found matching your search"
                            : "No billing records found"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {filteredBilling.length > 0 && (
                <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
                  <div className="text-xs sm:text-sm text-muted-foreground">
                    Showing{" "}
                    <span className="font-medium">
                      {filteredBilling.length === 0 ? 0 : startIndex + 1}
                    </span>{" "}
                    to{" "}
                    <span className="font-medium">
                      {Math.min(endIndex, filteredBilling.length)}
                    </span>{" "}
                    of{" "}
                    <span className="font-medium">
                      {filteredBilling.length}
                    </span>{" "}
                    results
                  </div>

                  <div className="flex items-center gap-1 sm:gap-2">
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={currentPage === 1}
                      className="p-1 sm:p-2 rounded border border-border bg-background hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(
                          (page) =>
                            page === 1 ||
                            page === totalPages ||
                            Math.abs(page - currentPage) <= 1
                        )
                        .map((page, index, array) => {
                          const showEllipsis =
                            index < array.length - 1 &&
                            array[index + 1] - page > 1;
                          return (
                            <div key={page} className="flex items-center">
                              <button
                                onClick={() => setCurrentPage(page)}
                                className={`min-w-[1.5rem] sm:min-w-[2rem] h-6 sm:h-8 px-1 sm:px-2 rounded text-xs sm:text-sm font-medium transition-colors ${
                                  currentPage === page
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-background text-foreground hover:bg-muted border border-border"
                                }`}
                              >
                                {page}
                              </button>
                              {showEllipsis && (
                                <span className="px-1 text-muted-foreground text-xs">
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
                      className="p-1 sm:p-2 rounded border border-border bg-background hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Bill Split Modal */}
            {/* Bill Split Modal */}
            <Dialog open={showSplitModal} onOpenChange={setShowSplitModal}>
              <DialogContent className="max-w-2xl w-[95vw] sm:w-full mx-auto p-4 sm:p-6 max-h-[90vh] overflow-y-auto flex flex-col">
                <DialogHeader className="mb-4 flex-shrink-0">
                  <DialogTitle className="text-lg sm:text-xl">
                    Add Payment Splits
                  </DialogTitle>
                  <DialogDescription className="text-sm sm:text-base">
                    Split the bill amount into multiple payment methods. Total
                    split must equal the bill amount.
                  </DialogDescription>
                </DialogHeader>

                {selectedBillingForSplit && (
                  <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
                    {/* Amount Summary */}
                    <div className="bg-muted p-3 sm:p-4 rounded-lg flex-shrink-0">
                      <div className="flex justify-between items-center">
                        <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                          Total Bill Amount:
                        </span>
                        <span className="text-base sm:text-lg font-bold text-foreground">
                          ${selectedBillingForSplit.totalAmount.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                          Total Split Amount:
                        </span>
                        <span
                          className={`text-base sm:text-lg font-bold ${
                            splits.reduce(
                              (sum, s) => sum + (Number(s.amount) || 0),
                              0
                            ) === Number(selectedBillingForSplit.totalAmount)
                              ? "text-green-600 dark:text-green-400"
                              : "text-destructive"
                          }`}
                        >
                          $
                          {splits
                            .reduce(
                              (sum, s) => sum + (Number(s.amount) || 0),
                              0
                            )
                            .toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Splits List */}
                    <div className="flex-1 overflow-hidden">
                      <div className="space-y-3 max-h-[40vh] sm:max-h-[50vh] overflow-y-auto pr-2">
                        {splits.length === 0 ? (
                          <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
                            <DollarSign className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                            <p className="text-muted-foreground text-sm">
                              No payment splits added yet
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Click "Add Split" below to get started
                            </p>
                          </div>
                        ) : (
                          splits.map((split, index) => (
                            <div
                              key={split._id}
                              className="bg-background rounded-lg border border-border p-3"
                            >
                              <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
                                {/* Payment Type - Full width on mobile, flex on desktop */}
                                <div className="flex-1 mb-2 sm:mb-0">
                                  <label className="text-xs text-muted-foreground font-medium mb-1 block">
                                    Payment Type
                                  </label>
                                  <select
                                    value={split.paymentType}
                                    onChange={(e) =>
                                      updateSplit(
                                        index,
                                        "paymentType",
                                        e.target.value
                                      )
                                    }
                                    className="w-full px-3 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-sm cursor-pointer"
                                    required
                                  >
                                    <option value="">
                                      Select Payment Type
                                    </option>
                                    <option value="Cash">Cash</option>
                                    <option value="Credit Card">
                                      Credit Card
                                    </option>
                                    <option value="Debit Card">
                                      Debit Card
                                    </option>
                                    <option value="Insurance">Insurance</option>
                                    <option value="Check">Check</option>
                                    <option value="Bank Transfer">
                                      Bank Transfer
                                    </option>
                                    <option value="Other">Other</option>
                                  </select>
                                </div>

                                {/* Amount Input - Full width on mobile, flex on desktop */}
                                <div className="flex-1 mb-2 sm:mb-0">
                                  <label className="text-xs text-muted-foreground font-medium mb-1 block">
                                    Amount
                                  </label>
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">
                                      $
                                    </span>
                                    <input
                                      type="number"
                                      value={split.amount}
                                      onChange={(e) =>
                                        updateSplit(
                                          index,
                                          "amount",
                                          e.target.value
                                        )
                                      }
                                      placeholder="0.00"
                                      step="0.01"
                                      min="0"
                                      className="w-full pl-8 pr-3 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm cursor-text"
                                      required
                                    />
                                  </div>
                                </div>

                                {/* Remove Button */}
                                <div className="flex sm:flex-col justify-between sm:justify-start items-center sm:items-end gap-2 sm:gap-1">
                                  <label className="text-xs text-muted-foreground font-medium block sm:hidden">
                                    Actions
                                  </label>
                                  <button
                                    onClick={() => removeSplit(index)}
                                    className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer flex-shrink-0"
                                    title="Remove split"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3 flex-shrink-0">
                      {/* Add Split Button */}
                      <button
                        onClick={addSplit}
                        disabled={splitLoading}
                        className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-primary/50 hover:border-primary text-primary hover:bg-primary/5 px-4 py-3 rounded-lg transition-all text-sm font-medium cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Plus className="w-4 h-4" />
                        Add Split
                      </button>

                      {/* Save and Cancel Buttons */}
                      <div className="flex flex-col xs:flex-row gap-2">
                        <button
                          onClick={saveSplits}
                          disabled={splitLoading || splits.length === 0}
                          className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-3 rounded-lg transition-colors font-medium text-sm cursor-pointer disabled:cursor-not-allowed order-2 xs:order-1"
                        >
                          {splitLoading && (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          )}
                          Save Splits
                        </button>
                        <button
                          onClick={() => setShowSplitModal(false)}
                          disabled={splitLoading}
                          className="flex-1 bg-muted hover:bg-muted/80 text-muted-foreground px-4 py-3 rounded-lg transition-colors font-medium text-sm cursor-pointer disabled:cursor-not-allowed order-1 xs:order-2"
                        >
                          Cancel
                        </button>
                      </div>

                      {/* Validation Message */}
                      {splits.length > 0 && (
                        <div
                          className={`text-center text-xs font-medium ${
                            splits.reduce(
                              (sum, s) => sum + (Number(s.amount) || 0),
                              0
                            ) === Number(selectedBillingForSplit.totalAmount)
                              ? "text-green-600 dark:text-green-400"
                              : "text-destructive"
                          }`}
                        >
                          {splits.reduce(
                            (sum, s) => sum + (Number(s.amount) || 0),
                            0
                          ) === Number(selectedBillingForSplit.totalAmount)
                            ? "✓ Split amounts match total bill"
                            : `⚠ Split amounts don't match - $${Math.abs(
                                splits.reduce(
                                  (sum, s) => sum + (Number(s.amount) || 0),
                                  0
                                ) - Number(selectedBillingForSplit.totalAmount)
                              ).toFixed(2)} difference`}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* Details Modal */}
            <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
              <DialogContent className="max-w-3xl w-[95vw] sm:w-full mx-auto p-4 sm:p-6 max-h-[85vh] flex flex-col overflow-auto">
                <DialogHeader className="mb-4">
                  <DialogTitle className="text-lg sm:text-xl">
                    Billing Details
                  </DialogTitle>
                  <DialogDescription className="text-sm sm:text-base">
                    Complete billing information including payments and charges
                  </DialogDescription>
                </DialogHeader>

                {selectedBillingForDetails && (
                  <div className="space-y-4 sm:space-y-6 flex-1 overflow-y-auto pr-2">
                    {/* Patient and Bill Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                      <div className="bg-muted p-3 sm:p-4 rounded-lg">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">
                          Patient Name
                        </p>
                        <p className="text-base sm:text-lg font-bold text-foreground">
                          {patients.find(
                            (p) => p._id === selectedBillingForDetails.patientId
                          )?.name || "Unknown"}
                        </p>
                      </div>

                      <div className="bg-muted p-3 sm:p-4 rounded-lg">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">
                          Bill Date
                        </p>
                        <p className="text-base sm:text-lg font-bold text-foreground">
                          {new Date(
                            selectedBillingForDetails.createdAt
                          ).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Amount Information */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                      <div className="bg-accent/10 border border-accent/20 p-3 sm:p-4 rounded-lg">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-2">
                          Total Amount
                        </p>
                        <p className="text-xl sm:text-2xl font-bold text-accent">
                          ${selectedBillingForDetails.totalAmount.toFixed(2)}
                        </p>
                      </div>

                      <div className="bg-secondary/10 border border-secondary/20 p-3 sm:p-4 rounded-lg">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-2">
                          Total Paid
                        </p>
                        <p className="text-xl sm:text-2xl font-bold text-secondary">
                          ${selectedBillingForDetails.paidAmount.toFixed(2)}
                        </p>
                      </div>

                      <div
                        className={`${
                          selectedBillingForDetails.totalAmount -
                            selectedBillingForDetails.paidAmount >
                          0
                            ? "bg-destructive/10 border border-destructive/20"
                            : "bg-accent/10 border border-accent/20"
                        } p-3 sm:p-4 rounded-lg`}
                      >
                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-2">
                          Remaining
                        </p>
                        <p
                          className={`text-xl sm:text-2xl font-bold ${
                            selectedBillingForDetails.totalAmount -
                              selectedBillingForDetails.paidAmount >
                            0
                              ? "text-destructive"
                              : "text-accent"
                          }`}
                        >
                          $
                          {(
                            selectedBillingForDetails.totalAmount -
                            selectedBillingForDetails.paidAmount
                          ).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Payment Status */}
                    <div className="bg-muted p-3 sm:p-4 rounded-lg">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-2">
                        Payment Status
                      </p>
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs sm:text-sm font-semibold ${
                          selectedBillingForDetails.paymentStatus === "Paid"
                            ? "bg-accent/20 text-accent"
                            : selectedBillingForDetails.paymentStatus ===
                              "Partially Paid"
                            ? "bg-secondary/20 text-secondary"
                            : "bg-destructive/20 text-destructive"
                        }`}
                      >
                        {selectedBillingForDetails.paymentStatus}
                      </span>
                    </div>

                    {/* Treatments */}
                    {selectedBillingForDetails.treatments &&
                      selectedBillingForDetails.treatments.length > 0 && (
                        <div className="bg-muted p-3 sm:p-4 rounded-lg">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-3">
                            Treatments
                          </p>
                          <ul className="space-y-2">
                            {selectedBillingForDetails.treatments.map(
                              (treatment: any, index: number) => (
                                <li
                                  key={index}
                                  className="flex items-center gap-2 text-foreground text-sm"
                                >
                                  <span className="inline-block w-2 h-2 bg-primary rounded-full flex-shrink-0"></span>
                                  <span className="break-words">
                                    {treatment.name || "Treatment"}{" "}
                                    {treatment.cost > 0 &&
                                      `- $${treatment.cost.toFixed(2)}`}
                                  </span>
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      )}

                    {/* Payment Splits */}
                    {selectedBillingForDetails.paymentSplits &&
                      selectedBillingForDetails.paymentSplits.length > 0 && (
                        <div className="bg-muted p-3 sm:p-4 rounded-lg">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-3">
                            Payment Splits
                          </p>
                          <div className="space-y-2">
                            {selectedBillingForDetails.paymentSplits.map(
                              (split: any, index: number) => (
                                <div
                                  key={split._id || index}
                                  className="flex justify-between items-center bg-background p-3 rounded text-sm"
                                >
                                  <span className="font-medium text-foreground break-words">
                                    {split.paymentType}
                                  </span>
                                  <span className="text-accent font-bold flex-shrink-0 ml-2">
                                    ${Number(split.amount).toFixed(2)}
                                  </span>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}

                    {/* Extra Charges */}
                    {selectedBillingForDetails.extraChargesRequested &&
                      selectedBillingForDetails.extraChargesRequested.length >
                        0 && (
                        <div className="bg-muted p-3 sm:p-4 rounded-lg">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-3">
                            Extra Charges Requests
                          </p>
                          <div className="space-y-3">
                            {selectedBillingForDetails.extraChargesRequested.map(
                              (charge: any, index: number) => (
                                <div
                                  key={index}
                                  className="bg-background p-3 rounded border border-border"
                                >
                                  <div className="flex justify-between items-start mb-2 flex-col sm:flex-row gap-2 sm:gap-0">
                                    <div className="flex-1">
                                      <p className="font-medium text-foreground">
                                        ${Number(charge.amount).toFixed(2)}
                                      </p>
                                      <p className="text-sm text-muted-foreground break-words">
                                        {charge.reason}
                                      </p>
                                    </div>
                                    <span
                                      className={`px-2 py-1 rounded text-xs font-semibold flex-shrink-0 ${
                                        charge.status === "approved"
                                          ? "bg-accent/20 text-accent"
                                          : charge.status === "rejected"
                                          ? "bg-destructive/20 text-destructive"
                                          : "bg-secondary/20 text-secondary"
                                      }`}
                                    >
                                      {charge.status}
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    Requested:{" "}
                                    {new Date(
                                      charge.requestedAt
                                    ).toLocaleDateString()}
                                  </p>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}

                    {/* Notes */}
                    {selectedBillingForDetails.notes && (
                      <div className="bg-muted p-3 sm:p-4 rounded-lg">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-2">
                          Notes
                        </p>
                        <p className="text-foreground text-sm break-words">
                          {selectedBillingForDetails.notes}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* Delete Modal */}
            <ConfirmDeleteModal
              isOpen={showDeleteModal}
              title="Delete Billing Record"
              description="Are you sure you want to delete this billing record? This action cannot be undone."
              itemName={
                billingToDelete
                  ? `${
                      patients.find((p) => p._id === billingToDelete.patientId)
                        ?.name || "Unknown"
                    } - $${billingToDelete.totalAmount.toFixed(2)}`
                  : undefined
              }
              onConfirm={() => {
                handleDeleteBilling(billingToDelete._id);
                setShowDeleteModal(false);
                setBillingToDelete(null);
              }}
              onCancel={() => {
                setShowDeleteModal(false);
                setBillingToDelete(null);
              }}
              isLoading={loading.delete}
            />
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
