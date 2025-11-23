//@ts-nocheck
"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { Sidebar } from "@/components/sidebar"
import { useAuth } from "@/components/auth-context"
import { useState, useEffect } from "react"
import toast from "react-hot-toast"
import { ConfirmDeleteModal } from "@/components/confirm-delete-modal"
import { Search, ChevronLeft, ChevronRight, UserPlus, Trash2 } from "lucide-react"

export default function StaffPage() {
  const { user, token } = useAuth()
  const [staff, setStaff] = useState([])
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [staffToDelete, setStaffToDelete] = useState<any>(null)
  const [isLoadingFetch, setIsLoadingFetch] = useState(false)
  const [isLoadingDelete, setIsLoadingDelete] = useState(false)

  // Search and pagination state
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  useEffect(() => {
    if (token) {
      fetchStaff()
    }
  }, [token])

  const fetchStaff = async () => {
    setIsLoadingFetch(true)
    try {
      const res = await fetch("/api/users", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setStaff(data.users || [])
      }
    } catch (error) {
      console.error("Failed to fetch staff:", error)
      toast.error("Failed to load staff members")
    } finally {
      setIsLoadingFetch(false)
    }
  }

  const handleDeleteStaff = async (staffId: string) => {
    setIsLoadingDelete(true)
    try {
      const res = await fetch(`/api/users/${staffId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        setStaff(staff.filter((s) => s.id !== staffId))
        toast.success("Staff member deleted successfully")
      } else {
        toast.error("Failed to delete staff member")
      }
    } catch (error) {
      console.error("Failed to delete staff:", error)
      toast.error("Error deleting staff member")
    } finally {
      setIsLoadingDelete(false)
    }
  }

  // Filter staff based on search term
  const filteredStaff = staff.filter((member) => {
    if (!searchTerm) return true

    const searchLower = searchTerm.toLowerCase()
    return (
      member.name?.toLowerCase().includes(searchLower) ||
      member.email?.toLowerCase().includes(searchLower) ||
      member.role?.toLowerCase().includes(searchLower) ||
      member.specialty?.toLowerCase().includes(searchLower)
    )
  })

  // Calculate pagination
  const totalPages = Math.ceil(filteredStaff.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentStaff = filteredStaff.slice(startIndex, endIndex)

  // Reset to first page when search term or items per page changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, itemsPerPage])

  // Stats calculations
  const totalStaff = staff.length
  const doctorsCount = staff.filter((s) => s.role === "doctor").length
  const receptionistsCount = staff.filter((s) => s.role === "receptionist").length

  return (
    <ProtectedRoute allowedRoles={["admin", "hr"]}>
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 overflow-auto md:pt-0 pt-16">
          <div className="p-4 sm:p-6 lg:p-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Staff Management</h1>
                <p className="text-gray-600 text-sm mt-1">Manage your healthcare team members</p>
              </div>
              <a
                href="/signup"
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm sm:text-base font-medium transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                Register New Staff
              </a>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8">
              <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                <p className="text-gray-600 text-sm">Total Staff</p>
                <p className="text-2xl sm:text-3xl font-bold text-blue-600">{totalStaff}</p>
              </div>

              <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                <p className="text-gray-600 text-sm">Doctors</p>
                <p className="text-2xl sm:text-3xl font-bold text-blue-600">{doctorsCount}</p>
              </div>

              <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                <p className="text-gray-600 text-sm">Receptionists</p>
                <p className="text-2xl sm:text-3xl font-bold text-green-600">{receptionistsCount}</p>
              </div>
            </div>

            {/* Search and Controls */}
            <div className="bg-white rounded-lg shadow p-4 mb-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search staff..."
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

            {/* Staff Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="text-left px-4 sm:px-6 py-3 font-semibold text-gray-700">Name</th>
                      <th className="text-left px-4 sm:px-6 py-3 font-semibold text-gray-700 hidden sm:table-cell">
                        Email
                      </th>
                      <th className="text-left px-4 sm:px-6 py-3 font-semibold text-gray-700">Role</th>
                      <th className="text-left px-4 sm:px-6 py-3 font-semibold text-gray-700 hidden lg:table-cell">
                        Specialty
                      </th>
                      <th className="text-left px-4 sm:px-6 py-3 font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingFetch ? (
                      <tr>
                        <td colSpan={5} className="px-4 sm:px-6 py-8 text-center">
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
                            <span className="text-gray-600 text-sm">Loading staff members...</span>
                          </div>
                        </td>
                      </tr>
                    ) : currentStaff.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 sm:px-6 py-8 text-center text-gray-500">
                          {searchTerm ? "No staff members found matching your search" : "No staff members found"}
                        </td>
                      </tr>
                    ) : (
                      currentStaff.map((member) => (
                        <tr key={member.id} className="border-b hover:bg-gray-50 transition-colors">
                          <td className="px-4 sm:px-6 py-3 font-medium text-gray-900">
                            <div>
                              <div className="sm:hidden text-xs text-gray-500 mb-1">Name</div>
                              {member.name}
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-3 text-gray-700 hidden sm:table-cell">
                            <div>
                              <div className="lg:hidden text-xs text-gray-500 mb-1">Email</div>
                              {member.email}
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-3">
                            <div>
                              <div className="sm:hidden text-xs text-gray-500 mb-1">Role</div>
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs capitalize font-medium">
                                {member.role}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-3 text-gray-700 hidden lg:table-cell">
                            {member.specialty || "-"}
                          </td>
                          <td className="px-4 sm:px-6 py-3">
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setStaffToDelete(member)
                                  setShowDeleteModal(true)
                                }}
                                disabled={isLoadingDelete}
                                className="flex items-center gap-1 text-red-600 hover:text-red-800 disabled:text-red-400 disabled:cursor-not-allowed transition-colors text-sm"
                                title="Delete staff member"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span className="hidden sm:inline">Delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {filteredStaff.length > 0 && (
                <div className="px-4 sm:px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-gray-600">
                    Showing <span className="font-medium">{filteredStaff.length === 0 ? 0 : startIndex + 1}</span> to{" "}
                    <span className="font-medium">{Math.min(endIndex, filteredStaff.length)}</span> of{" "}
                    <span className="font-medium">{filteredStaff.length}</span> results
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
              title="Delete Staff Member"
              description="Are you sure you want to delete this staff member? This action cannot be undone."
              itemName={staffToDelete?.name}
              onConfirm={() => {
                handleDeleteStaff(staffToDelete.id)
                setShowDeleteModal(false)
                setStaffToDelete(null)
              }}
              onCancel={() => {
                setShowDeleteModal(false)
                setStaffToDelete(null)
              }}
            />
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
