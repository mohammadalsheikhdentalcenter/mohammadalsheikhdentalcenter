//@ts-nocheck
"use client"

import type React from "react"
import { useState, useEffect } from "react"
import toast from "react-hot-toast"
import { ProtectedRoute } from "@/components/protected-route"
import { Sidebar } from "@/components/sidebar"
import { useAuth } from "@/components/auth-context"
import { ConfirmDeleteModal } from "@/components/confirm-delete-modal"
import { Search, ChevronLeft, ChevronRight, Plus, Edit, Trash2, Loader2 } from "lucide-react"

export default function InventoryPage() {
  const { token } = useAuth()
  const [inventory, setInventory] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    quantity: "",
    minStock: "",
    unit: "",
    supplier: "",
  })
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  // Search and pagination state
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Add loading state for table
  const [tableLoading, setTableLoading] = useState(false)

  // Fetch inventory on load or token change
  useEffect(() => {
    if (token) fetchInventory()
  }, [token])

  const fetchInventory = async () => {
    setTableLoading(true)
    try {
      const res = await fetch("/api/inventory", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setInventory(data.inventory || [])
      } else {
        const errorData = await res.json()
        toast.error(errorData.error || "Failed to load inventory")
      }
    } catch (error) {
      console.error("Failed to fetch inventory:", error)
      toast.error("Failed to load inventory")
    } finally {
      setTableLoading(false)
    }
  }

  const handleDeleteItem = async (_id: string) => {
    try {
      const res = await fetch(`/api/inventory/${_id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        setInventory(inventory.filter((i) => i._id !== _id))
        toast.success("Item deleted successfully")
      } else {
        const errorData = await res.json()
        toast.error(errorData.error || "Failed to delete item")
      }
    } catch (error) {
      console.error("Delete error:", error)
      toast.error("Error deleting item")
    }
  }

  const handleEditItem = (item: any) => {
    setEditingId(item._id)
    setFormData({
      name: item.name,
      quantity: item.quantity.toString(),
      minStock: item.minStock.toString(),
      unit: item.unit,
      supplier: item.supplier,
    })
    setShowForm(true)
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const method = editingId ? "PUT" : "POST"
      const url = editingId ? `/api/inventory/${editingId}` : "/api/inventory"

      const payload = {
        ...formData,
        quantity: Number.parseInt(formData.quantity),
        minStock: Number.parseInt(formData.minStock),
      }

      console.log("Sending payload:", payload) // Debug log

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to save item")
      }

      if (editingId) {
        setInventory(inventory.map((i) => (i._id === editingId ? data.item : i)))
        toast.success("Item updated successfully")
        setEditingId(null)
      } else {
        setInventory([...inventory, data.item])
        toast.success("Item added successfully")
      }

      setShowForm(false)
      setFormData({ name: "", quantity: "", minStock: "", unit: "", supplier: "" })
    } catch (error) {
      console.error("Save error:", error)
      toast.error(error.message || "Error saving item")
    } finally {
      setLoading(false)
    }
  }

  // Filter inventory based on search term
  const filteredInventory = inventory.filter((item) => {
    if (!searchTerm) return true

    const searchLower = searchTerm.toLowerCase()
    return (
      item.name?.toLowerCase().includes(searchLower) ||
      item.unit?.toLowerCase().includes(searchLower) ||
      item.supplier?.toLowerCase().includes(searchLower)
    )
  })

  // Calculate pagination
  const totalPages = Math.ceil(filteredInventory.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentItems = filteredInventory.slice(startIndex, endIndex)

  // Reset to first page when search term or items per page changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, itemsPerPage])

  const lowStockItems = inventory.filter((item) => item.quantity < item.minStock)

  return (
    <ProtectedRoute allowedRoles={["admin", "hr"]}>
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 overflow-auto md:pt-0 pt-16">
          <div className="p-4 sm:p-6 lg:p-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Inventory Management</h1>
                <p className="text-gray-600 text-sm mt-1">Manage your medical supplies and equipment</p>
              </div>
              <button
                onClick={() => {
                  setEditingId(null)
                  setShowForm(!showForm)
                  if (!showForm) setFormData({ name: "", quantity: "", minStock: "", unit: "", supplier: "" })
                }}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm sm:text-base font-medium cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                {showForm ? "Cancel" : "Add Item"}
              </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-8">
              <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                <p className="text-gray-600 text-sm">Total Items</p>
                <p className="text-2xl sm:text-3xl font-bold text-blue-600">{inventory.length}</p>
              </div>

              <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                <p className="text-gray-600 text-sm">Low Stock Items</p>
                <p className="text-2xl sm:text-3xl font-bold text-red-600">{lowStockItems.length}</p>
              </div>
            </div>

            {/* Add/Edit Form */}
            {showForm && (
              <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-8">
                <h2 className="text-lg sm:text-xl font-bold mb-4 text-gray-900">
                  {editingId ? "Edit Inventory Item" : "Add Inventory Item"}
                </h2>
                <form onSubmit={handleFormSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Item Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                  <input
                    type="number"
                    placeholder="Quantity"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                    min="0"
                  />
                  <input
                    type="number"
                    placeholder="Minimum Stock"
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                    min="0"
                  />
                  <input
                    type="text"
                    placeholder="Unit (e.g., boxes, units)"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Supplier"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:col-span-2"
                  />
                  <div className="flex gap-2 col-span-1 sm:col-span-2 flex-wrap">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:bg-green-400 text-sm font-medium cursor-pointer"
                    >
                      {loading ? "Saving..." : editingId ? "Update Item" : "Add Item"}
                    </button>
                    {editingId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(null)
                          setShowForm(false)
                        }}
                        className="flex items-center gap-2 bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500 transition-colors text-sm font-medium cursor-pointer"
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>
                </form>
              </div>
            )}

            {/* Search and Controls */}
            <div className="bg-white rounded-lg shadow p-4 mb-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search items..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>

                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <div className="flex items-center gap-2">
                    <label htmlFor="itemsPerPage" className="text-sm text-gray-600 whitespace-nowrap">
                      Rows per page:
                    </label>
                    <select
                      id="itemsPerPage"
                      value={itemsPerPage}
                      onChange={(e) => setItemsPerPage(Number(e.target.value))}
                      className="px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 text-sm"
                    >
                      <option value="5">5</option>
                      <option value="10">10</option>
                      <option value="20">20</option>
                      <option value="50">50</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Inventory Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="text-left px-4 sm:px-6 py-3 font-semibold text-gray-700">Item Name</th>
                      <th className="text-left px-4 sm:px-6 py-3 font-semibold text-gray-700 hidden sm:table-cell">
                        Quantity
                      </th>
                      <th className="text-left px-4 sm:px-6 py-3 font-semibold text-gray-700 hidden md:table-cell">
                        Min Stock
                      </th>
                      <th className="text-left px-4 sm:px-6 py-3 font-semibold text-gray-700 hidden lg:table-cell">
                        Unit
                      </th>
                      <th className="text-left px-4 sm:px-6 py-3 font-semibold text-gray-700 hidden lg:table-cell">
                        Supplier
                      </th>
                      <th className="text-left px-4 sm:px-6 py-3 font-semibold text-gray-700">Status</th>
                      <th className="text-left px-4 sm:px-6 py-3 font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableLoading ? (
                      <tr>
                        <td colSpan={7} className="px-4 sm:px-6 py-8 text-center">
                          <div className="flex flex-col items-center justify-center gap-3">
                            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                            <span className="text-gray-600 text-sm">Loading inventory items...</span>
                          </div>
                        </td>
                      </tr>
                    ) : currentItems.length > 0 ? (
                      currentItems.map((item) => (
                        <tr key={item._id} className="border-b hover:bg-gray-50 transition-colors">
                          <td className="px-4 sm:px-6 py-3 font-medium text-gray-900">
                            <div>
                              <div className="sm:hidden text-xs text-gray-500 mb-1">Item</div>
                              {item.name}
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-3 text-gray-700 hidden sm:table-cell">
                            <div>
                              <div className="md:hidden text-xs text-gray-500 mb-1">Quantity</div>
                              {item.quantity}
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-3 text-gray-700 hidden md:table-cell">
                            <div>
                              <div className="lg:hidden text-xs text-gray-500 mb-1">Min Stock</div>
                              {item.minStock}
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-3 text-gray-700 hidden lg:table-cell">{item.unit || "-"}</td>
                          <td className="px-4 sm:px-6 py-3 text-gray-700 hidden lg:table-cell">
                            {item.supplier || "-"}
                          </td>
                          <td className="px-4 sm:px-6 py-3">
                            <div>
                              <div className="sm:hidden text-xs text-gray-500 mb-1">Status</div>
                              {item.quantity < item.minStock ? (
                                <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">
                                  Low Stock
                                </span>
                              ) : (
                                <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                                  In Stock
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-3">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditItem(item)}
                                className="text-blue-600 hover:text-blue-800 transition-colors"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setItemToDelete(item)
                                  setShowDeleteModal(true)
                                }}
                                className="text-red-600 hover:text-red-800 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-4 sm:px-6 py-8 text-center text-gray-500">
                          {searchTerm ? "No inventory items found matching your search" : "No inventory items found"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {filteredInventory.length > 0 && (
                <div className="px-4 sm:px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-gray-600">
                    Showing <span className="font-medium">{filteredInventory.length === 0 ? 0 : startIndex + 1}</span>{" "}
                    to <span className="font-medium">{Math.min(endIndex, filteredInventory.length)}</span> of{" "}
                    <span className="font-medium">{filteredInventory.length}</span> results
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter((page) => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                        .map((page, index, array) => {
                          const showEllipsis = index < array.length - 1 && array[index + 1] - page > 1
                          return (
                            <div key={page} className="flex items-center">
                              <button
                                onClick={() => setCurrentPage(page)}
                                className={`min-w-[2rem] h-8 px-2 rounded text-sm font-medium transition-colors ${
                                  currentPage === page
                                    ? "bg-blue-600 text-white"
                                    : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                                }`}
                              >
                                {page}
                              </button>
                              {showEllipsis && <span className="px-1 text-gray-400">...</span>}
                            </div>
                          )
                        })}
                    </div>

                    <button
                      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages || totalPages === 0}
                      className="p-2 rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <ConfirmDeleteModal
              isOpen={showDeleteModal}
              title="Delete Inventory Item"
              description="Are you sure you want to delete this inventory item? This action cannot be undone."
              itemName={itemToDelete?.name}
              onConfirm={() => {
                handleDeleteItem(itemToDelete._id)
                setShowDeleteModal(false)
                setItemToDelete(null)
              }}
              onCancel={() => {
                setShowDeleteModal(false)
                setItemToDelete(null)
              }}
            />
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
