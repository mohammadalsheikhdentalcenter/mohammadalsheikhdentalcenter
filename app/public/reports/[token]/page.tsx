"use client";

import { useState, useEffect } from "react";
import {
  Download,
  Loader,
  CheckCircle,
  AlertCircle,
  Printer,
} from "lucide-react";
import { generateReportPDF } from "@/lib/pdf-generator";
import { use } from "react";

interface Report {
  _id: string;
  patientId: {
    name: string;
    email: string;
    phone: string;
    dateOfBirth?: string;
    address?: string;
  };
  doctorId: {
    name: string;
    specialty: string;
    email?: string;
    licenseNumber?: string;
  };
  appointmentId: {
    date: string;
    time: string;
    type: string;
    status: string;
  };
  procedures: Array<{
    name: string;
    description?: string;
    tooth?: string;
    status?: string;
  }>;
  findings: string;
  notes: string;
  nextVisit?: string;
  followUpDetails?: string;
  createdAt: string;
}

export default function PublicReportPage({
  params,
}: {
  params: { token: string };
}) {
  const { token } = use(Promise.resolve(params));
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReport();
  }, [token]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/public/patient-reports/${token}`);

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to fetch report");
      }

      const data = await res.json();
      setReport(data.report);
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setError(message);
      console.error("[PUBLIC] Error fetching report:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (report) {
      generateReportPDF(report);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-3 sm:p-4">
        <div className="  p-6 sm:p-8 max-w-md w-full text-center">
          <div className="flex justify-center mb-4">
            <Loader className="w-8 sm:w-10 h-8 sm:h-10 animate-spin text-teal-600" />
          </div>
          <p className="text-slate-700 font-semibold text-base sm:text-lg">
            Loading your medical report...
          </p>
          <p className="text-slate-500 text-xs sm:text-sm mt-2">
            Please wait while we retrieve your information
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-3 sm:p-4">
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-red-200 p-6 sm:p-8 max-w-md w-full">
          <div className="flex gap-3 mb-4">
            <AlertCircle className="w-5 sm:w-6 h-5 sm:h-6 text-red-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h2 className="font-bold text-slate-900 text-base sm:text-lg">
                Unable to Load Report
              </h2>
              <p className="text-slate-600 text-xs sm:text-sm mt-1">{error}</p>
            </div>
          </div>
          <p className="text-slate-500 text-xs">
            If you believe this is an error, please contact your clinic for
            assistance.
          </p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-3 sm:p-4">
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-slate-200 p-6 sm:p-8 max-w-md w-full text-center">
          <AlertCircle className="w-8 sm:w-10 h-8 sm:h-10 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-700 font-semibold text-base sm:text-lg">
            Report Not Found
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-4 sm:py-8 px-3 sm:px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-4 sm:mb-8">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-between align-bottom  mb-3 sm:mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900">
                Medical Report
              </h1>
              <p className="text-slate-500 text-sm sm:text-base mt-1">
                {report.patientId?.name}
              </p>
              <p className="text-slate-600 text-xs sm:text-sm">
                Generated on{" "}
                {new Date(report.createdAt).toLocaleDateString("en-US", {
                  weekday: "short",
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>

            <div className="">
              <button
                onClick={handleDownloadPDF}
                className="flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg transition-colors font-semibold text-xs sm:text-sm shadow-md hover:shadow-lg active:scale-95 cursor-pointer"
              >
                <Download className="w-4 sm:w-5 h-4 sm:h-5" />
                <span>Download PDF</span>
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 text-white">
            <div className="grid grid-cols-2 gap-4 sm:flex sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xs font-semibold opacity-90 tracking-widest">
                  APPOINTMENT
                </h2>
                <p className="text-lg sm:text-2xl font-bold mt-1">
                  {new Date(report.appointmentId?.date).toLocaleDateString(
                    "en-US",
                    {
                      month: "short",
                      day: "numeric",
                    },
                  )}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs opacity-90">Report ID</p>
                <p className="text-sm sm:text-lg font-mono font-bold">
                  DC-{report._id.slice(-6).toUpperCase()}
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="border-l-4 border-teal-600 pl-3 sm:pl-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 sm:mb-3">
                  Patient Info
                </p>
                <div className="space-y-2 sm:space-y-3">
                  <div>
                    <p className="text-xs text-slate-500">Full Name</p>
                    <p className="text-slate-900 font-semibold text-base sm:text-lg">
                      {report.patientId?.name}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-slate-500">Phone</p>
                      <p className="text-slate-700 text-xs sm:text-sm">
                        {report.patientId?.phone}
                      </p>
                    </div>
                  </div>
                  {report.patientId?.dateOfBirth && (
                    <div>
                      <p className="text-xs text-slate-500">Date of Birth</p>
                      <p className="text-slate-700 text-xs sm:text-sm">
                        {new Date(
                          report.patientId.dateOfBirth,
                        ).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  {report.patientId?.address && (
                    <div>
                      <p className="text-xs text-slate-500">Address</p>
                      <p className="text-slate-700 text-xs sm:text-sm">
                        {report.patientId.address}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-l-4 border-blue-600 pl-3 sm:pl-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 sm:mb-3">
                  Doctor Info
                </p>
                <div className="space-y-2 sm:space-y-3">
                  <div>
                    <p className="text-xs text-slate-500">Doctor</p>
                    <p className="text-slate-900 font-semibold text-base sm:text-lg">
                      {" "}
                      {report.doctorId?.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Specialty</p>
                    <p className="text-slate-700 text-xs sm:text-sm">
                      {report.doctorId?.specialty || "General Dentistry"}
                    </p>
                  </div>
                  {report.doctorId?.email && (
                    <div>
                      <p className="text-xs text-slate-500">Email</p>
                      <p className="text-slate-700 text-xs sm:text-sm break-all">
                        {report.doctorId.email}
                      </p>
                    </div>
                  )}
                  {report.doctorId?.licenseNumber && (
                    <div>
                      <p className="text-xs text-slate-500">License</p>
                      <p className="text-slate-700 text-xs sm:text-sm font-mono">
                        {report.doctorId.licenseNumber}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg sm:rounded-xl p-4 sm:p-5 border border-slate-200">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-3 sm:mb-4">
                Visit Summary
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Time</p>
                  <p className="text-slate-900 font-semibold text-xs sm:text-sm mt-1">
                    {report.appointmentId?.time || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Type</p>
                  <p className="text-slate-900 font-semibold text-xs sm:text-sm mt-1">
                    {report.appointmentId?.type}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Status</p>
                  <p className="text-slate-900 font-semibold text-xs sm:text-sm mt-1 capitalize">
                    {report.appointmentId?.status}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Date</p>
                  <p className="text-slate-900 font-semibold text-xs sm:text-sm mt-1">
                    {new Date(report.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-3 sm:mb-4 flex items-center gap-2">
                <span className="w-1 h-5 sm:h-6 bg-teal-600 rounded"></span>
                Procedures
              </h3>
              <div className="space-y-2 sm:space-y-3">
                {report.procedures && report.procedures.length > 0 ? (
                  report.procedures.map((proc, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-50 border border-slate-200 rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2 min-w-0">
                            <span className="flex-shrink-0 w-6 h-6 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center text-xs font-bold">
                              {idx + 1}
                            </span>
                            <p className="font-semibold text-slate-900 text-sm sm:text-base break-words">
                              {proc.name}
                            </p>
                          </div>
                          {proc.description && (
                            <p className="text-slate-600 text-xs sm:text-sm mt-2 ml-8">
                              {proc.description}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 items-start sm:flex-col sm:items-end flex-shrink-0">
                          {proc.tooth && (
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap">
                              Tooth {proc.tooth}
                            </span>
                          )}
                          {proc.status && (
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 whitespace-nowrap ${
                                proc.status.toLowerCase() === "completed"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              <CheckCircle className="w-3 h-3" />
                              {proc.status}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center text-slate-500 text-sm">
                    No procedures recorded
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-3 sm:mb-4 flex items-center gap-2">
                <span className="w-1 h-5 sm:h-6 bg-blue-600 rounded"></span>
                Clinical Findings
              </h3>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 sm:p-5">
                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap text-xs sm:text-sm">
                  {report.findings || "No findings recorded."}
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-3 sm:mb-4 flex items-center gap-2">
                <span className="w-1 h-5 sm:h-6 bg-purple-600 rounded"></span>
                Doctor's Notes
              </h3>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 sm:p-5">
                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap text-xs sm:text-sm">
                  {report.notes || "No additional notes."}
                </p>
              </div>
            </div>

            {(report.nextVisit || report.followUpDetails) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {report.nextVisit && (
                  <div className="bg-gradient-to-br from-teal-50 to-teal-100 border border-teal-300 rounded-lg p-4 sm:p-5">
                    <p className="text-xs font-bold text-teal-900 uppercase tracking-widest mb-2">
                      Next Appointment
                    </p>
                    <p className="text-teal-900 font-semibold text-sm sm:text-base">
                      {new Date(report.nextVisit).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                )}
                {report.followUpDetails && (
                  <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-300 rounded-lg p-4 sm:p-5">
                    <p className="text-xs font-bold text-amber-900 uppercase tracking-widest mb-2">
                      Follow-up
                    </p>
                    <p className="text-amber-900 text-xs sm:text-sm leading-relaxed">
                      {report.followUpDetails}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="border-t border-slate-200 pt-4 sm:pt-6 mt-4 sm:mt-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs text-slate-500">
                <p>
                  This is a confidential medical document. Please keep it
                  secure.
                </p>
                <p className="mt-2 sm:mt-0">
                  {new Date(report.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
